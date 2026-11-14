import { describe, expect, it, vi } from 'vitest'
import { LocalEntryStore } from './entryStore'
import type { Outbox } from './entryStore'
import {
  HttpSync,
  NoopSync,
  createSyncClient,
  sendPending,
  type FetchLike,
} from './sync'
import type { Entry } from '../domain/types'

const at = { missionDay: 2, time: '09:20' }

interface SentBody {
  person_id: string
  indicator_id: string
  value: number
  unit: string
  mission_day: number
  time: string
}

interface Call {
  url: string
  body: SentBody
}

// The client only reads `status`, so a plain object is enough and the test does
// not depend on the Response implementation of the test runner.
function response(status: number): Response {
  return { status } as unknown as Response
}

// A fake fetch that answers the given statuses in order and records every call.
function fakeFetch(statuses: number[]): {
  calls: Call[]
  fetchFn: FetchLike
} {
  const calls: Call[] = []
  const queue = [...statuses]
  const fetchFn: FetchLike = (url, init) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)) as SentBody,
    })
    const status = queue.shift() ?? 201
    return Promise.resolve(response(status))
  }
  return { calls, fetchFn }
}

function newEntry(
  value: number,
  missionDay: number,
  time: string,
): Omit<Entry, 'id'> {
  return {
    personId: 'demo_astronaut_1',
    indicatorId: 'hr_bpm',
    value,
    unit: 'bpm',
    missionDay,
    time,
  }
}

function outboxWith(
  ...rows: Array<Omit<Entry, 'id'>>
): LocalEntryStore & Outbox {
  const store = new LocalEntryStore({ storage: null })
  for (const row of rows) store.add(row)
  return store
}

describe('HttpSync', () => {
  it('posts one entry to /entries with the snake_case fields of the contract', async () => {
    const { calls, fetchFn } = fakeFetch([201])
    const client = new HttpSync('https://api.example.test', fetchFn)

    expect(client.isConfigured()).toBe(true)
    await expect(client.send({ ...newEntry(58, 2, '09:15'), id: 'a' })).resolves.toBe(
      'sent',
    )
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.example.test/entries')
    expect(calls[0].body).toEqual({
      person_id: 'demo_astronaut_1',
      indicator_id: 'hr_bpm',
      value: 58,
      unit: 'bpm',
      mission_day: 2,
      time: '09:15',
    })
  })

  it('drops a trailing slash from the base URL', async () => {
    const { calls, fetchFn } = fakeFetch([201])
    const client = new HttpSync('https://api.example.test/', fetchFn)
    await client.send({ ...newEntry(58, 2, '09:15'), id: 'a' })
    expect(calls[0].url).toBe('https://api.example.test/entries')
  })

  it.each([
    [200, 'sent'],
    [201, 'sent'],
    [409, 'conflict'],
    [422, 'rejected'],
    [500, 'retry'],
    [503, 'retry'],
    [404, 'retry'],
  ] as const)('reads a %i answer as %s', async (status, outcome) => {
    const { fetchFn } = fakeFetch([status])
    const client = new HttpSync('https://api.example.test', fetchFn)
    await expect(client.send({ ...newEntry(58, 2, '09:15'), id: 'a' })).resolves.toBe(
      outcome,
    )
  })

  it('asks for a retry when the request cannot be made', async () => {
    const client = new HttpSync('https://api.example.test', () =>
      Promise.reject(new Error('offline')),
    )
    await expect(client.send({ ...newEntry(58, 2, '09:15'), id: 'a' })).resolves.toBe(
      'retry',
    )
  })

  it('is not configured without a base URL', () => {
    expect(new HttpSync('', () => Promise.resolve(response(201))).isConfigured()).toBe(
      false,
    )
    expect(new HttpSync('  ').isConfigured()).toBe(false)
  })
})

