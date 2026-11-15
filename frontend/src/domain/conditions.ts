import { attentionFor } from './attention'
import { newestFirst } from './entries'
import { localState } from './state'
import type {
  AttentionRule,
  ConditionRule,
  Entry,
  Indicator,
} from './types'

// The evidence score of a possible condition (REQ-06), computed on this device
// from the person's stored readings. It is the rule of FORMATS.md section 3,
// "How each value is compared", point 3, and of
// docs/findings/bio2-02-evidence-score.md, and it runs twice: in the backend
// (docs/API.md, GET /people/{person_id}/conditions) and here, so the panel says
// the same thing with no server.
//
// The score is evidence from what was recorded, never a probability and never
// a statement about the person: the CMO or the flight surgeon confirms.

export type ConditionLabel = 'no_data' | 'low' | 'possible' | 'review'

export interface ConditionSignal {
  indicatorId: string
  /** The side of the person's range that counts for this condition. */
  side: 'above' | 'below' | null
  /** 1, 0.5 or 0; null while the signal cannot be scored. */
  contribution: number | null
  /** The newest reading, or null when there is none. */
  value: number | null
}

export interface Condition {
  id: string
  name: string
  /** The mean of the usable signals, 0 to 1, three decimals; null with fewer than 2. */
  score: number | null
  label: ConditionLabel
  signals: ConditionSignal[]
  /** The row's link, or the word Assumption. */
  source: string
}

/** A newest reading that crossed a cited attention row on the signal's side. */
export const ATTENTION_POINT = 1
/** A newest reading outside the person's baseline on the signal's side. */
export const BASELINE_POINT = 0.5
/** Fewer usable signals than this is "not enough data", never a low score. */
export const MIN_USABLE_SIGNALS = 2
/** Decimals of the reported score, as the finding's vectors write it. */
const SCORE_DECIMALS = 3

// The label bands, closed at the lower end: exactly 0.3 is `possible` and
// exactly 0.6 is `review` (docs/API.md).
export function labelFor(score: number | null): ConditionLabel {
  if (score === null) return 'no_data'
  if (score < 0.3) return 'low'
  if (score < 0.6) return 'possible'
  return 'review'
}

/** The mean of the usable points; null with fewer than two of them. */
export function scoreFor(points: (number | null)[]): number | null {
  const usable = points.filter((point): point is number => point !== null)
  if (usable.length < MIN_USABLE_SIGNALS) return null
  return usable.reduce((sum, point) => sum + point, 0) / usable.length
}

// The point one signal adds, or null while it is not usable. `entries` are the
// person's readings of that one indicator; the newest one is scored, in its
// own context, against the readings before it (the window and the spread are
// domain/state.ts's). Only attention rows with a link count for the full
// point: a row marked Assumption never adds it, and a cited row crossed needs
// no baseline. A value on the wrong side of the condition adds 0, whatever its
// distance from the baseline.
export function signalPoint(
  entries: Entry[],
  side: 'above' | 'below' | null,
  rules: AttentionRule[],
  minSpread: number | null,
): number | null {
  const newest = newestFirst(entries)[0]
  if (newest === undefined || side === null) return null
  const cited = rules.filter(
    (rule) =>
      rule.side === side &&
      rule.sources.some((source) => source !== 'Assumption'),
  )
  if (attentionFor(newest.value, cited).kind === 'attention') {
    return ATTENTION_POINT
  }
  // An indicator with no row in indicators.csv has no noise floor, so no
  // baseline either.
  if (minSpread === null) return null
  const local = localState(newest, entries, [], minSpread)
  if (local.median === null) return null
  if (local.state !== 'outside_range') return 0
  if (side === 'above' && newest.value < local.median) return 0
  if (side === 'below' && newest.value > local.median) return 0
  return BASELINE_POINT
}

/** One row of conditions.csv, scored from one person's readings. */
export function scoreCondition(
  rule: ConditionRule,
  personEntries: Entry[],
  indicators: Indicator[],
  rules: AttentionRule[],
): Condition {
  const signals: ConditionSignal[] = rule.signals.map((signal) => {
    const own = personEntries.filter(
      (entry) => entry.indicatorId === signal.indicatorId,
    )
    const indicator = indicators.find((item) => item.id === signal.indicatorId)
    return {
      indicatorId: signal.indicatorId,
      side: signal.side,
      contribution: signalPoint(
        own,
        signal.side,
        rules.filter((item) => item.indicatorId === signal.indicatorId),
        indicator === undefined ? null : indicator.minSpread,
      ),
      value: newestFirst(own)[0]?.value ?? null,
    }
  })
  const score = scoreFor(signals.map((signal) => signal.contribution))
  return {
    id: rule.id,
    name: rule.name,
    score: score === null ? null : Number(score.toFixed(SCORE_DECIMALS)),
    // The label is read from the unrounded mean.
    label: labelFor(score),
    signals,
    source: rule.source,
  }
}

/** Every row of conditions.csv for one person, in file order. */
export function scoreConditions(
  conditionRules: ConditionRule[],
  personEntries: Entry[],
  indicators: Indicator[],
  rules: AttentionRule[],
): Condition[] {
  return conditionRules.map((rule) =>
    scoreCondition(rule, personEntries, indicators, rules),
  )
}

// The order the panel reads in: what asks for a check first, then what is
// possible, then what the readings do not point to; rows with not enough data
// come last. Inside one step the higher score comes first, then file order.
const LABEL_ORDER: Record<ConditionLabel, number> = {
  review: 0,
  possible: 1,
  low: 2,
  no_data: 3,
}

export function orderConditions(conditions: Condition[]): Condition[] {
  return conditions
    .map((condition, index) => ({ condition, index }))
    .sort(
      (a, b) =>
        LABEL_ORDER[a.condition.label] - LABEL_ORDER[b.condition.label] ||
        (b.condition.score ?? 0) - (a.condition.score ?? 0) ||
        a.index - b.index,
    )
    .map((item) => item.condition)
}
