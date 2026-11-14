import { describe, expect, it } from 'vitest'
import { parseRules } from './rules'

const header = 'indicator_id,side,threshold,attention_level,source\n'
const validIds = new Set(['example_indicator'])

describe('parseRules', () => {
  it('parses a valid rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(1)
    expect(rules[0]).toMatchObject({
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 100,
      attentionLevel: 'example_level',
    })
    expect(problems).toEqual([])
  })

  it('reports an unknown side and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,under,100,example_level,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(problems.some((problem) => problem.includes("unknown side 'under'"))).toBe(
      true,
    )
  })

  it('reports an unknown indicator id and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'other_indicator,above,100,example_level,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(
      problems.some((problem) =>
        problem.includes("Unknown indicator id 'other_indicator'"),
      ),
    ).toBe(true)
  })

  it('reports an empty threshold and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,,example_level,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes('missing or non-numeric threshold')),
    ).toBe(true)
  })

  it('reports a missing source', () => {
    const problems: string[] = []
    parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,\n',
      validIds,
      problems,
    )
    expect(
      problems.some((problem) => problem.includes('no source or Assumption')),
    ).toBe(true)
  })
})
