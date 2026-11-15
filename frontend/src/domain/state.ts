import { attentionFor } from './attention'
import type { AttentionRule, Entry, Notify, Source } from './types'

// The state of one reading against the person's own baseline: the rule of
// FORMATS.md section 3, "How each value is compared", and
// docs/findings/phys-02-baseline-state-rule.md. The same rule runs twice: in
// the backend (docs/API.md, GET .../state) and here, so the screens still say
// something true when the server does not answer.

// The three baseline states: the ones the rule below decides, and the `###
// headings` of a content file that are not attention levels (FORMATS.md
// section 3, config/content/<indicator_id>.md). A file always carries in_range
// and outside_range; no_data is the one it may leave out.
export const BASELINE_STATES = ['in_range', 'outside_range', 'no_data'] as const
export type BaselineStateName = (typeof BASELINE_STATES)[number]

// The four states the astronaut reads (docs/API.md).
export type IndicatorStateName = BaselineStateName | 'needs_review'

// The window counts mission days, not readings (FORMATS.md section 3, point 1:
// "the last 14 mission days that hold a reading"). An entry carries a mission
// day and a time, not a date (docs/API.md), and a day with several readings
// counts once.
export const WINDOW = 14
// The spread is the median absolute deviation scaled to a standard deviation.
export const MAD_FACTOR = 1.4826
// A value further than this many spreads from the median is outside.
export const BAND = 3
// Fewer mission days than this are no baseline at all.
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

// A value on the boundary triggers the row, as it does in attention.ts: the
// cited sources say "or higher", so `above` triggers at value >= threshold and
// `below` at value <= threshold (Bio 2, Sun 15 Nov, Q4; backend PR #173).
function crosses(
  value: number,
  median: number,
  boundary: number,
  side: 'above' | 'below' | null,
): boolean {
  if (side === 'above') return value >= boundary
  if (side === 'below') return value <= boundary
  if (value === boundary) return true
  return (value - median) * (value - boundary) > 0
}

// The readings the baseline is taken over, in file order: the last 14 mission
// days that hold a reading in the same context, and nothing from the tested
// reading or later. A day with several readings takes the place of one day.
export function baselineWindow(entries: Entry[], latest: Entry): Entry[] {
  const same = entries.filter(
    (entry) =>
      entry.context === latest.context &&
      // An earlier mission day, or the same day at an earlier time; HH:MM
      // compares as text (backend/app/state.py, `window`).
      (entry.missionDay < latest.missionDay ||
        (entry.missionDay === latest.missionDay && entry.time < latest.time)),
  )
  const days = [...new Set(same.map((entry) => entry.missionDay))]
    .sort((a, b) => a - b)
    .slice(-WINDOW)
  const kept = new Set(days)
  return same.filter((entry) => kept.has(entry.missionDay))
}

// One value per mission day: the arithmetic mean of that day's readings,
// oldest day first. Every day weighs the same whatever its number of readings.
export function dailyValues(entries: Entry[]): number[] {
  const byDay = new Map<number, number[]>()
  for (const entry of entries) {
    const values = byDay.get(entry.missionDay)
    if (values === undefined) byDay.set(entry.missionDay, [entry.value])
    else values.push(entry.value)
  }
  return [...byDay.keys()].sort((a, b) => a - b).map((day) => {
    const values = byDay.get(day) ?? []
    return values.reduce((sum, value) => sum + value, 0) / values.length
  })
}

// The local rule for one reading: `entries` are the person's entries for the
// indicator, and only the ones in the same context and before the reading are
// compared (FORMATS.md section 3). It is the rule of backend/app/state.py: the
// last 14 mission days that hold a reading, each day once as the mean of that
// day's readings, and the median and spread over those daily values.
export interface LocalState {
  state: IndicatorStateName
  median: number | null
  spread: number | null
  // The mission days the baseline rests on: one per day, however many readings
  // that day holds.
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
  const daily = dailyValues(baselineWindow(entries, latest))
  const middle = daily.length < MIN_WINDOW ? null : median(daily)
  const spread =
    middle === null
      ? null
      : Math.max(
          MAD_FACTOR * median(daily.map((value) => Math.abs(value - middle))),
          minSpread,
        )

  // Only a row whose source is a link may raise `needs_review`, with or without
  // a baseline: a row marked Assumption is an invented limit and must not raise
  // an alarm on its own (docs/findings/phys-02-baseline-state-rule.md, "The
  // rule"; backend/app/state.py filters the same way in `cited_rows`). The
  // Details panel still lists every row through `attentionFor`.
  const cited = rules.filter((rule) =>
    rule.sources.some((source) => source !== 'Assumption'),
  )
  const attention = attentionFor(latest.value, cited)
  const rule = attention.kind === 'attention' ? attention.rule : null

  // Safety first (phys-02, "The rule"): a crossed row with a link needs review
  // even without a baseline, so a value past its limit on the first day is not
  // "no data yet". Without a row and without a baseline there is nothing to
  // compare, so the card says so.
  if (middle === null) {
    return {
      state: rule === null ? 'no_data' : 'needs_review',
      median: null,
      spread: null,
      n: daily.length,
      rule,
    }
  }

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
    n: daily.length,
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
