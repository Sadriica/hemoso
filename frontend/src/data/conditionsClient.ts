import type {
  Condition,
  ConditionLabel,
  ConditionSignal,
} from '../domain/conditions'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// GET /people/{person_id}/conditions of docs/API.md: the evidence score of
// every possible condition of config/rules/conditions.csv, computed by the
// backend from what the person recorded. An answer other than 200 is no
// answer: the panel then shows the same score computed on this device
// (domain/conditions.ts), never an invented one.

export type { Condition, ConditionLabel, ConditionSignal }

export interface ConditionsClient {
  /** false when the demo has no server: nothing is asked. */
  isConfigured(): boolean
  fetchConditions(personId: string): Promise<Condition[] | null>
}

export function createConditionsClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): ConditionsClient {
  const baseUrl = rawBaseUrl?.trim().replace(/\/+$/, '') ?? ''
  return new HttpConditions(baseUrl, fetchFn)
}

class HttpConditions implements ConditionsClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike) {
    this.baseUrl = baseUrl
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async fetchConditions(personId: string): Promise<Condition[] | null> {
    if (this.baseUrl === '') return null
    // The same header as the other person routes: the token of that person
    // when this device has one.
    const token = bearerToken(personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`
    const url = `${this.baseUrl}/people/${encodeURIComponent(personId)}/conditions`

    let response: Response
    try {
      response = await this.fetchFn(url, { method: 'GET', headers })
    } catch {
      return null
    }
    if (response.status === 401) {
      // That person's session is gone: it leaves this device and the sign-in
      // asks for the PIN again. No state is invented meanwhile.
      if (token !== null) expireSession(personId)
      return null
    }
    if (response.status !== 200) return null
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return null
    }
    return parseConditions(body)
  }
}

const LABELS: readonly string[] = [
  'no_data',
  'low',
  'possible',
  'review',
  'urgent',
]

function parseConditions(value: unknown): Condition[] | null {
  if (!Array.isArray(value)) return null
  const conditions: Condition[] = []
  for (const row of value) {
    const condition = parseCondition(row)
    // One row that breaks the contract makes the whole answer unusable: a
    // screen never shows an unchecked body.
    if (condition === null) return null
    conditions.push(condition)
  }
  return conditions
}

function parseCondition(value: unknown): Condition | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  if (typeof row.condition_id !== 'string' || typeof row.name !== 'string') {
    return null
  }
  if (typeof row.label !== 'string' || !LABELS.includes(row.label)) return null
  if (!isNumberOrNull(row.score)) return null
  if (typeof row.source !== 'string') return null
  const signals = parseSignals(row.signals)
  if (signals === null) return null
  return {
    id: row.condition_id,
    name: row.name,
    score: row.score,
    label: row.label as ConditionLabel,
    signals,
    source: row.source,
    // Left out of the answer unless true, as in docs/API.md.
    ...(row.red_flag === true ? { redFlag: true } : {}),
  }
}

function parseSignals(value: unknown): ConditionSignal[] | null {
  if (!Array.isArray(value)) return null
  const signals: ConditionSignal[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) return null
    const signal = row as Record<string, unknown>
    if (signal.kind === 'symptom') {
      // A symptom signal: the report of the day, its weight and its term.
      if (typeof signal.symptom_id !== 'string') return null
      if (typeof signal.weight !== 'number' || !Number.isFinite(signal.weight)) {
        return null
      }
      if (!isNumberOrNull(signal.contribution)) return null
      signals.push({
        kind: 'symptom',
        symptomId: signal.symptom_id,
        weight: signal.weight,
        contribution: signal.contribution,
      })
      continue
    }
    if (typeof signal.indicator_id !== 'string') return null
    const side = signal.side
    if (side !== null && side !== 'above' && side !== 'below') return null
    if (!isNumberOrNull(signal.contribution)) return null
    if (!isNumberOrNull(signal.value)) return null
    signals.push({
      indicatorId: signal.indicator_id,
      side,
      contribution: signal.contribution,
      value: signal.value,
    })
  }
  return signals
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}
