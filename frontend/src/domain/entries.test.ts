import { describe, expect, it } from 'vitest'
import { latestEntry } from './entries'
import type { Entry } from './types'

function entry(missionDay: number, time: string): Entry {
  return {
    id: `x:${missionDay}:${time}`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value: 1,
    unit: 'example_unit',
    missionDay,
    time,
  }
}

describe('latestEntry', () => {
  it('returns null for an empty list', () => {
    expect(latestEntry([])).toBeNull()
  })

  it('picks the latest day', () => {
    const result = latestEntry([entry(1, '13:30'), entry(10, '09:00')])
    expect(result?.missionDay).toBe(10)
  })

  it('picks the latest time on the same day', () => {
    const result = latestEntry([entry(10, '09:00'), entry(10, '13:30')])
    expect(result?.time).toBe('13:30')
  })

  it('picks the later entry when day and time are equal, so a correction shows', () => {
    const first: Entry = { ...entry(10, '13:30'), id: 'first', value: 1 }
    const correction: Entry = { ...entry(10, '13:30'), id: 'correction', value: 2 }
    expect(latestEntry([first, correction])?.id).toBe('correction')
    expect(latestEntry([first, correction])?.value).toBe(2)
  })
})
