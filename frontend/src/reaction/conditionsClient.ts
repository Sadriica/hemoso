import { bearerToken, expireSession } from '../data/session'
import { defaultFetch, type FetchLike } from '../data/sync'
import { PSYCHOLOGICAL_CONDITION_ID } from './ids'

// GET /people/{person_id}/conditions of docs/API.md: the evidence score of
// every possible condition of config/rules/conditions.csv, computed by the
// backend from what the person recorded. The route is not deployed yet (the
// backend is paused): an answer other than 200 is no answer, and the status
// phase then shows no state at all instead of an invented one.

export type ConditionLabel = 'no_data' | 'low' | 'possible' | 'review'

export interface ConditionSignal {
  indicatorId: string
  /** The side of the person's range that counts for this condition. */
  side: 'above' | 'below' | null
  /** 1, 0.5 or 0; null while the signal cannot be scored. */
  contribution: number | null
  value: number | null
}

export interface Condition {
  id: string
  name: string
  /** The mean of the usable signals, 0 to 1; null with fewer than 2. */
  score: number | null
  label: ConditionLabel
  signals: ConditionSignal[]
  source: string
}

export interface ConditionsClient {
  /** false when the demo has no server: nothing is asked and nothing shows. */
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

const LABELS: readonly string[] = ['no_data', 'low', 'possible', 'review']

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
  }
}

function parseSignals(value: unknown): ConditionSignal[] | null {
  if (!Array.isArray(value)) return null
  const signals: ConditionSignal[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) return null
    const signal = row as Record<string, unknown>
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

/** The condition the status phase shows, out of a whole answer. */
export function psychologicalCondition(
  conditions: Condition[],
): Condition | null {
  return (
    conditions.find((item) => item.id === PSYCHOLOGICAL_CONDITION_ID) ?? null
  )
}
