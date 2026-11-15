import type { PainOutboxItem } from './painOutbox'
import { INJURY_KINDS, type ServerPainReport } from './painStore'
import { isClockTime } from '../domain/clock'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// The two pain routes of docs/API.md (REQ-37, B-3): POST /people/{id}/pain
// stores one report of one region, GET /people/{id}/pain reads them back, so a
// second device shows the reports the first one made. Nothing here reads the
// intensity: what it means is for the CMO or the flight surgeon to say.
//
// A null base URL is the public demo: no request is made and the reports stay
// on the device.

// What one POST means for the report it carried.
export type PainSendOutcome =
  | 'sent' // 200 or 201: the server has the report
  | 'conflict' // 409: the same person, region, day and time hold another report
  | 'rejected' // 422: the server refused the report itself
  | 'unavailable' // 404 or 405: this server does not have the route yet
  | 'unauthorized' // 401: the token of that person is gone or expired
  | 'retry' // no connection, 5xx, or a status the contract does not name

export interface PainClient {
  // false in the public demo: nothing is sent and nothing is asked.
  isConfigured(): boolean
  send(item: PainOutboxItem): Promise<PainSendOutcome>
  // null covers no server, a network error, an answer the contract does not
  // name, and a person with no report; the device keeps what it has.
  fetchReports(personId: string): Promise<ServerPainReport[] | null>
}

export class NoopPain implements PainClient {
  isConfigured(): boolean {
    return false
  }

  // sendPendingPain never asks, because it returns before the first send, and
  // the screen reads no reports: these answers only satisfy the interface.
  send(): Promise<PainSendOutcome> {
    return Promise.resolve('retry')
  }

  fetchReports(): Promise<ServerPainReport[] | null> {
    return Promise.resolve(null)
  }
}

export class HttpPain implements PainClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike = defaultFetch) {
    // Without this, a base URL that ends in a slash asks for "//pain".
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async send(item: PainOutboxItem): Promise<PainSendOutcome> {
    // A person with an account sends their own token; a person without one
    // keeps the route open and sends nothing.
    const token = bearerToken(item.personId)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(item.personId)}/pain`,
        { method: 'POST', headers, body: JSON.stringify(toApiReport(item)) },
      )
    } catch {
      return 'retry'
    }
    if (response.status === 200 || response.status === 201) return 'sent'
    if (response.status === 409) return 'conflict'
    if (response.status === 422) return 'rejected'
    // 404 and 405 both mean this server does not have the route yet, which is
    // what a frontend deployed before the API looks like.
    if (response.status === 404 || response.status === 405) return 'unavailable'
    if (response.status === 401) {
      // The session on this device is no longer accepted, exactly as with the
      // entry outbox: it leaves and the screen asks for the PIN again.
      if (token !== null) expireSession(item.personId)
      return 'unauthorized'
    }
    // A server error, a rate limit or a status the contract does not name. The
    // report stays in the outbox: losing it matters more than sending it twice,
    // and the route keeps one row per person, region, day and time.
    return 'retry'
  }

  async fetchReports(personId: string): Promise<ServerPainReport[] | null> {
    if (this.baseUrl === '') return null
    const token = bearerToken(personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(personId)}/pain`,
        { method: 'GET', headers },
      )
    } catch {
      return null
    }
    if (response.status !== 200) return null
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return null
    }
    if (!Array.isArray(body)) return null
    const reports = body.map((row) => readReport(row, personId))
    if (reports.some((report) => report === null)) return null
    return reports as ServerPainReport[]
  }
}

export function createPainClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): PainClient {
  const baseUrl = rawBaseUrl?.trim() ?? ''
  return baseUrl === '' ? new NoopPain() : new HttpPain(baseUrl, fetchFn)
}

// The field names of docs/API.md, POST /people/{person_id}/pain.
interface ApiPainReport {
  region_id: string
  kind: string
  intensity: number
  mission_day: number
  time: string
  note?: string
}

function toApiReport(item: PainOutboxItem): ApiPainReport {
  const report: ApiPainReport = {
    region_id: item.regionId,
    kind: item.kind,
    intensity: item.intensity,
    mission_day: item.missionDay,
    time: item.time,
  }
  // The note is optional in the contract, so an empty one is left out instead
  // of being stored as an empty string.
  if (item.note !== '') report.note = item.note
  return report
}

// One row of GET /people/{person_id}/pain, or null when the body breaks the
// contract: a row this app cannot read is no row, never a guessed one.
function readReport(value: unknown, personId: string): ServerPainReport | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  if (row.person_id !== undefined && row.person_id !== personId) return null
  const { region_id, kind, intensity, mission_day, time, note } = row
  if (typeof region_id !== 'string' || region_id === '') return null
  // A report stored before the field existed reads as pain.
  const injury = kind === undefined || kind === null ? 'pain' : kind
  if (typeof injury !== 'string' || !(INJURY_KINDS as readonly string[]).includes(injury)) {
    return null
  }
  if (typeof intensity !== 'number' || !Number.isInteger(intensity)) return null
  if (intensity < 0 || intensity > 10) return null
  if (typeof mission_day !== 'number' || !Number.isInteger(mission_day)) return null
  if (mission_day < 1) return null
  if (typeof time !== 'string' || !isClockTime(time)) return null
  if (note !== undefined && note !== null && typeof note !== 'string') return null
  return {
    personId,
    regionId: region_id,
    kind: injury as ServerPainReport['kind'],
    intensity,
    missionDay: mission_day,
    time,
    note: typeof note === 'string' && note.trim() !== '' ? note : null,
  }
}
