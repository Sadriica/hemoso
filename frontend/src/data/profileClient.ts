import { isIsoDate } from './missionStart'
import { bearerToken, expireSession } from './session'
import { defaultFetch, type FetchLike } from './sync'

// The mission start of an account (REQ-37): the date Flight Day 1 counts from,
// stored with the account so every device reads the same one. docs/API.md:
//
//   GET /people/{person_id}/profile  -> 200 {person_id, mission_start},
//                                       404 when the person has no account;
//   PUT /people/{person_id}/mission_start {mission_start} -> 200 with the same
//                                       object, 422 when the date breaks a rule.
//
// A server deployed before these routes answers 404 to both, which reads as
// "this route is not there": the device keeps its own copy and nothing is shown.
// A null base URL is the public demo: the device copy is the only one.

export interface PersonProfile {
  personId: string
  /** `YYYY-MM-DD`, or null while the account holds no date. */
  missionStart: string | null
}

// What one read of the profile says. `missing` covers the 404 of a person
// without an account and the 404 of a server that does not have the route yet:
// both mean this device's copy is the only one there is.
export type ProfileAnswer =
  | { kind: 'found'; profile: PersonProfile }
  | { kind: 'missing' }
  | { kind: 'retry' }

export interface ProfileClient {
  // false in the public demo: nothing is asked, nothing is sent.
  isConfigured(): boolean
  fetchProfile(personId: string): Promise<ProfileAnswer>
  // true when the server now holds this date.
  saveMissionStart(personId: string, date: string): Promise<boolean>
}

export class NoopProfile implements ProfileClient {
  isConfigured(): boolean {
    return false
  }

  fetchProfile(): Promise<ProfileAnswer> {
    return Promise.resolve({ kind: 'missing' })
  }

  saveMissionStart(): Promise<boolean> {
    return Promise.resolve(false)
  }
}

export class HttpProfile implements ProfileClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike = defaultFetch) {
    // Without this, a base URL that ends in a slash asks for "//profile".
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async fetchProfile(personId: string): Promise<ProfileAnswer> {
    const token = bearerToken(personId)
    const headers: Record<string, string> = {}
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(personId)}/profile`,
        { method: 'GET', headers },
      )
    } catch {
      return { kind: 'retry' }
    }
    // Both mean the route answers nothing this device can use; the screens ask
    // no question and keep the date they have.
    if (response.status === 404 || response.status === 405) return { kind: 'missing' }
    if (response.status === 401) {
      if (token !== null) expireSession(personId)
      return { kind: 'retry' }
    }
    if (response.status !== 200) return { kind: 'retry' }
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { kind: 'retry' }
    }
    return readProfile(body, personId)
  }

  async saveMissionStart(personId: string, date: string): Promise<boolean> {
    const token = bearerToken(personId)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token !== null) headers.Authorization = `Bearer ${token}`
    let response: Response
    try {
      response = await this.fetchFn(
        `${this.baseUrl}/people/${encodeURIComponent(personId)}/mission_start`,
        { method: 'PUT', headers, body: JSON.stringify({ mission_start: date }) },
      )
    } catch {
      return false
    }
    if (response.status === 401) {
      if (token !== null) expireSession(personId)
      return false
    }
    return response.status === 200
  }
}

export function createProfileClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): ProfileClient {
  const baseUrl = rawBaseUrl?.trim() ?? ''
  return baseUrl === '' ? new NoopProfile() : new HttpProfile(baseUrl, fetchFn)
}

// The body of GET /people/{person_id}/profile. A row that names another person,
// or a date that is not a real calendar date, is no answer: the screens keep
// the copy they have instead of a date they cannot show.
function readProfile(value: unknown, personId: string): ProfileAnswer {
  if (typeof value !== 'object' || value === null) return { kind: 'retry' }
  const body = value as Record<string, unknown>
  if (body.person_id !== undefined && body.person_id !== personId) return { kind: 'retry' }
  const { mission_start: missionStart } = body
  if (missionStart === undefined || missionStart === null) {
    return { kind: 'found', profile: { personId, missionStart: null } }
  }
  if (typeof missionStart !== 'string' || !isIsoDate(missionStart)) return { kind: 'retry' }
  return { kind: 'found', profile: { personId, missionStart } }
}
