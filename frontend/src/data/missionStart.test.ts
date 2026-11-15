import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMissionStart, isIsoDate, MISSION_START_KEY, setMissionStart, todayIso } from './missionStart'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('mission start storage', () => {
  it('saves a start per person under its own key', () => {
    setMissionStart('ana', '2026-11-02')
    setMissionStart('luis', '2026-10-20')
    expect(getMissionStart('ana')).toBe('2026-11-02')
    expect(getMissionStart('luis')).toBe('2026-10-20')
    expect(getMissionStart('nobody')).toBeNull()
    expect(JSON.parse(localStorage.getItem(MISSION_START_KEY) ?? '{}')).toEqual({
      ana: '2026-11-02',
      luis: '2026-10-20',
    })
  })

  it('ignores a date that is not a real YYYY-MM-DD date', () => {
    setMissionStart('bad', '2026-02-30')
    setMissionStart('bad', '2 Nov')
    expect(getMissionStart('bad')).toBeNull()
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2026-13-01')).toBe(false)
  })

  it('reads a damaged value as no start', () => {
    localStorage.setItem(MISSION_START_KEY, '{not json')
    expect(getMissionStart('ana')).toBeNull()
    localStorage.setItem(MISSION_START_KEY, JSON.stringify({ ana: 'soon' }))
    expect(getMissionStart('ana')).toBeNull()
  })

  it('does not throw when storage fails, and keeps the start for this page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setMissionStart('mem', '2026-11-05')).not.toThrow()
    expect(getMissionStart('mem')).toBe('2026-11-05')
  })

  it('formats today as a local calendar date', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
