import { MEASUREMENT_CONTEXTS } from './context'
import { BAND, WINDOW, localState } from './state'
import type { AttentionRule, Entry, MeasurementContext } from './types'

// What the History trend chart draws, computed from the person's readings with
// the rules the cards already use (FORMATS.md section 3, "How each value is
// compared"). Nothing here is stored or sent; it only arranges numbers the app
// already has.

// How much of the context the chart shows: the baseline window or everything.
export type TrendWindow = 'last14' | 'all'

// The two series of a blood pressure chart (FORMATS.md section 2).
export const BLOOD_PRESSURE_IDS = ['bp_sys_mmhg', 'bp_dia_mmhg'] as const

// The other half of a blood pressure pair, or null for any other indicator.
export function bloodPressurePartner(indicatorId: string): string | null {
  if (indicatorId === BLOOD_PRESSURE_IDS[0]) return BLOOD_PRESSURE_IDS[1]
  if (indicatorId === BLOOD_PRESSURE_IDS[1]) return BLOOD_PRESSURE_IDS[0]
  return null
}

// Oldest first: the order of the x axis and of the arrow keys. Two readings of
// one day keep their clock order, and equal moments keep the order they came in.
export function oldestFirst(entries: Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.missionDay !== b.entry.missionDay) {
        return a.entry.missionDay - b.entry.missionDay
      }
      if (a.entry.time !== b.entry.time) {
        return a.entry.time < b.entry.time ? -1 : 1
      }
      return a.index - b.index
    })
    .map(({ entry }) => entry)
}

// The position of a reading on the Flight Day axis: the day plus the share of
// the day the GMT time has passed, so two readings of one day do not overlap.
export function flightTime(entry: Pick<Entry, 'missionDay' | 'time'>): number {
  const hours = Number(entry.time.slice(0, 2))
  const minutes = Number(entry.time.slice(3, 5))
  const share = (hours * 60 + minutes) / (24 * 60)
  return entry.missionDay + (Number.isFinite(share) ? share : 0)
}

// The context the person usually measures this indicator in: the one with the
// most readings, and on a tie the one of the newest reading. Rest when there
// are no readings.
export function usualContext(entries: Entry[]): MeasurementContext {
  if (entries.length === 0) return 'rest'
  const counts = new Map<MeasurementContext, number>()
  for (const entry of entries) {
    counts.set(entry.context, (counts.get(entry.context) ?? 0) + 1)
  }
  const best = Math.max(...counts.values())
  const newest = oldestFirst(entries).reverse()
  const winner = newest.find((entry) => counts.get(entry.context) === best)
  return winner === undefined ? 'rest' : winner.context
}

// How many readings each context holds, in the order the Entry screen offers
// the contexts.
export function contextCounts(
  entries: Entry[],
): Record<MeasurementContext, number> {
  const counts = { rest: 0, after_exercise: 0, on_waking: 0, before_sleep: 0 }
  for (const entry of entries) counts[entry.context] += 1
  return counts
}

// The readings the chart draws for one context, oldest first. `last14` keeps
// the newest 14 of them, the window the baseline uses.
export function trendSeries(
  entries: Entry[],
  context: MeasurementContext,
  window: TrendWindow,
): Entry[] {
  const inContext = oldestFirst(entries.filter((e) => e.context === context))
  return window === 'all' ? inContext : inContext.slice(-WINDOW)
}

// The person's usual band: the median of the last 14 readings in the context
// and three spreads each side of it, the same window and spread the state rule
// uses. Null with fewer than 3 readings, where the rule has no baseline.
export interface TrendBand {
  median: number
  spread: number
  low: number
  high: number
}

export function trendBand(
  entries: Entry[],
  context: MeasurementContext,
  rules: AttentionRule[],
  minSpread: number,
): TrendBand | null {
  const inContext = oldestFirst(entries.filter((e) => e.context === context))
  const last = inContext[inContext.length - 1]
  if (last === undefined) return null
  // localState leaves its `latest` out of the window by identity. A copy of the
  // newest reading is a stand-in that leaves every real reading in.
  const local = localState({ ...last }, inContext, rules, minSpread)
  if (local.median === null || local.spread === null) return null
  return {
    median: local.median,
    spread: local.spread,
    low: local.median - BAND * local.spread,
    high: local.median + BAND * local.spread,
  }
}

// The thresholds the chart draws: only rows with a link as a source, the same
// rule the card follows. A row that is only an Assumption says nothing.
export function citedThresholds(rules: AttentionRule[]): AttentionRule[] {
  return rules.filter((rule) =>
    rule.sources.some((source) => source !== 'Assumption'),
  )
}

// The contexts that appear in the segmented control, in a fixed order.
export const TREND_CONTEXTS: readonly MeasurementContext[] = MEASUREMENT_CONTEXTS

// The point the arrow keys reach from `index`: one step left or right, held at
// the ends. Home and End jump to the first and the last.
export function stepIndex(
  index: number,
  count: number,
  key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
): number {
  if (count === 0) return -1
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  const next = key === 'ArrowRight' ? index + 1 : index - 1
  return Math.min(count - 1, Math.max(0, next))
}

// The index in `times` nearest to `time`; used when the arrow keys move to the
// other blood pressure series.
export function nearestIndex(times: number[], time: number): number {
  let best = -1
  let gap = Number.POSITIVE_INFINITY
  times.forEach((candidate, index) => {
    const distance = Math.abs(candidate - time)
    if (distance < gap) {
      gap = distance
      best = index
    }
  })
  return best
}
