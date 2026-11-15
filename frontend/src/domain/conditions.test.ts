import { describe, expect, it } from 'vitest'
import {
  labelFor,
  orderConditions,
  scoreCondition,
  scoreFor,
  signalPoint,
  type Condition,
} from './conditions'
import type {
  AttentionRule,
  ConditionRule,
  Entry,
  Indicator,
  MeasurementContext,
} from './types'

// The rule of docs/findings/bio2-02-evidence-score.md, run on this device. The
// vectors below are the finding's table for orthostatic intolerance; the
// thresholds and baselines are written here so a change in config/ does not
// move them.

const LINK = { title: 'https://example.org/limit', url: 'https://example.org/limit' }

function indicator(id: string, minSpread: number): Indicator {
  return {
    id,
    name: id,
    unit: 'unit',
    direction: 'both',
    measuredOnBoard: 'example',
    hazards: [],
    minSpread,
    sources: ['Assumption'],
  } as Indicator
}

const indicators = [
  indicator('hr_bpm', 4),
  indicator('bp_sys_mmhg', 5),
  indicator('bp_dia_mmhg', 4),
  indicator('temp_core_c', 0.2),
]

function rule(
  indicatorId: string,
  side: 'above' | 'below',
  threshold: number,
  cited = true,
): AttentionRule {
  return {
    indicatorId,
    side,
    threshold,
    attentionLevel: 'consult',
    notify: 'cmo',
    sources: cited ? [LINK] : ['Assumption'],
  }
}

const rules = [
  rule('hr_bpm', 'above', 100),
  rule('hr_bpm', 'below', 50, false),
  rule('bp_dia_mmhg', 'above', 90),
  rule('temp_core_c', 'above', 38),
]

let nextId = 0
function reading(
  indicatorId: string,
  missionDay: number,
  value: number,
  context: MeasurementContext = 'rest',
): Entry {
  nextId += 1
  return {
    id: `e${nextId}`,
    personId: 'cadet',
    indicatorId,
    value,
    unit: 'unit',
    missionDay,
    time: '07:00',
    context,
  }
}

// Five earlier days around `values`, then the reading under test on day 6.
function history(indicatorId: string, values: number[], newest: number): Entry[] {
  return [
    ...values.map((value, index) => reading(indicatorId, index + 1, value)),
    reading(indicatorId, 6, newest),
  ]
}

// Baselines: heart rate 68 (band 12), systolic 118 (band 15), diastolic 75
// (band about 13.3).
const HR = [66, 67, 68, 69, 70]
const SYS = [116, 117, 118, 119, 120]
const DIA = [68, 72, 75, 78, 82]

const orthostatic: ConditionRule = {
  id: 'orthostatic_intolerance',
  name: 'Orthostatic intolerance',
  signals: [
    { indicatorId: 'hr_bpm', side: 'above' },
    { indicatorId: 'bp_sys_mmhg', side: 'below' },
    { indicatorId: 'bp_dia_mmhg', side: 'below' },
  ],
  source: 'https://example.org/ortho',
}

function score(hr: number, sys: number, dia: number): Condition {
  return scoreCondition(
    orthostatic,
    [...history('hr_bpm', HR, hr), ...history('bp_sys_mmhg', SYS, sys), ...history('bp_dia_mmhg', DIA, dia)],
    indicators,
    rules,
  )
}

describe('the vectors of bio2-02 (orthostatic intolerance)', () => {
  it('every signal in the baseline: 0, low', () => {
    const result = score(68, 118, 75)
    expect(result.signals.map((signal) => signal.contribution)).toEqual([0, 0, 0])
    expect(result.score).toBe(0)
    expect(result.label).toBe('low')
  })

  it('heart rate outside the baseline: 0.167, low', () => {
    const result = score(88, 110, 75)
    expect(result.signals.map((signal) => signal.contribution)).toEqual([0.5, 0, 0])
    expect(result.score).toBe(0.167)
    expect(result.label).toBe('low')
  })

  it('heart rate past its limit, systolic outside: 0.5, possible', () => {
    const result = score(112, 95, 62)
    expect(result.signals.map((signal) => signal.contribution)).toEqual([1, 0.5, 0])
    expect(result.score).toBe(0.5)
    expect(result.label).toBe('possible')
  })

  it('heart rate past its limit, both pressures low: 0.667, review', () => {
    const result = score(130, 88, 55)
    expect(result.signals.map((signal) => signal.contribution)).toEqual([1, 0.5, 0.5])
    expect(result.score).toBe(0.667)
    expect(result.label).toBe('review')
  })

  it('a diastolic of 120 is on the wrong side and adds nothing: 0.5, possible', () => {
    const result = score(130, 88, 120)
    expect(result.signals.map((signal) => signal.contribution)).toEqual([1, 0.5, 0])
    expect(result.score).toBe(0.5)
    expect(result.label).toBe('possible')
  })

  it('one signal with a baseline and the others without: no data', () => {
    const result = scoreCondition(
      orthostatic,
      [
        ...history('hr_bpm', HR, 68),
        reading('bp_sys_mmhg', 6, 118),
        reading('bp_dia_mmhg', 6, 75),
      ],
      indicators,
      rules,
    )
    expect(result.signals.map((signal) => signal.contribution)).toEqual([0, null, null])
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })
})

