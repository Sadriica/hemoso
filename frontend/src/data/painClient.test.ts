import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPainClient, HttpPain } from './painClient'
import type { PainOutboxItem } from './painOutbox'
import { saveSession, watchExpired } from './session'
import type { FetchLike } from './sync'

const item: PainOutboxItem = {
  id: 'demo_astronaut_1\u0000left_knee\u00002\u000009:15',
  reportId: 'report-1',
  personId: 'demo_astronaut_1',
  regionId: 'left_knee',
  kind: 'pain',
  intensity: 4,
  missionDay: 2,
  time: '09:15',
  note: 'After the treadmill run',
}

interface Call {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

// The client reads `status` and `json()` only, so a plain object is enough and
// the test does not depend on the Response implementation of the test runner.
function answer(status: number, body?: unknown): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// A fake fetch that answers the given results in order and records every call.
// An Error in the list is a connection that could not be made.
function fakeFetch(results: Array<Response | Error>): {
  calls: Call[]
  fetchFn: FetchLike
} {
  const calls: Call[] = []
  const queue = [...results]
  const fetchFn: FetchLike = (url, init) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    })
    const next = queue.shift() ?? answer(201)
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve(next)
  }
  return { calls, fetchFn }
}

const row = {
  person_id: 'demo_astronaut_1',
  region_id: 'left_knee',
  kind: 'pain',
  intensity: 4,
  mission_day: 2,
  time: '09:15',
  note: 'After the treadmill run',
}

