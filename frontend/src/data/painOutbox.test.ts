import { beforeEach, describe, expect, it } from 'vitest'
import { createPainClient, HttpPain } from './painClient'
import {
  dropPainReport,
  enqueuePainReport,
  painOutboxSnapshot,
  pendingPainItems,
  sendPendingPain,
  subscribePainOutbox,
} from './painOutbox'
import { readPainReports, removePainReport, savePainReport, type PainStorage } from './painStore'
import type { FetchLike } from './sync'

// One map behind both keys, as localStorage is: the reports and what they owe
// the server share a device.
function memoryStorage(): PainStorage & { raw(key: string): string | null } {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    raw: (key) => data.get(key) ?? null,
  }
}

const REPORT = {
  personId: 'astro_1',
  missionDay: 5,
  time: '10:00',
  regions: [
    { regionId: 'left_knee', kind: 'pain' as const, intensity: 4 },
    { regionId: 'right_ankle', kind: 'swelling' as const, intensity: 2 },
  ],
  note: 'after the treadmill',
}

interface Call {
  url: string
  body: Record<string, unknown>
}

// A fake fetch that answers the given statuses in order and records every call.
// An Error in the list is a connection that could not be made.
function fakeFetch(results: Array<number | Error>): {
  calls: Call[]
  fetchFn: FetchLike
} {
  const calls: Call[] = []
  const queue = [...results]
  const fetchFn: FetchLike = (url, init) => {
    calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> })
    const next = queue.shift() ?? 201
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve({ status: next } as unknown as Response)
  }
  return { calls, fetchFn }
}

function client(fetchFn: FetchLike) {
  return new HttpPain('https://api.example.test', fetchFn)
}

describe('saving a report queues it for the server', () => {
  it('queues one item per region of the report', () => {
    const storage = memoryStorage()
    savePainReport(REPORT, storage)
    const pending = pendingPainItems(REPORT.personId, storage)
    expect(pending.map((item) => item.regionId)).toEqual(['left_knee', 'right_ankle'])
    expect(pending[0]).toMatchObject({
      personId: 'astro_1',
      kind: 'pain',
      intensity: 4,
      missionDay: 5,
      time: '10:00',
      note: 'after the treadmill',
    })
    expect(painOutboxSnapshot(REPORT.personId, storage)).toEqual({
      pendingCount: 2,
      refusedCount: 0,
      serverMissing: false,
    })
  })

  it('does not queue the same person, region, day and time twice', () => {
    const storage = memoryStorage()
    const { report } = savePainReport(REPORT, storage)
    expect(enqueuePainReport(report, storage)).toBe(0)
    expect(pendingPainItems(REPORT.personId, storage)).toHaveLength(2)
  })

  it('tells the app after every change, which is what starts a round', () => {
    const storage = memoryStorage()
    let changes = 0
    const stop = subscribePainOutbox(() => {
      changes += 1
    })
    savePainReport(REPORT, storage)
    dropPainReport('nothing', storage)
    stop()
    expect(changes).toBe(1)
  })

  it('forgets what a deleted report still owed', () => {
    const storage = memoryStorage()
    const { report } = savePainReport(REPORT, storage)
    expect(removePainReport(report.id, storage)).toBe(true)
    expect(pendingPainItems(REPORT.personId, storage)).toEqual([])
    expect(readPainReports(REPORT.personId, storage)).toEqual([])
  })
})

