import { describe, expect, it } from 'vitest'
import { attentionFor } from './attention'
import type { AttentionRule } from './types'

function rule(
  side: 'below' | 'above',
  threshold: number,
  attentionLevel: string,
  notify: AttentionRule['notify'],
): AttentionRule {
  return {
    indicatorId: 'example_indicator',
    side,
    threshold,
    attentionLevel,
    notify,
    sources: ['Assumption'],
  }
}

const aboveRule = rule('above', 100, 'high', 'crew')
const belowRule = rule('below', 10, 'low', 'crew')

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

  it('says there are no rules when the indicator has none, never in range', () => {
    expect(attentionFor(50, [])).toEqual({ kind: 'no_rules' })
  })

  it('is in range only when a rule exists and none matched', () => {
    expect(attentionFor(50, [aboveRule, belowRule])).toEqual({ kind: 'in_range' })
  })
})

// The worked example of FORMATS.md section 3: a crew step at 37.5 and a CMO
// step at 36.0, both `below`; a value of 35 crosses both and the CMO wins.
describe('attentionFor with stepped rules', () => {
  const crewStep = rule('below', 37.5, 'watch', 'crew')
  const cmoStep = rule('below', 36.0, 'needs_review', 'cmo')

  it('returns the most severe notify when several rules match', () => {
    const result = attentionFor(35, [crewStep, cmoStep])
    expect(result.kind).toBe('attention')
    if (result.kind === 'attention') {
      expect(result.level).toBe('needs_review')
      expect(result.rule.notify).toBe('cmo')
    }
  })

  it('returns the milder step when only that one matches', () => {
    const result = attentionFor(37, [crewStep, cmoStep])
    expect(result.kind).toBe('attention')
    if (result.kind === 'attention') expect(result.level).toBe('watch')
  })

  it('is in range above every step', () => {
    expect(attentionFor(38, [crewStep, cmoStep])).toEqual({ kind: 'in_range' })
  })

  it('gives the same answers with the rows in reverse order', () => {
    const reversed = [cmoStep, crewStep]
    const cmo = attentionFor(35, reversed)
    expect(cmo.kind === 'attention' && cmo.level).toBe('needs_review')
    const crew = attentionFor(37, reversed)
    expect(crew.kind === 'attention' && crew.level).toBe('watch')
    expect(attentionFor(38, reversed)).toEqual({ kind: 'in_range' })
  })

  it('ranks the flight surgeon above the CMO', () => {
    const surgeon = rule('below', 35, 'urgent', 'flight_surgeon')
    const result = attentionFor(30, [surgeon, cmoStep, crewStep])
    expect(result.kind === 'attention' && result.level).toBe('urgent')
  })

  it('breaks a tie on notify with the more extreme below threshold', () => {
    const milder = rule('below', 37.5, 'watch', 'crew')
    const stricter = rule('below', 36, 'stricter_watch', 'crew')
    const result = attentionFor(35, [milder, stricter])
    expect(result.kind === 'attention' && result.level).toBe('stricter_watch')
    const reversed = attentionFor(35, [stricter, milder])
    expect(reversed.kind === 'attention' && reversed.level).toBe('stricter_watch')
  })

  it('breaks a tie on notify with the higher above threshold', () => {
    const milder = rule('above', 100, 'high', 'crew')
    const stricter = rule('above', 105, 'higher', 'crew')
    const result = attentionFor(110, [milder, stricter])
    expect(result.kind === 'attention' && result.level).toBe('higher')
  })

  it('keeps file order when two matching rules are on opposite sides', () => {
    const below = rule('below', 100, 'low_side', 'crew')
    const above = rule('above', 10, 'high_side', 'crew')
    const result = attentionFor(50, [below, above])
    expect(result.kind === 'attention' && result.level).toBe('low_side')
  })
})
