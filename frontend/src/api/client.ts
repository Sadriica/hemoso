import type {
  Crew,
  CrewStatus,
  Mission,
  MissionControlStatus,
  SeriesPoint,
} from './types'
import {
  MOCK_CREW,
  MOCK_MISSION,
  SNAPSHOT_DAYS,
  crewStatus,
  missionControlStatus,
  series,
} from './mock/story'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

// Screens get data only through this interface; no fetch outside HttpClient.
export interface ApiClient {
  getCrew(): Promise<Crew[]>
  getMission(): Promise<Mission>
  getCrewStatus(crewId: string, day: number): Promise<CrewStatus>
  getSeries(crewId: string, signal: string, toDay: number): Promise<SeriesPoint[]>
  getMissionControlStatus(day: number): Promise<MissionControlStatus[]>
  getDemoDays(): Promise<number[]>
  syncLink(): Promise<void>
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class HttpClient implements ApiClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn?: FetchLike) {
    // A trailing slash is stripped so `http://x/` + `/crew` is not `//crew`.
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    // Wrap fetch in an arrow so it is called with the global `this` (an
    // unbound `fetch` extracted and called with another `this` throws
    // "Illegal invocation" in browsers).
    this.fetchFn = fetchFn ?? ((input, init) => fetch(input, init))
  }

  private async send(path: string, init?: RequestInit): Promise<Response> {
    let response: Response
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`, init)
    } catch {
      throw new ApiError(0, 'Could not reach the server.')
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Request failed with status ${response.status}.`,
      )
    }
    return response
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.send(path)
    return (await response.json()) as T
  }

  getCrew(): Promise<Crew[]> {
    return this.get<Crew[]>('/crew')
  }

  getMission(): Promise<Mission> {
    return this.get<Mission>('/mission')
  }

  getCrewStatus(crewId: string, day: number): Promise<CrewStatus> {
    return this.get<CrewStatus>(
      `/crew/${encodeURIComponent(crewId)}/status?day=${day}`,
    )
  }

  getSeries(crewId: string, signal: string, toDay: number): Promise<SeriesPoint[]> {
    return this.get<SeriesPoint[]>(
      `/crew/${encodeURIComponent(crewId)}/series/${encodeURIComponent(signal)}?to=${toDay}`,
    )
  }

  getMissionControlStatus(day: number): Promise<MissionControlStatus[]> {
    return this.get<MissionControlStatus[]>(`/mission-control/status?day=${day}`)
  }

  async getDemoDays(): Promise<number[]> {
    const mission = await this.getMission()
    const days: number[] = []
    for (let day = 1; day <= mission.currentDay; day++) days.push(day)
    return days
  }

  syncLink(): Promise<void> {
    return this.send('/link/sync', { method: 'POST' }).then(() => undefined)
  }
}

export class MockClient implements ApiClient {
  // Every response is a copy, so a screen can never mutate the shared story.
  getCrew(): Promise<Crew[]> {
    return Promise.resolve(structuredClone(MOCK_CREW))
  }

  getMission(): Promise<Mission> {
    return Promise.resolve(structuredClone(MOCK_MISSION))
  }

  getCrewStatus(crewId: string, day: number): Promise<CrewStatus> {
    return Promise.resolve(structuredClone(crewStatus(crewId, day)))
  }

  getSeries(crewId: string, signal: string, toDay: number): Promise<SeriesPoint[]> {
    if (crewId !== 'crew_a') return Promise.resolve([])
    return Promise.resolve(structuredClone(series(signal, toDay)))
  }

  getMissionControlStatus(day: number): Promise<MissionControlStatus[]> {
    return Promise.resolve(structuredClone(missionControlStatus(day)))
  }

  getDemoDays(): Promise<number[]> {
    return Promise.resolve([...SNAPSHOT_DAYS])
  }

  syncLink(): Promise<void> {
    return Promise.resolve()
  }
}

export function createClient(): ApiClient {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) return new MockClient()
  return new HttpClient(baseUrl)
}