describe('sendPendingPain', () => {
  let storage: ReturnType<typeof memoryStorage>

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('sends one request per region, day and time first, and empties the outbox', async () => {
    savePainReport(REPORT, storage)
    savePainReport({ ...REPORT, missionDay: 3, time: '08:00' }, storage)
    const { calls, fetchFn } = fakeFetch([201, 200, 201, 200])

    const round = await sendPendingPain(client(fetchFn), REPORT.personId, storage)

    expect(round).toEqual({ sent: 4, refused: 0, pending: 0, serverMissing: false })
    expect(calls.map((call) => call.body.region_id)).toEqual([
      'left_knee',
      'right_ankle',
      'left_knee',
      'right_ankle',
    ])
    expect(calls[0].body).toEqual({
      region_id: 'left_knee',
      kind: 'pain',
      intensity: 4,
      mission_day: 3,
      time: '08:00',
      note: 'after the treadmill',
    })
    expect(calls.every((call) => call.url === 'https://api.example.test/people/astro_1/pain')).toBe(
      true,
    )
    expect(pendingPainItems(REPORT.personId, storage)).toEqual([])
  })

  it('keeps a report the server holds another value for, and stops retrying it', async () => {
    const { report } = savePainReport(REPORT, storage)
    const first = fakeFetch([409, 409])
    const round = await sendPendingPain(client(first.fetchFn), REPORT.personId, storage)

    expect(round).toEqual({ sent: 0, refused: 2, pending: 0, serverMissing: false })
    // Kept on the device: the astronaut can still read what they marked.
    expect(readPainReports(REPORT.personId, storage).map((kept) => kept.id)).toEqual([report.id])
    expect(painOutboxSnapshot(REPORT.personId, storage).refusedCount).toBe(2)

    // A second round asks nothing: the answer cannot change by asking again.
    const second = fakeFetch([])
    await sendPendingPain(client(second.fetchFn), REPORT.personId, storage)
    expect(second.calls).toHaveLength(0)
  })

  it('keeps a report the server refused and does not retry it either', async () => {
    savePainReport(REPORT, storage)
    const round = await sendPendingPain(
      client(fakeFetch([422, 422]).fetchFn),
      REPORT.personId,
      storage,
    )
    expect(round.refused).toBe(2)
    expect(pendingPainItems(REPORT.personId, storage)).toEqual([])
    expect(readPainReports(REPORT.personId, storage)).toHaveLength(1)
  })

  it('waits for a server that does not have the route yet, and asks again later', async () => {
    savePainReport(REPORT, storage)
    const before = fakeFetch([404])
    const waiting = await sendPendingPain(
      client(before.fetchFn),
      REPORT.personId,
      storage,
    )

    // One answer is enough: the rest of the round would get the same 404.
    expect(before.calls).toHaveLength(1)
    expect(waiting).toEqual({ sent: 0, refused: 0, pending: 2, serverMissing: true })
    expect(painOutboxSnapshot(REPORT.personId, storage)).toEqual({
      pendingCount: 2,
      refusedCount: 0,
      serverMissing: true,
    })
    // The report is still on the device, exactly as saved.
    expect(readPainReports(REPORT.personId, storage)).toHaveLength(1)

    // The API is deployed: the next round sends what waited and clears the mark.
    const after = fakeFetch([201, 201])
    const sent = await sendPendingPain(client(after.fetchFn), REPORT.personId, storage)
    expect(sent).toEqual({ sent: 2, refused: 0, pending: 0, serverMissing: false })
  })

  it('reads 405 as the same missing route', async () => {
    savePainReport(REPORT, storage)
    const round = await sendPendingPain(
      client(fakeFetch([405]).fetchFn),
      REPORT.personId,
      storage,
    )
    expect(round.serverMissing).toBe(true)
    expect(round.pending).toBe(2)
  })

  it('keeps everything waiting after a connection problem', async () => {
    savePainReport(REPORT, storage)
    const { calls, fetchFn } = fakeFetch([new Error('offline')])
    const round = await sendPendingPain(client(fetchFn), REPORT.personId, storage)
    expect(calls).toHaveLength(1)
    expect(round).toEqual({ sent: 0, refused: 0, pending: 2, serverMissing: false })
  })

  it('sends nothing for another person, so the demo stays on this device', async () => {
    savePainReport(REPORT, storage)
    const { calls, fetchFn } = fakeFetch([201])
    const round = await sendPendingPain(client(fetchFn), 'demo_astronaut_1', storage)
    expect(calls).toHaveLength(0)
    expect(round.sent).toBe(0)
    expect(pendingPainItems(REPORT.personId, storage)).toHaveLength(2)
  })

  it('makes no request and keeps the reports without a base URL', async () => {
    savePainReport(REPORT, storage)
    const { calls, fetchFn } = fakeFetch([201])
    const round = await sendPendingPain(createPainClient('', fetchFn), REPORT.personId, storage)
    expect(calls).toHaveLength(0)
    expect(round.pending).toBe(2)
    expect(readPainReports(REPORT.personId, storage)).toHaveLength(1)
  })

  it('does nothing without a storage to read the outbox from', async () => {
    const { calls, fetchFn } = fakeFetch([201])
    const round = await sendPendingPain(client(fetchFn), REPORT.personId, null)
    expect(calls).toHaveLength(0)
    expect(round).toEqual({ sent: 0, refused: 0, pending: 0, serverMissing: false })
  })
})
