import { isMissionDay } from '../domain/clock'
import { readSymptomReport, type SymptomReport } from '../domain/symptoms'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// The two symptom routes of docs/API.md (T-79): POST /people/{id}/symptoms
// stores one report, GET /people/{id}/symptoms reads them back, so a second
// device shows the reports the first one made. Nothing here reads the
// severity: what it means is for the CMO or the flight surgeon to say.
//
// A null base URL is the public demo: no request is made and the reports stay
// on the device.

export type SymptomSendOutcome =
  | 'sent' // 200 or 201: the server has the report
  | 'conflict' // 409: the same person, day, time and symptom hold another severity
  | 'rejected' // 422: the server refused the report itself
  | 'unavailable' // 404 or 405: this server does not have the route yet
  | 'unauthorized' // 401: the token of that person is gone or expired
  | 'retry' // no connection, 5xx, or a status the contract does not name

export interface SymptomClient {
  isConfigured(): boolean
  send(report: SymptomReport): Promise<SymptomSendOutcome>
  /** null covers no server, a network error and an answer the contract does not name. */
  fetchReports(personId: string): Promise<SymptomReport[] | null>
}

export class NoopSymptoms implements SymptomClient {
  isConfigured(): boolean {
    return false
  }

  send(): Promise<SymptomSendOutcome> {
    return Promise.resolve('retry')
  }

  fetchReports(): Promise<SymptomReport[] | null> {
    return Promise.resolve(null)
  }
}

export class HttpSymptoms implements SymptomClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike = defaultFetch) {
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async send(report: SymptomReport): Promise<SymptomSendOutcome> {
    const token = bearerToken(report.personId)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(report.personId)}/symptoms`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            symptom_id: report.symptomId,
            severity: report.severity,
            mission_day: report.missionDay,
            time: report.time,
          }),
        },
      )
    } catch {
      return 'retry'
    }
    if (response.status === 200 || response.status === 201) return 'sent'
    if (response.status === 409) return 'conflict'
    if (response.status === 422) return 'rejected'
    if (response.status === 404 || response.status === 405) return 'unavailable'
    if (response.status === 401) {
      if (token !== null) expireSession(report.personId)
      return 'unauthorized'
    }
    // A server error, a rate limit or a status the contract does not name. The
    // report stays in the outbox; the route keeps one row per key.
    return 'retry'
  }

  async fetchReports(personId: string): Promise<SymptomReport[] | null> {
    if (this.baseUrl === '') return null
    const token = bearerToken(personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(personId)}/symptoms`,
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
    const reports: SymptomReport[] = []
    for (const row of body) {
      const report = readRow(row, personId)
      // A row this app cannot read is no row, and the answer is not trusted.
      if (report === null) return null
      reports.push(report)
    }
    return reports
  }
}

export function createSymptomClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): SymptomClient {
  const baseUrl = rawBaseUrl?.trim() ?? ''
  return baseUrl === '' ? new NoopSymptoms() : new HttpSymptoms(baseUrl, fetchFn)
}

function readRow(value: unknown, personId: string): SymptomReport | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  if (row.person_id !== undefined && row.person_id !== personId) return null
  if (!isMissionDay(row.mission_day)) return null
  return readSymptomReport({
    personId,
    symptomId: row.symptom_id,
    severity: row.severity,
    missionDay: row.mission_day,
    time: row.time,
  })
}