describe('signalPoint', () => {
  const hrRules = rules.filter((item) => item.indicatorId === 'hr_bpm')
  const tempRules = rules.filter((item) => item.indicatorId === 'temp_core_c')

  it('counts a cited limit with no baseline at all', () => {
    expect(
      signalPoint([reading('temp_core_c', 1, 39.5)], 'above', tempRules, 0.2),
    ).toBe(1)
  })

  it('never gives the full point for a limit marked Assumption', () => {
    // 45 bpm is past the assumed lower limit and outside the baseline.
    expect(signalPoint(history('hr_bpm', HR, 45), 'below', hrRules, 4)).toBe(0.5)
    // With no baseline the assumed limit says nothing.
    expect(signalPoint([reading('hr_bpm', 1, 45)], 'below', hrRules, 4)).toBeNull()
  })

  it('is not usable with no reading, no side or no row in indicators.csv', () => {
    expect(signalPoint([], 'above', hrRules, 4)).toBeNull()
    expect(signalPoint(history('hr_bpm', HR, 88), null, hrRules, 4)).toBeNull()
    expect(signalPoint(history('hr_bpm', HR, 88), 'above', hrRules, null)).toBeNull()
  })

  it('compares the newest reading with its own context only', () => {
    // Five readings at rest and one after exercise: the newest one has no
    // baseline of its own, and it did not cross the limit.
    const entries = [
      ...HR.map((value, index) => reading('hr_bpm', index + 1, value)),
      reading('hr_bpm', 6, 95, 'after_exercise'),
    ]
    expect(signalPoint(entries, 'above', hrRules, 4)).toBeNull()
  })

  it('scores the newest reading, not an older one', () => {
    const entries = [...history('hr_bpm', HR, 130), reading('hr_bpm', 7, 68)]
    expect(signalPoint(entries, 'above', hrRules, 4)).toBe(0)
  })
})

describe('scoreFor and labelFor', () => {
  it('needs two usable signals', () => {
    expect(scoreFor([1])).toBeNull()
    expect(scoreFor([1, null, null])).toBeNull()
    expect(scoreFor([1, 0])).toBe(0.5)
    expect(scoreFor([1, 0.5, null])).toBe(0.75)
  })

  it('closes each band at its lower end', () => {
    expect(labelFor(null)).toBe('no_data')
    expect(labelFor(0)).toBe('low')
    expect(labelFor(0.299)).toBe('low')
    expect(labelFor(0.3)).toBe('possible')
    expect(labelFor(0.599)).toBe('possible')
    expect(labelFor(0.6)).toBe('review')
    expect(labelFor(1)).toBe('review')
  })
})

describe('orderConditions', () => {
  const condition = (
    id: string,
    label: Condition['label'],
    value: number | null,
  ): Condition => ({ id, name: id, score: value, label, signals: [], source: 'Assumption' })

  it('puts review first, then possible, then low, and no data last', () => {
    const ordered = orderConditions([
      condition('a_low', 'low', 0.1),
      condition('b_none', 'no_data', null),
      condition('c_review', 'review', 0.7),
      condition('d_possible', 'possible', 0.4),
      condition('e_review', 'review', 0.9),
      condition('f_none', 'no_data', null),
    ])
    expect(ordered.map((item) => item.id)).toEqual([
      'e_review',
      'c_review',
      'd_possible',
      'a_low',
      'b_none',
      'f_none',
    ])
  })
})
