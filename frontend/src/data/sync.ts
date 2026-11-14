import type { MissionClock } from '../domain/clock'
import type { Entry } from '../domain/types'
import type { Outbox } from './entryStore'

// Sending the outbox to the backend (REQ-27, REQ-28). The contract is
// docs/API.md: one POST per entry, oldest first, and the status code says what
// to do with that entry. A round runs in the background, so the screens never
// wait for the server.

// What a single POST means for the entry it carried.
export type SendOutcome =
  | 'sent' // 200 or 201: the server has the row
  | 'conflict' // 409: another value is stored for the same day and time
  | 'rejected' // 422: the server refused the row itself
  | 'retry' // no connection, 5xx, or a status the contract does not name

export interface SyncClient {
  // false when the demo has no server: nothing is sent and the header says so.
  isConfigured(): boolean
  send(entry: Entry): Promise<SendOutcome>
}

export type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<Response>

// A bare `fetch` called as a method throws "Illegal invocation" in browsers, so
// the default is this arrow. It reads the global at call time, which also lets
// a test replace fetch after the client is built.
const defaultFetch: FetchLike = (input, init) => fetch(input, init)

export class NoopSync implements SyncClient {
  isConfigured(): boolean {
    return false
  }

  // sendPending never asks, because it returns before the first send. The
  // answer here only satisfies the interface.
  send(): Promise<SendOutcome> {
    return Promise.resolve('retry')
  }
}

export class HttpSync implements SyncClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike = defaultFetch) {
    // Without this, a base URL that ends in a slash asks for "//entries".
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async send(entry: Entry): Promise<SendOutcome> {
    let response: Response
    try {
      response = await this.fetchFn(`${this.baseUrl}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApiEntry(entry)),
      })
    } catch {
      return 'retry'
    }
    if (response.status === 200 || response.status === 201) return 'sent'
    if (response.status === 409) return 'conflict'
    if (response.status === 422) return 'rejected'
    // A server error, or a status docs/API.md does not name. The entry stays in
    // the outbox: losing a reading matters more than sending it twice, and the
    // API keeps one row per person, indicator, day and time.
    return 'retry'
  }
}

// The app calls this once. An empty base URL is the public demo, which works
// without a server.
export function createSyncClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
): SyncClient {
  const baseUrl = rawBaseUrl?.trim() ?? ''
  return baseUrl === '' ? new NoopSync() : new HttpSync(baseUrl)
}

// The field names of docs/API.md, POST /entries.
interface ApiEntry {
  person_id: string
  indicator_id: string
  value: number
  unit: string
  mission_day: number
  time: string
}

function toApiEntry(entry: Entry): ApiEntry {
  return {
    person_id: entry.personId,
    indicator_id: entry.indicatorId,
    value: entry.value,
    unit: entry.unit,
    mission_day: entry.missionDay,
    time: entry.time,
  }
}

export interface SendRound {
  sent: number
  conflicts: number
  rejected: number
  // Still waiting when the round stopped early.
  failed: number
}

// One round over the outbox: oldest first, one entry at a time. A conflict or
// a rejected row leaves the outbox; a network problem or a server error stops
// the round and keeps the rest for the next one. Never throws.
export async function sendPending(
  outbox: Outbox,
  client: SyncClient,
  at: MissionClock,
): Promise<SendRound> {
  const round: SendRound = { sent: 0, conflicts: 0, rejected: 0, failed: 0 }
  if (!client.isConfigured()) return round

  for (const entry of [...outbox.pending()].sort(byMissionTime)) {
    let outcome: SendOutcome
    try {
      outcome = await client.send(entry)
    } catch {
      // A client that throws where the contract says 'retry' is still a
      // connection problem for this round.
      outcome = 'retry'
    }

    if (outcome === 'sent') {
      outbox.markSent([entry.id], at)
      round.sent += 1
    } else if (outcome === 'conflict') {
      outbox.markConflict(entry.id)
      round.conflicts += 1
    } else if (outcome === 'rejected') {
      outbox.markRejected(entry.id)
      round.rejected += 1
    } else {
      round.failed = outbox.pending().length
      break
    }
  }

  return round
}

// Day first, then the 24-hour time. Both are fixed-width, so comparing the time
// text orders HH:MM correctly. Entries with the same day and time keep the
// order they were saved in.
function byMissionTime(a: Entry, b: Entry): number {
  if (a.missionDay !== b.missionDay) return a.missionDay - b.missionDay
  if (a.time < b.time) return -1
  if (a.time > b.time) return 1
  return 0
}
