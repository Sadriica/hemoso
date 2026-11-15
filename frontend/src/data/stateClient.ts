import type {
  IndicatorState,
  IndicatorStateName,
  StateAttention,
} from '../domain/state'
import { BASELINE_STATES } from '../domain/state'
import type { MeasurementContext } from '../domain/types'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// GET /people/{person_id}/indicators/{indicator_id}/state of docs/API.md: one
// value against that person's own baseline, computed by the backend from the
// stored history. The caller falls back to the local rule when this answers
// null, which covers no server, a network error and a status the contract does
// not name.

export interface StateQuery {
  personId: string
  indicatorId: string
  value: number
  context: MeasurementContext
  // The reading being asked about, when the caller knows its day and time: the
  // backend leaves that reading out of the window it computes. Both are
  // optional, and a backend that does not know them ignores them.
  missionDay?: number
  time?: string
}

export interface StateClient {
  // false when the demo has no server: nothing is asked and the screens use
  // the local rule.
  isConfigured(): boolean
  fetchState(query: StateQuery): Promise<IndicatorState | null>
}

export function createStateClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): StateClient {
  const baseUrl = rawBaseUrl?.trim().replace(/\/+$/, '') ?? ''
  return new HttpState(baseUrl, fetchFn)
}

class HttpState implements StateClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike) {
    this.baseUrl = baseUrl
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async fetchState(query: StateQuery): Promise<IndicatorState | null> {
    if (this.baseUrl === '') return null
    const params = new URLSearchParams({
      value: String(query.value),
      context: query.context,
    })
    // The reading's own day and time, so the backend leaves that reading out of
    // the window instead of counting it twice: it is already the value asked
    // about.
    if (query.missionDay !== undefined) {
      params.set('mission_day', String(query.missionDay))
    }
    if (query.time !== undefined) params.set('time', query.time)
    // The header of a person route: the token of that person when this device
    // has one. A person without an account keeps their routes open and sends
    // nothing.
    const token = bearerToken(query.personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`
    const url =
      `${this.baseUrl}/people/${encodeURIComponent(query.personId)}` +
      `/indicators/${encodeURIComponent(query.indicatorId)}/state?${params.toString()}`

    let response: Response
    try {
      response = await this.fetchFn(url, { method: 'GET', headers })
    } catch {
      return null
    }
    if (response.status === 401) {
      // The session of that person is gone: it leaves this device and the
      // screen asks for the PIN again. A person who sent no token has none to
      // drop. No state is invented meanwhile.
      if (token !== null) expireSession(query.personId)
      return null
    }
    if (response.status !== 200) return null
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return null
    }
    return parseIndicatorState(body)
  }
}

const STATE_NAMES: readonly string[] = [...BASELINE_STATES, 'needs_review']

// An answer that breaks the contract is no answer: the local rule then decides,
// instead of an unchecked body reaching a screen.
function parseIndicatorState(value: unknown): IndicatorState | null {
  if (typeof value !== 'object' || value === null) return null
  const body = value as Record<string, unknown>
  if (typeof body.state !== 'string' || !STATE_NAMES.includes(body.state)) {
    return null
  }
  if (!isNumberOrNull(body.median) || !isNumberOrNull(body.spread)) return null
  if (typeof body.n !== 'number' || !Number.isInteger(body.n) || body.n < 0) {
    return null
  }
  const attention = parseAttention(body.attention)
  // undefined is not a value of StateAttention: the answer has no attention
  // field at all, which the contract always sends.
  if (attention === undefined) return null
  return {
    state: body.state as IndicatorStateName,
    median: body.median,
    spread: body.spread,
    n: body.n,
    attention,
  }
}

function parseAttention(
  value: unknown,
): StateAttention | null | undefined {
  if (value === null) return null
  if (typeof value !== 'object') return undefined
  const row = value as Record<string, unknown>
  const notify = row.notify
  if (
    typeof row.attention_level !== 'string' ||
    typeof row.source !== 'string' ||
    (notify !== 'crew' && notify !== 'cmo' && notify !== 'flight_surgeon')
  ) {
    return undefined
  }
  return { level: row.attention_level, notify, source: row.source }
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}
