import { describe, expect, it } from 'vitest'
import baseline from '../../../scripts/fixtures/format_rules/baseline.json'
import vectors from '../../../scripts/fixtures/format_rules/attention.json'
import { attentionFor } from './attention'
import { baselineState, localState } from './state'
import type { AttentionRule, Entry, Notify } from './types'

// The shared vectors of scripts/fixtures/format_rules are what the backend is
// checked against (docs/API.md, GET .../state). The screens fall back to these
// local functions, so they must answer the same cases the same way; the cases
// marked undefined_by_formats are checked too.

describe('baselineState against the baseline vectors', () => {
  for (const testCase of baseline.cases) {
    it(testCase.name, () => {
      const { median, spread, value, boundary } = testCase.input
      expect(baselineState(value, median, spread, boundary)).toBe(
        testCase.expected,
      )
    })
  }
})

describe('attentionFor against the attention vectors', () => {
  for (const testCase of vectors.cases) {
    it(testCase.name, () => {
      const rules: AttentionRule[] = testCase.input.rows.map((row) => ({
        indicatorId: row.indicator_id,
        side: row.side as 'above' | 'below',
        threshold: row.threshold,
        attentionLevel: row.attention_level,
        notify: row.notify as Notify,
        sources: [],
      }))
      const answer = attentionFor(testCase.input.value, rules)
      const winner =
        answer.kind === 'attention'
          ? { attention_level: answer.level, notify: answer.rule.notify }
          : null
      expect(winner).toEqual(testCase.expected)
    })
  }
})

function entry(
  missionDay: number,
  value: number,
  extra: Partial<Entry> = {},
): Entry {
  return {
    id: `x:${missionDay}:${value}`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay,
    time: '08:00',
    context: 'rest',
    ...extra,
  }
}

const above: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'above',
  threshold: 100,
  attentionLevel: 'example_level',
  notify: 'crew',
  sources: ['Assumption'],
}

// The latest reading of day 10, compared with the earlier ones of the list.
function latestOf(rows: Entry[]): Entry {
  return rows.reduce((latest, row) =>
    row.missionDay > latest.missionDay ? row : latest,
  )
}

describe('localState', () => {
  it('has no data with fewer than three earlier readings', () => {
    const rows = [entry(1, 10), entry(2, 10), entry(10, 10)]
    const state = localState(latestOf(rows), rows, [], 1)
    expect(state.state).toBe('no_data')
    expect(state.median).toBeNull()
    expect(state.spread).toBeNull()
    expect(state.n).toBe(2)
  })

  it('keeps the median and never goes below the noise floor', () => {
    const rows = [entry(1, 10), entry(2, 10), entry(3, 10), entry(10, 12)]
    const state = localState(latestOf(rows), rows, [], 4)
    expect(state.median).toBe(10)
    expect(state.spread).toBe(4)
    expect(state.state).toBe('in_range')
  })

  it('uses the median absolute deviation when it is above the floor', () => {
    // Values 10, 10 and 40: the median is 10, the deviations 0, 0 and 30, so
    // the spread is 1.4826 × 0 = 0 and the floor decides again.
    const rows = [entry(1, 10), entry(2, 10), entry(3, 40), entry(10, 10)]
    const state = localState(latestOf(rows), rows, [], 1)
    expect(state.median).toBe(10)
    expect(state.spread).toBe(1)
    expect(state.state).toBe('in_range')
  })

  it('calls a value past the band outside the usual range', () => {
    const rows = [entry(1, 10), entry(2, 10), entry(3, 10), entry(10, 40)]
    expect(localState(latestOf(rows), rows, [], 1).state).toBe('outside_range')
  })

  it('only compares readings in the same context', () => {
    const rows = [
      entry(1, 200, { context: 'after_exercise' }),
      entry(2, 200, { context: 'after_exercise' }),
      entry(3, 200, { context: 'after_exercise' }),
      entry(4, 10),
      entry(10, 10),
    ]
    const state = localState(latestOf(rows), rows, [], 1)
    expect(state.n).toBe(1)
    expect(state.state).toBe('no_data')
  })

  it('calls a crossed attention row needs_review and keeps the row', () => {
    const rows = [entry(1, 10), entry(2, 10), entry(3, 10), entry(10, 101)]
    const state = localState(latestOf(rows), rows, [above], 1)
    expect(state.state).toBe('needs_review')
    expect(state.rule?.attentionLevel).toBe('example_level')
  })

  describe('without a baseline (phys-02 vectors)', () => {
    const cited: AttentionRule = {
      ...above,
      sources: [{ title: 'Example', url: 'https://example.org' }],
    }
    const rows = (value: number) => [entry(1, 10), entry(2, 10), entry(10, value)]

    it('needs review when the crossed row has a link', () => {
      const list = rows(150)
      const state = localState(latestOf(list), list, [cited], 1)
      expect(state.state).toBe('needs_review')
      expect(state.rule).toBe(cited)
      expect(state.median).toBeNull()
    })

    it('stays no_data when the crossed row is only an Assumption', () => {
      const list = rows(150)
      const state = localState(latestOf(list), list, [above], 1)
      expect(state.state).toBe('no_data')
      expect(state.rule).toBeNull()
    })

    it('stays no_data below any limit', () => {
      const list = rows(50)
      const state = localState(latestOf(list), list, [cited], 1)
      expect(state.state).toBe('no_data')
    })
  })

  it('windows the last fourteen readings', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, index) => entry(index + 1, 500)),
      entry(30, 10),
    ]
    expect(localState(latestOf(rows), rows, [], 1).n).toBe(14)
  })
})
