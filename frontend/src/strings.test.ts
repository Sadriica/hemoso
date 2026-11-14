import { describe, expect, it } from 'vitest'
import { strings } from './strings'

// The formatting helpers of strings.ts. T-51 adds the walk over every sentence
// here; this file starts with the one helper the Home card depends on.

describe('strings', () => {
  describe('cardUnit', () => {
    it('writes a 1 to 5 scale as the upper bound of the range', () => {
      expect(strings.cardUnit('1 to 5')).toBe('/ 5')
    })

    it('keeps every other unit as it is written', () => {
      expect(strings.cardUnit('bpm')).toBe('bpm')
      expect(strings.cardUnit('mmHg')).toBe('mmHg')
      expect(strings.cardUnit('%')).toBe('%')
      expect(strings.cardUnit('°C')).toBe('°C')
      expect(strings.cardUnit('example_unit')).toBe('example_unit')
    })
  })
})