describe('createSyncClient', () => {
  it('sends nothing when the base URL is empty or missing', () => {
    expect(createSyncClient('').isConfigured()).toBe(false)
    expect(createSyncClient(undefined).isConfigured()).toBe(false)
    expect(createSyncClient('  ').isConfigured()).toBe(false)
  })

  it('builds an HTTP client from a base URL with or without a trailing slash', () => {
    expect(createSyncClient('https://api.example.test').isConfigured()).toBe(true)
    expect(createSyncClient('https://api.example.test/').isConfigured()).toBe(true)
  })

  it('uses the global fetch at call time, so a client built before the stub still sends', async () => {
    const client = createSyncClient('https://api.example.test')
    const stub = vi.fn(() => Promise.resolve(response(201)))
    vi.stubGlobal('fetch', stub)
    try {
      const outbox = outboxWith(newEntry(58, 2, '09:15'))
      const round = await sendPending(outbox, client, at)
      expect(round.sent).toBe(1)
      expect(stub).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('NoopSync', () => {
  it('is never asked to send anything', async () => {
    const client = new NoopSync()
    const stub = vi.fn()
    vi.stubGlobal('fetch', stub)
    try {
      const outbox = outboxWith(newEntry(58, 2, '09:15'))
      const round = await sendPending(outbox, client, at)

      expect(client.isConfigured()).toBe(false)
      expect(round).toEqual({ sent: 0, conflicts: 0, rejected: 0, failed: 0 })
      expect(stub).not.toHaveBeenCalled()
      expect(outbox.pending()).toHaveLength(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('sendPending', () => {
  it('sends oldest first: by mission day, then by time', async () => {
    const { calls, fetchFn } = fakeFetch([201, 201, 201, 201])
    const outbox = outboxWith(
      newEntry(58, 3, '08:00'),
      newEntry(57, 1, '20:00'),
      newEntry(56, 1, '07:30'),
      newEntry(55, 1, '07:30'),
    )

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round.sent).toBe(4)
    expect(calls.map((call) => [call.body.mission_day, call.body.time])).toEqual([
      [1, '07:30'],
      [1, '07:30'],
      [1, '20:00'],
      [3, '08:00'],
    ])
    // Same day and time: the order they were saved in.
    expect(calls[0].body.value).toBe(56)
    expect(calls[1].body.value).toBe(55)
  })

  it('marks a sent entry and keeps the last sent time', async () => {
    const { fetchFn } = fakeFetch([201, 200])
    const outbox = outboxWith(newEntry(58, 2, '09:15'), newEntry(57, 2, '09:20'))

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round).toEqual({ sent: 2, conflicts: 0, rejected: 0, failed: 0 })
    expect(outbox.pending()).toEqual([])
    expect(outbox.lastSent()).toEqual(at)
    expect(outbox.list()).toHaveLength(2)
  })

  it('takes a 409 out of the outbox and keeps it in the entries', async () => {
    const { calls, fetchFn } = fakeFetch([409, 201])
    const outbox = outboxWith(newEntry(58, 2, '09:15'), newEntry(57, 2, '09:20'))

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round).toEqual({ sent: 1, conflicts: 1, rejected: 0, failed: 0 })
    // A conflict does not stop the round: the next entry still goes.
    expect(calls).toHaveLength(2)
    const snapshot = outbox.getOutboxSnapshot()
    expect(snapshot.pendingCount).toBe(0)
    expect(snapshot.conflictCount).toBe(1)
    expect(outbox.list().map((entry) => entry.value)).toEqual([58, 57])
    expect(outbox.lastSent()).toEqual(at)
  })

  it('takes a 422 out of the outbox and counts it as not accepted', async () => {
    const { fetchFn } = fakeFetch([422])
    const outbox = outboxWith(newEntry(58, 2, '09:15'))

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round).toEqual({ sent: 0, conflicts: 0, rejected: 1, failed: 0 })
    const snapshot = outbox.getOutboxSnapshot()
    expect(snapshot.pendingCount).toBe(0)
    expect(snapshot.rejectedCount).toBe(1)
    expect(outbox.lastSent()).toBeNull()
    expect(outbox.list()).toHaveLength(1)
  })

  it('keeps the entry and stops the round on a 500', async () => {
    const { calls, fetchFn } = fakeFetch([500])
    const outbox = outboxWith(
      newEntry(58, 2, '09:15'),
      newEntry(57, 2, '09:20'),
      newEntry(56, 2, '09:30'),
    )

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round).toEqual({ sent: 0, conflicts: 0, rejected: 0, failed: 3 })
    expect(calls).toHaveLength(1)
    expect(outbox.pending()).toHaveLength(3)
    expect(outbox.lastSent()).toBeNull()
  })

  it('keeps the entry and stops the round when the network fails', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('offline')))
    const outbox = outboxWith(newEntry(58, 2, '09:15'), newEntry(57, 2, '09:20'))

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round.failed).toBe(2)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(outbox.pending()).toHaveLength(2)
  })

  it('keeps the entries sent before a failure', async () => {
    const { calls, fetchFn } = fakeFetch([201, 500])
    const outbox = outboxWith(newEntry(58, 2, '09:15'), newEntry(57, 2, '09:20'))

    const round = await sendPending(
      outbox,
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )

    expect(round).toEqual({ sent: 1, conflicts: 0, rejected: 0, failed: 1 })
    expect(calls).toHaveLength(2)
    expect(outbox.pending().map((entry) => entry.value)).toEqual([57])
  })

  it('does nothing at all when there is no server', async () => {
    const stub = vi.fn()
    vi.stubGlobal('fetch', stub)
    try {
      const outbox = outboxWith(newEntry(58, 2, '09:15'))
      const round = await sendPending(outbox, createSyncClient(''), at)
      expect(round).toEqual({ sent: 0, conflicts: 0, rejected: 0, failed: 0 })
      expect(stub).not.toHaveBeenCalled()
      expect(outbox.pending()).toHaveLength(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('makes no request when the outbox is empty', async () => {
    const { calls, fetchFn } = fakeFetch([201])
    const round = await sendPending(
      outboxWith(),
      new HttpSync('https://api.example.test', fetchFn),
      at,
    )
    expect(round).toEqual({ sent: 0, conflicts: 0, rejected: 0, failed: 0 })
    expect(calls).toHaveLength(0)
  })
})
