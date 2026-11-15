import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProfileClient, HttpProfile } from './profileClient'
import { saveSession, watchExpired } from './session'
import type { FetchLike } from './sync'

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
    const next = queue.shift() ?? answer(200)
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve(next)
  }
  return { calls, fetchFn }
}

describe('HttpProfile.fetchProfile', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('reads the date the account holds', async () => {
    const { calls, fetchFn } = fakeFetch([
      answer(200, { person_id: 'ana_1', mission_start: '2026-11-01' }),
    ])
    const profile = await new HttpProfile('https://api.example.test/', fetchFn).fetchProfile('ana_1')
    expect(profile).toEqual({
      kind: 'found',
      profile: { personId: 'ana_1', missionStart: '2026-11-01' },
    })
    expect(calls[0].url).toBe('https://api.example.test/people/ana_1/profile')
    expect(calls[0].method).toBe('GET')
  })

  it('reads a null date as an account that holds none', async () => {
    const { fetchFn } = fakeFetch([answer(200, { person_id: 'ana_1', mission_start: null })])
    await expect(new HttpProfile('https://api.example.test', fetchFn).fetchProfile('ana_1')).resolves.toEqual(
      { kind: 'found', profile: { personId: 'ana_1', missionStart: null } },
    )
  })

  it('sends the token of that person when this device has a session', async () => {
    saveSession({
      personId: 'ana_1',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const { calls, fetchFn } = fakeFetch([answer(200, { person_id: 'ana_1', mission_start: null })])
    await new HttpProfile('https://api.example.test', fetchFn).fetchProfile('ana_1')
    expect(calls[0].headers.Authorization).toBe('Bearer token-1')
  })

  it('reads 404 and 405 as a route this device cannot use', async () => {
    for (const status of [404, 405]) {
      const { fetchFn } = fakeFetch([answer(status, { detail: 'this person has no account' })])
      await expect(
        new HttpProfile('https://api.example.test', fetchFn).fetchProfile('ana_1'),
      ).resolves.toEqual({ kind: 'missing' })
    }
  })

  it('reads a connection problem, a 5xx and a body it cannot use as retry', async () => {
    const cases: Array<Response | Error> = [
      new Error('offline'),
      answer(502),
      answer(200, { person_id: 'ana_1', mission_start: '2026-02-30' }),
      answer(200, { person_id: 'somebody_else', mission_start: '2026-11-01' }),
      answer(200, 'not an object'),
    ]
    for (const result of cases) {
      const { fetchFn } = fakeFetch([result])
      await expect(
        new HttpProfile('https://api.example.test', fetchFn).fetchProfile('ana_1'),
      ).resolves.toEqual({ kind: 'retry' })
    }
  })

  it('drops a token the server no longer accepts', async () => {
    saveSession({
      personId: 'ana_1',
      token: 'token-1',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })
    const expired: string[] = []
    const stop = watchExpired((personId) => expired.push(personId))
    const { fetchFn } = fakeFetch([answer(401, { detail: 'missing or invalid token' })])
    await expect(new HttpProfile('https://api.example.test', fetchFn).fetchProfile('ana_1')).resolves.toEqual(
      { kind: 'retry' },
    )
    stop()
    expect(expired).toEqual(['ana_1'])
  })
})

describe('HttpProfile.saveMissionStart', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('puts the date on the account route and reads 200 as stored', async () => {
    const { calls, fetchFn } = fakeFetch([
      answer(200, { person_id: 'ana_1', mission_start: '2026-11-05' }),
    ])
    await expect(
      new HttpProfile('https://api.example.test', fetchFn).saveMissionStart('ana_1', '2026-11-05'),
    ).resolves.toBe(true)
    expect(calls[0].url).toBe('https://api.example.test/people/ana_1/mission_start')
    expect(calls[0].method).toBe('PUT')
    expect(calls[0].body).toEqual({ mission_start: '2026-11-05' })
  })

  it('reads a refused date, a missing route and a connection problem as not stored', async () => {
    const cases: Array<Response | Error> = [answer(422), answer(404), answer(502), new Error('offline')]
    for (const result of cases) {
      const { fetchFn } = fakeFetch([result])
      await expect(
        new HttpProfile('https://api.example.test', fetchFn).saveMissionStart('ana_1', '2026-11-05'),
      ).resolves.toBe(false)
    }
  })
})

describe('createProfileClient without a base URL', () => {
  it('asks nothing and stores nothing in the public demo', async () => {
    const { calls, fetchFn } = fakeFetch([answer(200, { person_id: 'ana_1', mission_start: null })])
    for (const client of [createProfileClient('', fetchFn), createProfileClient(undefined, fetchFn)]) {
      expect(client.isConfigured()).toBe(false)
      await expect(client.fetchProfile('ana_1')).resolves.toEqual({ kind: 'missing' })
      await expect(client.saveMissionStart('ana_1', '2026-11-05')).resolves.toBe(false)
    }
    expect(calls).toHaveLength(0)
  })
})

describe('createProfileClient with a base URL', () => {
  it('builds the real client', () => {
    const client = createProfileClient('https://api.example.test', vi.fn() as unknown as FetchLike)
    expect(client.isConfigured()).toBe(true)
  })
})
