import { describe, expect, it } from 'vitest'
import { scoreCondition, type SymptomLayer } from './conditions'
import type { SymptomDef, SymptomReport } from './symptoms'
import type { AttentionRule, ConditionRule, Entry, Indicator } from './types'

// The test vectors of team/bio2/notes/symptom-test-vectors.md (T-78), the same
// rows and the same config as backend/tests/test_symptom_vectors.py, run on the
// score computed on this device. Both must give the same score and label.

const PERSON = 'demo_astronaut_1'
const LINK = { title: 'https://example.org/limit', url: 'https://example.org/limit' }

const glucose: Indicator = {
  id: 'glucose_mgdl',
  name: 'Blood glucose',
  unit: 'mg/dL',
  direction: 'both',
  measuredOnBoard: 'example',
  hazards: [],
  minSpread: 8,
  sources: ['Assumption'],
} as Indicator
const heartRate = { ...glucose, id: 'hr_bpm', name: 'Heart rate', unit: 'bpm', minSpread: 4 }
const systolic = { ...glucose, id: 'bp_sys_mmhg', name: 'Systolic', unit: 'mmHg', minSpread: 5 }
const indicators = [glucose, heartRate, systolic]

function limit(
  indicatorId: string,
  side: 'above' | 'below',
  threshold: number,
): AttentionRule {
  return {
    indicatorId,
    side,
    threshold,
    attentionLevel: 'consult',
    notify: 'cmo',
    sources: [LINK],
  }
}

const rules = [
  limit('glucose_mgdl', 'below', 70),
  limit('glucose_mgdl', 'above', 126),
  limit('hr_bpm', 'above', 100),
  limit('bp_sys_mmhg', 'above', 140),
]

function def(
  id: string,
  redFlag: boolean,
  shared: boolean,
): SymptomDef {
  return { id, name: id, redFlag, shared, source: 'Assumption' }
}

const defs = [
  def('shaky', false, false),
  def('sweating', false, false),
  def('confusion', true, true),
  def('thirst', false, false),
  def('frequent_urination', false, false),
  def('vomiting', true, false),
  def('fatigue', false, true),
]

const hypo = (symptoms: string[]): ConditionRule => ({
  id: 'hypoglycaemia',
  name: 'Hypoglycaemia',
  signals: [{ indicatorId: 'glucose_mgdl', side: 'below' }],
  symptoms,
  source: 'Assumption',
})
const HYPO = hypo(['shaky', 'sweating', 'fatigue', 'confusion'])
const HYPER: ConditionRule = {
  id: 'hyperglycaemia',
  name: 'Hyperglycaemia',
  signals: [{ indicatorId: 'glucose_mgdl', side: 'above' }],
  symptoms: ['thirst', 'frequent_urination', 'vomiting', 'fatigue'],
  source: 'Assumption',
}

let nextId = 0
function reading(indicatorId: string, missionDay: number, value: number): Entry {
  nextId += 1
  return {
    id: `v${nextId}`,
    personId: PERSON,
    indicatorId,
    value,
    unit: 'unit',
    missionDay,
    time: '07:00',
    context: 'rest',
  }
}

// Three readings of 100: median 100, spread 8 (the floor). 110 is inside the
// baseline; 62, 55 and 180 are not.
const baseline = [9, 10, 11].map((day) => reading('glucose_mgdl', day, 100))

function seen(symptomIds: string[], missionDay = 12): SymptomReport[] {
  return symptomIds.map((symptomId) => ({
    personId: PERSON,
    symptomId,
    severity: 2,
    missionDay,
    time: '14:10',
  }))
}

function score(
  row: ConditionRule,
  entries: Entry[],
  reported: string[],
  layer: Partial<SymptomLayer> = {},
) {
  return scoreCondition(row, entries, indicators, rules, {
    defs,
    reports: seen(reported),
    ...layer,
  })
}

const glucoseAt = (value: number, history = true) => [
  ...(history ? baseline : []),
  reading('glucose_mgdl', 12, value),
]

