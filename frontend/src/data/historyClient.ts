import { isClockTime, isMissionDay } from '../domain/clock'
import { DEFAULT_CONTEXT, isMeasurementContext } from '../domain/context'
import type { Entry } from '../domain/types'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// GET /people/{person_id}/indicators/{indicator_id}/history of docs/API.md: one
// person's earlier entries for one indicator, oldest first. The app reads them
// so a second device shows the readings it never made (REQ-27). A null answer
// covers no server, a network error and a body the contract does not name; the
// screens then show what this device holds.

export interface HistoryQuery {
  personId: string
  indicatorId: string
}

export interface HistoryClient {
  // false when the demo has no server: nothing is asked and the screens keep
  // the entries of this device.
  isConfigured(): boolean
  fetchHistory(query: HistoryQuery): Promise<Entry[] | null>
}

export function createHistoryClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): HistoryClient {
  const baseUrl = rawBaseUrl?.trim().replace(/\/+$/, '') ?? ''
  return new HttpHistory(baseUrl, fetchFn)
}

class HttpHistory implements HistoryClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike) {
    this.baseUrl = baseUrl
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async fetchHistory(query: HistoryQuery): Promise<Entry[] | null> {
    if (this.baseUrl === '') return null
    const url =
      `${this.baseUrl}/people/${encodeURIComponent(query.personId)}` +
      `/indicators/${encodeURIComponent(query.indicatorId)}/history`
    // The header of a person route: the token of that person when this device
    // has one. A person without an account keeps their routes open and sends
    // nothing.
    const token = bearerToken(query.personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`

    let response: Response
    try {
      response = await this.fetchFn(url, { method: 'GET', headers })
    } catch {
      return null
    }
    if (response.status === 401) {
      // The session of that person is gone: it leaves this device and the
      // screen asks for the PIN again. The screens then show what this device
      // holds, which is the same rule as a failed request.
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
    return parseHistory(body)
  }
}

// The field names of docs/API.md, GET .../history.
interface ApiEntry {
  person_id: string
  indicator_id: string
  value: number
  unit: string
  mission_day: number
  time: string
  context?: string
}

// The longest id and unit the contract names, in characters.
const MAX_LENGTH = 64

// Every row of the array follows the contract, or the whole answer is no
// answer: one bad row would reach the history table as a reading nobody made.
function parseHistory(value: unknown): Entry[] | null {
  if (!Array.isArray(value)) return null
  const entries: Entry[] = []
  for (const item of value) {
    const entry = parseEntry(item)
    if (entry === null) return null
    entries.push(entry)
  }
  return entries
}

function parseEntry(value: unknown): Entry | null {
  if (typeof value !== 'object' || value === null) return null
  const row: ApiEntry = value as ApiEntry
  const personId: unknown = row.person_id
  const indicatorId: unknown = row.indicator_id
  const reading: unknown = row.value
  const unit: unknown = row.unit
  const missionDay: unknown = row.mission_day
  const time: unknown = row.time
  if (!isShortText(personId) || !isShortText(indicatorId)) return null
  if (typeof reading !== 'number' || !Number.isFinite(reading)) return null
  if (!isShortText(unit)) return null
  if (!isMissionDay(missionDay)) return null
  if (typeof time !== 'string' || !isClockTime(time)) return null
  // The API always sends the context; a body without it is a rest reading, as
  // the contract's default says.
  const context: unknown =
    row.context === undefined ? DEFAULT_CONTEXT : row.context
  if (!isMeasurementContext(context)) return null
  return {
    id: remoteId(personId, indicatorId, missionDay, time),
    personId,
    indicatorId,
    value: reading,
    unit,
    missionDay,
    time,
    context,
  }
}

// A stored entry has an id the app assigned. For a row read from the server
// the four fields the backend keeps one entry per make it, so reading the same
// history again sends the same ids to the store.
function remoteId(
  personId: string,
  indicatorId: string,
  missionDay: number,
  time: string,
): string {
  return `server:${personId}:${indicatorId}:${missionDay}:${time}`
}

function isShortText(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= MAX_LENGTH
  )
}