describe('HttpPain.send', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  it('posts one report of one region with the snake_case fields of the contract', async () => {
    const { calls, fetchFn } = fakeFetch([answer(201, row)])
    const client = new HttpPain('https://api.example.test/', fetchFn)

    await expect(client.send(item)).resolves.toBe('sent')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('https://api.example.test/people/demo_astronaut_1/pain')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].body).toEqual({
      region_id: 'left_knee',
      kind: 'pain',
      intensity: 4,
      mission_day: 2,
      time: '09:15',
      note: 'After the treadmill run',
    })
    // No account on this device: the demo route stays open and no header goes.
    expect(calls[0].headers.Authorization).toBeUndefined()
  })

  it('sends the token of that person when this device has a session', async () => {
    saveSession({
      personId: 'demo_astronaut_1',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const { calls, fetchFn } = fakeFetch([answer(200, row)])
    await createPainClient('https://api.example.test', fetchFn).send(item)
    expect(calls[0].headers.Authorization).toBe('Bearer token-1')
  })

  it('leaves an empty note out of the body', async () => {
    const { calls, fetchFn } = fakeFetch([answer(201, row)])
    await new HttpPain('https://api.example.test', fetchFn).send({ ...item, note: '' })
    expect(calls[0].body).not.toHaveProperty('note')
  })

  it('reads 200 as already stored, as the contract says', async () => {
    const { fetchFn } = fakeFetch([answer(200, row)])
    await expect(new HttpPain('https://api.example.test', fetchFn).send(item)).resolves.toBe('sent')
  })

  it('reads 409 as another report already stored under the same key', async () => {
    const { fetchFn } = fakeFetch([answer(409, { detail: 'a pain report for this person' })])
    await expect(new HttpPain('https://api.example.test', fetchFn).send(item)).resolves.toBe('conflict')
  })

  it('reads 422 as this server refusing the report itself', async () => {
    const { fetchFn } = fakeFetch([answer(422, { detail: [] })])
    await expect(new HttpPain('https://api.example.test', fetchFn).send(item)).resolves.toBe('rejected')
  })

  it('reads 404 and 405 as a route this server does not have yet', async () => {
    const notFound = fakeFetch([answer(404, { detail: 'Not Found' })])
    await expect(new HttpPain('https://api.example.test', notFound.fetchFn).send(item)).resolves.toBe(
      'unavailable',
    )
    const notAllowed = fakeFetch([answer(405, { detail: 'Method Not Allowed' })])
    await expect(new HttpPain('https://api.example.test', notAllowed.fetchFn).send(item)).resolves.toBe(
      'unavailable',
    )
  })

  it('drops a token the server no longer accepts', async () => {
    saveSession({
      personId: 'demo_astronaut_1',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const expired: string[] = []
    const stop = watchExpired((personId) => expired.push(personId))
    const { fetchFn } = fakeFetch([answer(401, { detail: 'missing or invalid token' })])
    await expect(new HttpPain('https://api.example.test', fetchFn).send(item)).resolves.toBe(
      'unauthorized',
    )
    stop()
    expect(expired).toEqual(['demo_astronaut_1'])
  })

  it('waits on a connection that could not be made, a 5xx and a rate limit', async () => {
    for (const result of [new Error('offline'), answer(500), answer(429), answer(403)]) {
      const { fetchFn } = fakeFetch([result])
      await expect(new HttpPain('https://api.example.test', fetchFn).send(item)).resolves.toBe('retry')
    }
  })
})

describe('HttpPain.fetchReports', () => {
  it('reads the reports of one person and maps them to the shape of the app', async () => {
    const { calls, fetchFn } = fakeFetch([answer(200, [row, { ...row, time: '18:40', kind: 'burn' }])])
    const reports = await new HttpPain('https://api.example.test', fetchFn).fetchReports(
      'demo_astronaut_1',
    )
    expect(calls[0].url).toBe('https://api.example.test/people/demo_astronaut_1/pain')
    expect(calls[0].method).toBe('GET')
    expect(reports).toEqual([
      {
        personId: 'demo_astronaut_1',
        regionId: 'left_knee',
        kind: 'pain',
        intensity: 4,
        missionDay: 2,
        time: '09:15',
        note: 'After the treadmill run',
      },
      {
        personId: 'demo_astronaut_1',
        regionId: 'left_knee',
        kind: 'burn',
        intensity: 4,
        missionDay: 2,
        time: '18:40',
        note: 'After the treadmill run',
      },
    ])
  })

  it('reads a report stored before the kind existed as pain', async () => {
    const older = { ...row }
    delete (older as Partial<typeof row>).kind
    const { fetchFn } = fakeFetch([answer(200, [older])])
    const reports = await new HttpPain('https://api.example.test', fetchFn).fetchReports(
      'demo_astronaut_1',
    )
    expect(reports?.[0].kind).toBe('pain')
  })

  it('reads a report without a note as no note', async () => {
    const { fetchFn } = fakeFetch([answer(200, [{ ...row, note: null }])])
    const reports = await new HttpPain('https://api.example.test', fetchFn).fetchReports(
      'demo_astronaut_1',
    )
    expect(reports?.[0].note).toBeNull()
  })

  it('gives null for no connection, an unnamed answer and a body it cannot read', async () => {
    const cases: Array<Response | Error> = [
      new Error('offline'),
      answer(500),
      answer(404),
      answer(200, { reports: [] }),
      answer(200, [row, { ...row, intensity: 11 }]),
      answer(200, [row, { ...row, kind: 'sore' }]),
      answer(200, [row, { ...row, person_id: 'someone_else' }]),
    ]
    for (const result of cases) {
      const { fetchFn } = fakeFetch([result])
      await expect(
        new HttpPain('https://api.example.test', fetchFn).fetchReports('demo_astronaut_1'),
      ).resolves.toBeNull()
    }
  })

  it('reads an empty array as no report, not as a failure', async () => {
    const { fetchFn } = fakeFetch([answer(200, [])])
    await expect(
      new HttpPain('https://api.example.test', fetchFn).fetchReports('demo_astronaut_1'),
    ).resolves.toEqual([])
  })
})

describe('createPainClient without a base URL', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('makes no request in the public demo', async () => {
    const { calls, fetchFn } = fakeFetch([answer(201)])
    const client = createPainClient(undefined, fetchFn)
    const empty = createPainClient('', fetchFn)
    expect(client.isConfigured()).toBe(false)
    expect(empty.isConfigured()).toBe(false)
    for (const quiet of [client, empty]) {
      await expect(quiet.send(item)).resolves.toBe('retry')
      await expect(quiet.fetchReports('demo_astronaut_1')).resolves.toBeNull()
    }
    expect(calls).toHaveLength(0)
  })
})
