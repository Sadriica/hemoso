import { describe, expect, it } from 'vitest'
import { missionClockFor, missionDayFromStart, missionNow, missionNowFor } from './clock'
import type { Entry } from './types'

function entry(missionDay: number, personId = 'demo_astronaut_1'): Entry {
  return {
    id: `a:${missionDay}:08:00`,
    personId,
    indicatorId: 'example_indicator',
    value: 1,
    unit: 'example_unit',
    missionDay,
    time: '08:00',
    context: 'rest',
  }
}

describe('missionNow', () => {
  it('returns day 1 and the clock time when there are no entries', () => {
    expect(missionNow([], new Date(Date.UTC(2026, 10, 14, 13, 30)))).toEqual({
      missionDay: 1,
      time: '13:30',
    })
  })

  it('returns the latest mission day in the entries', () => {
    expect(missionNow([entry(3), entry(41), entry(9)], new Date(Date.UTC(2026, 10, 14, 9, 5)))).toEqual({
      missionDay: 41,
      time: '09:05',
    })
  })

  it('pads the hours and the minutes to two digits', () => {
    expect(missionNow([], new Date(Date.UTC(2026, 10, 14, 9, 5))).time).toBe('09:05')
    expect(missionNow([], new Date(Date.UTC(2026, 10, 14, 0, 0))).time).toBe('00:00')
    expect(missionNow([], new Date(Date.UTC(2026, 10, 14, 23, 59))).time).toBe('23:59')
  })
})

describe('missionNowFor', () => {
  const at = new Date(Date.UTC(2026, 10, 14, 9, 5))

  it('counts only the entries of that person', () => {
    const entries = [entry(30, 'a'), entry(4, 'b'), entry(7, 'b')]
    expect(missionNowFor(entries, 'b', at)).toEqual({ missionDay: 7, time: '09:05' })
    expect(missionNowFor(entries, 'a', at).missionDay).toBe(30)
  })

  it('is day 1 for a person with no entries, like the report form', () => {
    expect(missionNowFor([entry(30, 'a')], 'c', at).missionDay).toBe(1)
    expect(missionNowFor([], 'c', at).missionDay).toBe(missionNow([], at).missionDay)
  })

  it('leaves missionNow on all entries', () => {
    expect(missionNow([entry(30, 'a'), entry(4, 'b')], at).missionDay).toBe(30)
  })
})

describe('missionDayFromStart', () => {
  it('counts the start day as day 1', () => {
    expect(missionDayFromStart('2026-11-02', new Date(2026, 10, 2, 23, 59))).toBe(1)
    expect(missionDayFromStart('2026-11-02', new Date(2026, 10, 3, 0, 0))).toBe(2)
  })

  it('crosses month and year ends and leap days', () => {
    expect(missionDayFromStart('2026-10-30', new Date(2026, 10, 2, 8, 0))).toBe(4)
    expect(missionDayFromStart('2025-12-31', new Date(2026, 0, 1, 8, 0))).toBe(2)
    expect(missionDayFromStart('2028-02-28', new Date(2028, 2, 1, 8, 0))).toBe(3)
  })

  it('does not drift over a daylight saving change', () => {
    expect(missionDayFromStart('2026-03-01', new Date(2026, 3, 1, 0, 30))).toBe(32)
    expect(missionDayFromStart('2026-10-01', new Date(2026, 10, 1, 23, 30))).toBe(32)
  })

  it('is day 1 for a start in the future', () => {
    expect(missionDayFromStart('2026-12-01', new Date(2026, 10, 2))).toBe(1)
  })
})

describe('missionClockFor', () => {
  const now = new Date(Date.UTC(2026, 10, 14, 9, 5))
  it('counts from the mission start of the person', () => {
    expect(missionClockFor([entry(30, 'a')], 'a', '2026-11-02', now)).toEqual({
      missionDay: 13,
      time: '09:05',
    })
  })
  it('falls back to the latest entry day of that person without a start', () => {
    expect(missionClockFor([entry(30, 'a'), entry(8, 'b')], 'b', null, now).missionDay).toBe(8)
    expect(missionClockFor([entry(30, 'a')], 'c', null, now).missionDay).toBe(1)
  })
})
