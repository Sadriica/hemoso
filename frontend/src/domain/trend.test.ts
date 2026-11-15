import { describe, expect, it } from 'vitest'
import {
  bloodPressurePartner,
  citedThresholds,
  contextCounts,
  flightTime,
  nearestIndex,
  stepIndex,
  trendBand,
  trendSeries,
  usualContext,
} from './trend'
import type { AttentionRule, Entry } from './types'

function entry(
  day: number,
  value: number,
  extra: Partial<Entry> = {},
): Entry {
  return {
    id: `e:${day}:${extra.time ?? '08:00'}:${value}:${extra.context ?? 'rest'}`,
    personId: 'p',
    indicatorId: 'x',
    value,
    unit: 'u',
    missionDay: day,
    time: '08:00',
    context: 'rest',
    ...extra,
  }
}

const cited: AttentionRule = {
  indicatorId: 'x',
  side: 'above',
  threshold: 100,
  attentionLevel: 'consult',
  notify: 'cmo',
  sources: [{ title: 'NASA', url: 'https://example.org' }],
}
const assumed: AttentionRule = { ...cited, threshold: 90, sources: ['Assumption'] }

describe('trendBand', () => {
  it('is the median and three spreads of the last 14 days in the context', () => {
    // 20 readings, one a day: the tested reading of day 20 is left out, so the
    // 14 days before it (values 6 to 19) set the band.
    const rows = Array.from({ length: 20 }, (_, i) => entry(i + 1, i + 1))
    const band = trendBand(rows, 'rest', [], 0.5)
    // median of 6..19 is 12.5, MAD is 3.5, spread = 1.4826 * 3.5
    expect(band?.median).toBe(12.5)
    expect(band?.spread).toBeCloseTo(1.4826 * 3.5, 6)
    expect(band?.high).toBeCloseTo(12.5 + 3 * 1.4826 * 3.5, 6)
    expect(band?.low).toBeCloseTo(12.5 - 3 * 1.4826 * 3.5, 6)
  })

  it('keeps the noise floor for a flat history', () => {
    const rows = [1, 2, 3, 4].map((day) => entry(day, 60))
    const band = trendBand(rows, 'rest', [], 2)
    expect(band).toMatchObject({ median: 60, spread: 2, low: 54, high: 66 })
  })

  it('ignores readings of another context', () => {
    const rows = [
      entry(1, 10),
      entry(2, 10),
      entry(3, 10),
      entry(4, 10),
      entry(5, 200, { context: 'after_exercise' }),
    ]
    expect(trendBand(rows, 'rest', [], 1)?.median).toBe(10)
    expect(trendBand(rows, 'after_exercise', [], 1)).toBeNull()
  })

  it('is null with fewer than 3 days', () => {
    expect(trendBand([entry(1, 5), entry(2, 6)], 'rest', [], 1)).toBeNull()
    expect(trendBand([], 'rest', [], 1)).toBeNull()
  })
})

describe('citedThresholds', () => {
  it('keeps only rows with a link as a source', () => {
    expect(citedThresholds([cited, assumed])).toEqual([cited])
  })

  it('keeps a row with both a link and the word Assumption', () => {
    const both = { ...cited, sources: ['Assumption', ...cited.sources] as AttentionRule['sources'] }
    expect(citedThresholds([both])).toEqual([both])
  })
})

describe('context filter', () => {
  const rows = [
    entry(3, 3),
    entry(1, 1, { context: 'on_waking' }),
    entry(2, 2),
    entry(4, 4, { context: 'on_waking' }),
    entry(5, 5, { context: 'on_waking' }),
  ]

  it('draws only the chosen context, oldest first', () => {
    expect(trendSeries(rows, 'rest', 'all').map((e) => e.value)).toEqual([2, 3])
    expect(trendSeries(rows, 'on_waking', 'all').map((e) => e.value)).toEqual([1, 4, 5])
  })

  it('last 14 keeps the newest 14 and all keeps everything', () => {
    const many = Array.from({ length: 20 }, (_, i) => entry(i + 1, i + 1))
    expect(trendSeries(many, 'rest', 'last14').map((e) => e.value)).toEqual(
      Array.from({ length: 14 }, (_, i) => i + 7),
    )
    expect(trendSeries(many, 'rest', 'all')).toHaveLength(20)
  })

  it('defaults to the context with most readings, then the newest one', () => {
    expect(usualContext(rows)).toBe('on_waking')
    expect(usualContext([entry(1, 1), entry(2, 2, { context: 'before_sleep' })])).toBe(
      'before_sleep',
    )
    expect(usualContext([])).toBe('rest')
  })

  it('counts the readings of each context', () => {
    expect(contextCounts(rows)).toEqual({
      rest: 2,
      after_exercise: 0,
      on_waking: 3,
      before_sleep: 0,
    })
  })
})

describe('keyboard steps', () => {
  it('moves one reading and holds at the ends', () => {
    expect(stepIndex(1, 4, 'ArrowRight')).toBe(2)
    expect(stepIndex(3, 4, 'ArrowRight')).toBe(3)
    expect(stepIndex(0, 4, 'ArrowLeft')).toBe(0)
    expect(stepIndex(2, 4, 'Home')).toBe(0)
    expect(stepIndex(1, 4, 'End')).toBe(3)
    expect(stepIndex(0, 0, 'End')).toBe(-1)
  })

  it('finds the nearest reading of the other series', () => {
    expect(nearestIndex([1, 3, 8], 4)).toBe(1)
    expect(nearestIndex([], 4)).toBe(-1)
  })
})

describe('helpers', () => {
  it('places two readings of one day apart by their GMT time', () => {
    expect(flightTime({ missionDay: 4, time: '12:00' })).toBeCloseTo(4.5, 6)
    expect(flightTime({ missionDay: 4, time: '06:00' })).toBeLessThan(
      flightTime({ missionDay: 4, time: '18:00' }),
    )
  })

  it('pairs the two blood pressure ids', () => {
    expect(bloodPressurePartner('bp_sys_mmhg')).toBe('bp_dia_mmhg')
    expect(bloodPressurePartner('bp_dia_mmhg')).toBe('bp_sys_mmhg')
    expect(bloodPressurePartner('hr_bpm')).toBeNull()
  })
})
