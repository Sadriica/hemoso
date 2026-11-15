import { describe, expect, it } from 'vitest'
import { contextForTime, isMeasurementContext } from './context'

describe('contextForTime', () => {
  it('reads a reading before 10:00 as on waking', () => {
    expect(contextForTime('00:00')).toBe('on_waking')
    expect(contextForTime('07:30')).toBe('on_waking')
    expect(contextForTime('09:59')).toBe('on_waking')
  })

  it('reads a reading from 21:00 as before sleep', () => {
    expect(contextForTime('21:00')).toBe('before_sleep')
    expect(contextForTime('23:59')).toBe('before_sleep')
  })

  it('reads the rest of the day as at rest', () => {
    expect(contextForTime('10:00')).toBe('rest')
    expect(contextForTime('13:30')).toBe('rest')
    expect(contextForTime('20:59')).toBe('rest')
  })
})

describe('isMeasurementContext', () => {
  it('accepts the four values of FORMATS.md and nothing else', () => {
    for (const value of [
      'rest',
      'after_exercise',
      'on_waking',
      'before_sleep',
    ]) {
      expect(isMeasurementContext(value)).toBe(true)
    }
    expect(isMeasurementContext('nap')).toBe(false)
    expect(isMeasurementContext('Rest')).toBe(false)
    expect(isMeasurementContext('')).toBe(false)
    expect(isMeasurementContext(undefined)).toBe(false)
  })
})
