import { attentionFor } from './attention'
import { newestFirst } from './entries'
import { localState } from './state'
import {
  newestDayReports,
  SYMPTOM_ONLY_CAP,
  symptomWeight,
  type SymptomDef,
  type SymptomReport,
} from './symptoms'
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

// `urgent` is not a band of the score: a reported red-flag symptom the row lists
// makes it, whatever the score is, and the line then reads "Call your CMO now".
export type ConditionLabel = 'no_data' | 'low' | 'possible' | 'review' | 'urgent'

export type ConditionSignal = IndicatorSignal | SymptomSignal

export interface IndicatorSignal {
  /** Left out of an indicator signal, as in the API. */
  kind?: 'indicator'
  indicatorId: string
  /** The side of the person's range that counts for this condition. */
  side: 'above' | 'below' | null
  /** 1, 0.5 or 0; null while the signal cannot be scored. */
  contribution: number | null
  /** The newest reading, or null when there is none. */
  value: number | null
}

/** A symptom the row lists and symptoms.csv defines. */
export interface SymptomSignal {
  kind: 'symptom'
  symptomId: string
  /** 0.5, or 0.25 for a shared symptom. */
  weight: number
  /** The weight when the person reported it that day; null when not. */
  contribution: number | null
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
  /** true only when a red-flag symptom the row lists was reported. */
  redFlag?: boolean
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

/** One term of the weighted mean. */
export interface ScoreTerm {
  weight: number
  /** null while the term is not usable. */
  evidence: number | null
  symptom: boolean
}

/**
 * The weighted mean of the usable terms, or null while there is no score.
 * Fewer than two usable terms is null, except with `singleBoundary` (a row that
 * lists symptoms) when the one usable term is an indicator that crossed a
 * cited limit: a crossed limit counts on its own. A mean that comes only from
 * symptoms is capped at SYMPTOM_ONLY_CAP. Same rule as backend/app/conditions.py.
 */
export function weightedScore(
  terms: ScoreTerm[],
  singleBoundary = false,
): number | null {
  const usable = terms.filter((term) => term.evidence !== null)
  if (usable.length === 0) return null
  const [only] = usable
  const alone =
    usable.length === 1 &&
    singleBoundary &&
    !only.symptom &&
    only.evidence === ATTENTION_POINT
  if (usable.length < MIN_USABLE_SIGNALS && !alone) return null
  const total = usable.reduce((sum, term) => sum + term.weight, 0)
  const score =
    usable.reduce((sum, term) => sum + term.weight * (term.evidence ?? 0), 0) / total
  return usable.every((term) => term.symptom)
    ? Math.min(score, SYMPTOM_ONLY_CAP)
    : score
}

/** The mean of the usable points; null with fewer than two of them. */
export function scoreFor(points: (number | null)[]): number | null {
  return weightedScore(
    points.map((point) => ({ weight: 1, evidence: point, symptom: false })),
  )
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

/** The symptom definitions and the person's reports; both empty turns the layer off. */
export interface SymptomLayer {
  defs: SymptomDef[]
  /** Reports of this person, any day; only the newest day counts. */
  reports: SymptomReport[]
}

const NO_SYMPTOMS: SymptomLayer = { defs: [], reports: [] }

/** One row of conditions.csv, scored from one person's readings and reports. */
export function scoreCondition(
  rule: ConditionRule,
  personEntries: Entry[],
  indicators: Indicator[],
  rules: AttentionRule[],
  layer: SymptomLayer = NO_SYMPTOMS,
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
  const terms: ScoreTerm[] = signals.map((signal) => ({
    weight: 1,
    evidence: signal.contribution,
    symptom: false,
  }))

  // A symptom counts once, on the newest day that holds any report. One the
  // person did not report is listed with no contribution and stays out of both
  // sums; an id symptoms.csv does not define is left out altogether.
  const today = newestDayReports(layer.reports)
  const reported = new Set(today.map((report) => report.symptomId))
  let redFlag = false
  for (const symptomId of rule.symptoms) {
    const def = layer.defs.find((item) => item.id === symptomId)
    if (def === undefined) continue
    const weight = symptomWeight(def)
    const present = reported.has(symptomId)
    if (present && def.redFlag) redFlag = true
    signals.push({
      kind: 'symptom',
      symptomId,
      weight,
      contribution: present ? weight : null,
    })
    terms.push({ weight, evidence: present ? 1 : null, symptom: true })
  }

  const score = weightedScore(terms, rule.symptoms.length > 0)
  return {
    id: rule.id,
    name: rule.name,
    score: score === null ? null : Number(score.toFixed(SCORE_DECIMALS)),
    // The label is read from the unrounded mean; a red flag outranks it.
    label: redFlag ? 'urgent' : labelFor(score),
    signals,
    source: rule.source,
    ...(redFlag ? { redFlag: true } : {}),
  }
}

/** Every row of conditions.csv for one person, in file order. */
export function scoreConditions(
  conditionRules: ConditionRule[],
  personEntries: Entry[],
  indicators: Indicator[],
  rules: AttentionRule[],
  layer: SymptomLayer = NO_SYMPTOMS,
): Condition[] {
  return conditionRules.map((rule) =>
    scoreCondition(rule, personEntries, indicators, rules, layer),
  )
}

// The order the panel reads in: what asks for a check first, then what is
// possible, then what the readings do not point to; rows with not enough data
// come last. Inside one step the higher score comes first, then file order.
const LABEL_ORDER: Record<ConditionLabel, number> = {
  urgent: 0,
  review: 1,
  possible: 2,
  low: 3,
  no_data: 4,
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
