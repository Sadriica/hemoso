import { describe, expect, it } from 'vitest'
import { parseRules } from './rules'

const header = 'indicator_id,side,threshold,attention_level,notify,source\n'
const validIds = new Set(['example_indicator'])

describe('parseRules', () => {
  it('parses a valid rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,crew,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(1)
    expect(rules[0]).toMatchObject({
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 100,
      attentionLevel: 'example_level',
      notify: 'crew',
    })
    expect(problems).toEqual([])
  })

  it('reads each of the three notify values', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header +
        'example_indicator,below,37.5,watch,crew,Assumption\n' +
        'example_indicator,below,36,needs_review,cmo,Assumption\n' +
        'example_indicator,below,35,urgent,flight_surgeon,Assumption\n',
      validIds,
      problems,
    )
    expect(rules.map((rule) => rule.notify)).toEqual([
      'crew',
      'cmo',
      'flight_surgeon',
    ])
    expect(problems).toEqual([])
  })

  it('reports an unknown side and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,under,100,example_level,crew,Assumption\n',
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
      header + 'other_indicator,above,100,example_level,crew,Assumption\n',
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
      header + 'example_indicator,above,,example_level,crew,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes('missing or non-numeric threshold')),
    ).toBe(true)
  })

  it('reports an empty attention level and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,,crew,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes('empty attention level')),
    ).toBe(true)
  })

  it('reports an empty notify and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(problems.some((problem) => problem.includes('empty notify'))).toBe(true)
  })

  it('reports an unknown notify and skips the rule', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,medic,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(0)
    expect(
      problems.some((problem) => problem.includes("unknown notify 'medic'")),
    ).toBe(true)
  })

  it('reports a second row with the same indicator, side and threshold', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header +
        'example_indicator,below,36,needs_review,cmo,Assumption\n' +
        'example_indicator,below,36.0,other_level,crew,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(1)
    expect(rules[0].attentionLevel).toBe('needs_review')
    expect(
      problems.some((problem) =>
        problem.includes("Duplicate attention rule for 'example_indicator' below 36"),
      ),
    ).toBe(true)
  })

  it('keeps two rows on the same indicator and threshold on opposite sides', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header +
        'example_indicator,below,36,low_level,crew,Assumption\n' +
        'example_indicator,above,36,high_level,cmo,Assumption\n',
      validIds,
      problems,
    )
    expect(rules).toHaveLength(2)
    expect(problems).toEqual([])
  })

  it('reports a missing source', () => {
    const problems: string[] = []
    parseRules(
      'config/rules/attention.csv',
      header + 'example_indicator,above,100,example_level,crew,\n',
      validIds,
      problems,
    )
    expect(
      problems.some((problem) => problem.includes('no source or Assumption')),
    ).toBe(true)
  })

  it('reads several links in one source cell', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header +
        'example_indicator,above,100,example_level,crew,https://example.org/a https://example.org/b\n',
      validIds,
      problems,
    )
    expect(rules[0].sources).toHaveLength(2)
    expect(problems).toEqual([])
  })

  it('drops an unknown indicator without a problem when asked to skip it', () => {
    const problems: string[] = []
    const rules = parseRules(
      'config/rules/attention.csv',
      header +
        'example_indicator,above,100,example_level,crew,Assumption\n' +
        'other_indicator,above,50,other_level,cmo,Assumption\n',
      validIds,
      problems,
      { skipUnknownIndicators: true },
    )
    expect(rules).toHaveLength(1)
    expect(problems).toEqual([])
  })
})
