import { describe, expect, it } from 'vitest'
import { missionNow } from './clock'
import type { Entry } from './types'

function entry(missionDay: number): Entry {
  return {
    id: `a:${missionDay}:08:00`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value: 1,
    unit: 'example_unit',
    missionDay,
    time: '08:00',
  }
}

describe('missionNow', () => {
  it('returns day 1 and the clock time when there are no entries', () => {
    expect(missionNow([], new Date(2026, 10, 14, 13, 30))).toEqual({
      missionDay: 1,
      time: '13:30',
    })
  })

  it('returns the latest mission day in the entries', () => {
    expect(missionNow([entry(3), entry(41), entry(9)], new Date(2026, 10, 14, 9, 5))).toEqual({
      missionDay: 41,
      time: '09:05',
    })
  })

  it('pads the hours and the minutes to two digits', () => {
    expect(missionNow([], new Date(2026, 10, 14, 9, 5)).time).toBe('09:05')
    expect(missionNow([], new Date(2026, 10, 14, 0, 0)).time).toBe('00:00')
    expect(missionNow([], new Date(2026, 10, 14, 23, 59)).time).toBe('23:59')
  })
})
