import { describe, expect, it } from 'vitest'
import { attentionFor } from './attention'
import type { AttentionRule } from './types'

const aboveRule: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'above',
  threshold: 100,
  attentionLevel: 'high',
  sources: ['Assumption'],
}

const belowRule: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'below',
  threshold: 10,
  attentionLevel: 'low',
  sources: ['Assumption'],
}

describe('attentionFor', () => {
  it('matches an above rule when value is above the threshold', () => {
    expect(attentionFor(101, [aboveRule])).toEqual({
      kind: 'attention',
      level: 'high',
      rule: aboveRule,
    })
  })

  it('matches a below rule when value is below the threshold', () => {
    expect(attentionFor(9, [belowRule])).toEqual({
      kind: 'attention',
      level: 'low',
      rule: belowRule,
    })
  })

  it('treats a value equal to the threshold as in range', () => {
    expect(attentionFor(100, [aboveRule])).toEqual({ kind: 'in_range' })
    expect(attentionFor(10, [belowRule])).toEqual({ kind: 'in_range' })
  })

  it('returns the first matching rule when several match', () => {
    const result = attentionFor(5, [belowRule, aboveRule])
    expect(result.kind).toBe('attention')
    if (result.kind === 'attention') expect(result.level).toBe('low')
  })

  it('is in range when there are no rules', () => {
    expect(attentionFor(50, [])).toEqual({ kind: 'in_range' })
  })
})
