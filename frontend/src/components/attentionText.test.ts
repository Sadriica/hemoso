import { describe, expect, it } from 'vitest'
import { statusBadgeKind, statusText } from './attentionText'
import type { Status } from '../domain/state'
import { strings } from '../strings'

// The four states of docs/API.md, each with the look and the words the screens
// draw (DESIGN.md 2.2, REQ-15): one kind and one text per state, so the
// planetarium, the card and the badge cannot disagree.
const cases: [Status['state'], string, string][] = [
  ['in_range', 'in_range', strings.badge.inRange],
  ['outside_range', 'outside', strings.badge.outsideRange],
  ['needs_review', 'review', 'example_level'],
  ['no_data', 'no_data', strings.badge.noData],
]

const status = (state: Status['state']): Status => ({
  state,
  level: state === 'needs_review' ? 'example_level' : null,
  notify: state === 'needs_review' ? 'cmo' : null,
  sources: [],
})

describe('statusBadgeKind', () => {
  for (const [state, kind] of cases) {
    it(`draws ${state} as ${kind}`, () => {
      expect(statusBadgeKind(status(state))).toBe(kind)
    })
  }
})

describe('statusText', () => {
  it('says outside your usual range as its own words', () => {
    expect(statusText(status('outside_range'))).toBe(
      strings.badge.outsideRange,
    )
  })

  it('keeps in range and outside your usual range apart', () => {
    expect(statusText(status('in_range'))).not.toBe(
      statusText(status('outside_range')),
    )
  })

  it('names the level of the rule that needs a review', () => {
    expect(statusText(status('needs_review'))).toBe('example_level')
  })

  it('says needs review when the answer names no level', () => {
    expect(statusText({ ...status('needs_review'), level: null })).toBe(
      strings.badge.needsReview,
    )
  })

  it('says no data yet without a reading', () => {
    expect(statusText(status('no_data'))).toBe(strings.badge.noData)
  })
})