describe('symptom test vectors (T-78)', () => {
  it('four-cell row, glucose in baseline: no_data', () => {
    const result = score(hypo([]), glucoseAt(110), [])
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })

  it('low glucose, no symptoms: 1.0, review', () => {
    const result = score(HYPO, glucoseAt(62, false), [])
    expect(result.score).toBe(1)
    expect(result.label).toBe('review')
  })

  it('low glucose plus sweating: 1.0, review', () => {
    const result = score(HYPO, glucoseAt(62, false), ['sweating'])
    expect(result.score).toBe(1)
    expect(result.label).toBe('review')
  })

  it('normal glucose plus sweating: 0.333, possible', () => {
    const result = score(HYPO, glucoseAt(110), ['sweating'])
    expect(result.score).toBe(0.333)
    expect(result.label).toBe('possible')
  })

  it('no glucose, two specific symptoms: capped to 0.5, possible', () => {
    const result = score(HYPO, [], ['shaky', 'sweating'])
    expect(result.score).toBe(0.5)
    expect(result.label).toBe('possible')
  })

  it('no glucose, one symptom: no_data', () => {
    const result = score(HYPO, [], ['shaky'])
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })

  it('shared symptom only: no_data', () => {
    const result = score(HYPO, [], ['fatigue'])
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })

  it('red flag with normal glucose: urgent, the score is still reported', () => {
    const result = score(HYPO, glucoseAt(110), ['confusion'])
    expect(result.label).toBe('urgent')
    expect(result.redFlag).toBe(true)
    // (0 * 1 + 0.25) / (1 + 0.25)
    expect(result.score).toBe(0.2)
  })

  it('hypoglycaemia unawareness: 1.0, review', () => {
    const result = score(HYPO, glucoseAt(55, false), [])
    expect(result.score).toBe(1)
    expect(result.label).toBe('review')
  })

  it('high glucose plus thirst and urination: 1.0, review', () => {
    const result = score(HYPER, glucoseAt(180, false), ['thirst', 'frequent_urination'])
    expect(result.score).toBe(1)
    expect(result.label).toBe('review')
  })

  it('high glucose plus vomiting: urgent', () => {
    const result = score(HYPER, glucoseAt(180, false), ['vomiting'])
    expect(result.label).toBe('urgent')
    expect(result.redFlag).toBe(true)
  })

  it('a symptom the condition does not list is ignored', () => {
    const result = score(HYPO, glucoseAt(110), ['thirst'])
    expect(
      result.signals.map((signal) =>
        signal.kind === 'symptom' ? signal.symptomId : null,
      ),
    ).toEqual([null, 'shaky', 'sweating', 'fatigue', 'confusion'])
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })

  it('an unknown symptom id is ignored and the row keeps answering', () => {
    const result = score(hypo(['not_a_symptom']), glucoseAt(110), [])
    expect(result.signals).toHaveLength(1)
    expect(result.score).toBeNull()
    expect(result.label).toBe('no_data')
  })

  it('a symptom written twice counts once', () => {
    // The reader (content/conditions.ts) removes the repeat; the score also
    // skips a symptom it already holds.
    const result = score(hypo(['shaky']), glucoseAt(110), ['shaky'])
    expect(result.score).toBe(0.333)
    expect(result.label).toBe('possible')
  })

  it('a four-cell row scores as before: two indicators, no symptom fields', () => {
    const dehydration: ConditionRule = {
      id: 'dehydration',
      name: 'Dehydration',
      signals: [
        { indicatorId: 'hr_bpm', side: 'above' },
        { indicatorId: 'bp_sys_mmhg', side: 'below' },
      ],
      symptoms: [],
      source: 'Assumption',
    }
    const entries = [
      ...[9, 10, 11].map((day) => reading('bp_sys_mmhg', day, 118)),
      reading('hr_bpm', 12, 112),
      reading('bp_sys_mmhg', 12, 95),
    ]
    const result = score(dehydration, entries, [])
    expect(result.signals.every((signal) => signal.kind !== 'symptom')).toBe(true)
    expect(result.redFlag).toBeUndefined()
    expect(result.score).toBe(0.75)
    expect(result.label).toBe('review')
  })
})

describe('which day the symptoms count', () => {
  it('only the newest day that holds a report counts', () => {
    const reports = [...seen(['shaky', 'sweating'], 10), ...seen(['fatigue'], 12)]
    const result = score(HYPO, glucoseAt(110), [], { reports })
    // Day 12 only: fatigue (shared, 0.25) with a glucose of 0.
    expect(result.score).toBe(0.2)
  })

  it('a day with no report is no data, not a zero', () => {
    const result = score(HYPO, glucoseAt(62, false), [], { reports: [] })
    expect(result.score).toBe(1)
    const symptoms = result.signals.filter((signal) => signal.kind === 'symptom')
    expect(symptoms.every((signal) => signal.contribution === null)).toBe(true)
  })

  it('without symptoms.csv no symptom is scored and no flag is set', () => {
    const result = score(HYPO, glucoseAt(110), ['confusion'], { defs: [] })
    expect(result.label).toBe('no_data')
    expect(result.redFlag).toBeUndefined()
  })
})
