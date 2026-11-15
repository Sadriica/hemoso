import { attentionFor } from './attention'
import { newestFirst } from './entries'
import type { AttentionRule, Entry, Notify, Source } from './types'

// The state of one reading against the person's own baseline: the rule of
// FORMATS.md section 3, "How each value is compared", and
// docs/findings/phys-02-baseline-state-rule.md. The same rule runs twice: in
// the backend (docs/API.md, GET .../state) and here, so the screens still say
// something true when the server does not answer.

// The four states the astronaut reads (docs/API.md).
export type IndicatorStateName =
  | 'no_data'
  | 'in_range'
  | 'outside_range'
  | 'needs_review'

// The window counts readings, not days: an entry carries a mission day and a
// time, not a date (docs/API.md).
export const WINDOW = 14
// The spread is the median absolute deviation scaled to a standard deviation.
export const MAD_FACTOR = 1.4826
// A value further than this many spreads from the median is outside.
export const BAND = 3
// Fewer readings than this are no baseline at all.
export const MIN_WINDOW = 3

// The attention row that matched, as GET .../state returns it.
export interface StateAttention {
  level: string
  notify: Notify
  source: string
}

// One answer of GET .../state.
export interface IndicatorState {
  state: IndicatorStateName
  median: number | null
  spread: number | null
  n: number
  attention: StateAttention | null
}

// What one indicator card shows, from either source: the state, and the row
// behind a needs_review so the card can name who acts and its source.
export interface Status {
  state: IndicatorStateName
  level: string | null
  notify: Notify | null
  sources: Source[]
}

export const NO_DATA_STATUS: Status = {
  state: 'no_data',
  level: null,
  notify: null,
  sources: [],
}

// The baseline rule, in the form the team's shared vectors have it
// (scripts/fixtures/format_rules/baseline.json, the nine cases of phys-02):
// no baseline is `no_data`, a value past the boundary is `needs_review`, and
// otherwise the band of three spreads decides. The app passes the `side` of the
// attention row, which FORMATS.md gives every row; the vectors leave it out and
// the boundary then triggers on the side the value lies from the median.
export function baselineState(
  value: number,
  median: number | null,
  spread: number | null,
  boundary: number | null = null,
  side: 'above' | 'below' | null = null,
): IndicatorStateName {
  if (median === null) return 'no_data'
  if (boundary !== null && crosses(value, median, boundary, side)) {
    return 'needs_review'
  }
  const band = BAND * (spread ?? 0)
  return Math.abs(value - median) <= band ? 'in_range' : 'outside_range'
}

// A value exactly on the boundary does not trigger the row.
function crosses(
  value: number,
  median: number,
  boundary: number,
  side: 'above' | 'below' | null,
): boolean {
  if (side === 'above') return value > boundary
  if (side === 'below') return value < boundary
  return (value - median) * (value - boundary) > 0
}

// The local rule for one reading: `entries` are the person's entries for the
// indicator, and only the ones in the same context are compared (FORMATS.md
// section 3). The latest reading itself is left out of the window.
export interface LocalState {
  state: IndicatorStateName
  median: number | null
  spread: number | null
  n: number
  // The attention row that matched, for the level name, who acts and its
  // source; null when no row matched.
  rule: AttentionRule | null
}

export function localState(
  latest: Entry,
  entries: Entry[],
  rules: AttentionRule[],
  minSpread: number,
): LocalState {
  const window = newestFirst(
    entries.filter(
      (entry) => entry !== latest && entry.context === latest.context,
    ),
  ).slice(0, WINDOW)
  const values = window.map((entry) => entry.value)
  const middle = values.length < MIN_WINDOW ? null : median(values)
  const spread =
    middle === null
      ? null
      : Math.max(
          MAD_FACTOR * median(values.map((value) => Math.abs(value - middle))),
          minSpread,
        )

  const attention = attentionFor(latest.value, rules)
  const rule = attention.kind === 'attention' ? attention.rule : null
  return {
    state: baselineState(
      latest.value,
      middle,
      spread,
      rule === null ? null : rule.threshold,
      rule === null ? null : rule.side,
    ),
    median: middle,
    spread,
    n: values.length,
    rule,
  }
}

export function statusFromLocal(local: LocalState): Status {
  if (local.rule === null) {
    return { state: local.state, level: null, notify: null, sources: [] }
  }
  return {
    state: local.state,
    level: local.rule.attentionLevel,
    notify: local.rule.notify,
    sources: local.rule.sources,
  }
}

export function statusFromApi(state: IndicatorState): Status {
  const attention = state.attention
  if (attention === null) {
    return { state: state.state, level: null, notify: null, sources: [] }
  }
  return {
    state: state.state,
    level: attention.level,
    notify: attention.notify,
    sources: sourcesFromApi(attention.source),
  }
}

// The API returns the row's `source` cell as one string (FORMATS.md section 3:
// a link or the word Assumption).
function sourcesFromApi(source: string): Source[] {
  const text = source.trim()
  if (text === 'Assumption') return ['Assumption']
  if (/^https?:\/\//.test(text)) return [{ title: text, url: text }]
  return []
}

// The middle value of an odd count, the mean of the two middle values of an
// even count. Kept exact: the state compares it with a band and does not show
// it.
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}
