import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAccountClient,
  type AccountClient,
  type Credentials,
} from './accountClient'
import type { FetchLike } from './sync'

// The account client of T-70 against the contract of docs/API.md: every status
// has one meaning, and a body that breaks the shape is no session.

const BASE = 'https://api.example.test'
const CREDENTIALS: Credentials = { personId: 'cadet_okoro', pin: '4821' }
const SESSION_BODY = {
  token: 'abc.def',
  person_id: 'cadet_okoro',
  expires_at: '2999-01-01T00:00:00Z',
}

function answer(status: number, body?: unknown): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

interface Call {
  url: string
  init: RequestInit
}

function fakeFetch(promise: Promise<Response> | (() => Promise<Response>)): {
  calls: Call[]
  fetchFn: FetchLike
} {
  const calls: Call[] = []
  return {
    calls,
    fetchFn: (url, init) => {
      calls.push({ url, init })
      return typeof promise === 'function' ? promise() : promise
    },
  }
}

function clientWith(
  promise: Promise<Response> | (() => Promise<Response>),
): { client: AccountClient; calls: Call[] } {
  const { calls, fetchFn } = fakeFetch(promise)
  return { client: createAccountClient(BASE, fetchFn), calls }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createAccountClient', () => {
  it('offers no account at all with no base URL', async () => {
    const client = createAccountClient('')
    expect(client.isConfigured()).toBe(false)
    // The screen never asks; these answers only satisfy the interface.
    await expect(client.createAccount(CREDENTIALS)).resolves.toBe('retry')
    await expect(client.signIn(CREDENTIALS)).resolves.toEqual({ kind: 'retry' })
  })

  it('creates an account with the field names of the contract', async () => {
    const { client, calls } = clientWith(Promise.resolve(answer(201)))
    await expect(client.createAccount(CREDENTIALS)).resolves.toBe('created')

    expect(calls[0].url).toBe(`${BASE}/accounts`)
    expect(calls[0].init.method).toBe('POST')
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      person_id: 'cadet_okoro',
      pin: '4821',
    })
  })

  it('reads each answer of POST /accounts', async () => {
    for (const [status, result] of [
      [201, 'created'],
      [409, 'exists'],
      [422, 'invalid'],
      [500, 'retry'],
      [404, 'retry'],
    ] as const) {
      const { client } = clientWith(Promise.resolve(answer(status)))
      await expect(client.createAccount(CREDENTIALS)).resolves.toBe(result)
    }
  })

  it('asks for a retry when the request cannot be made', async () => {
    const { client } = clientWith(Promise.reject(new Error('offline')))
    await expect(client.createAccount(CREDENTIALS)).resolves.toBe('retry')
  })

  it('signs in and hands back the session the server sent', async () => {
    const { client, calls } = clientWith(Promise.resolve(answer(200, SESSION_BODY)))
    await expect(client.signIn(CREDENTIALS)).resolves.toEqual({
      kind: 'signedIn',
      session: {
        personId: 'cadet_okoro',
        token: 'abc.def',
        expiresAt: '2999-01-01T00:00:00Z',
      },
    })
    expect(calls[0].url).toBe(`${BASE}/sessions`)
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      person_id: 'cadet_okoro',
      pin: '4821',
    })
  })

  it('names a wrong username or PIN and the five-try limit apart', async () => {
    const wrong = clientWith(Promise.resolve(answer(401)))
    await expect(wrong.client.signIn(CREDENTIALS)).resolves.toEqual({ kind: 'wrong' })

    const blocked = clientWith(Promise.resolve(answer(429)))
    await expect(blocked.client.signIn(CREDENTIALS)).resolves.toEqual({
      kind: 'blocked',
    })
  })

  it('reads any other status as a retry, never as a session', async () => {
    for (const status of [400, 403, 404, 500, 503]) {
      const { client } = clientWith(Promise.resolve(answer(status, SESSION_BODY)))
      await expect(client.signIn(CREDENTIALS)).resolves.toEqual({ kind: 'retry' })
    }
    const offline = clientWith(Promise.reject(new Error('offline')))
    await expect(offline.client.signIn(CREDENTIALS)).resolves.toEqual({
      kind: 'retry',
    })
  })

  it('takes no session from a body the contract does not name', async () => {
    for (const body of [
      null,
      [],
      {},
      { token: '', person_id: 'cadet_okoro', expires_at: '2999-01-01T00:00:00Z' },
      { token: 'abc', person_id: 'cadet_reyes', expires_at: '2999-01-01T00:00:00Z' },
      { token: 'abc', person_id: 'cadet_okoro' },
      { token: 'abc', person_id: 'cadet_okoro', expires_at: '' },
    ]) {
      const { client } = clientWith(Promise.resolve(answer(200, body)))
      await expect(client.signIn(CREDENTIALS)).resolves.toEqual({ kind: 'retry' })
    }
    const noJson = createAccountClient(BASE, () =>
      Promise.resolve({
        status: 200,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response),
    )
    await expect(noJson.signIn(CREDENTIALS)).resolves.toEqual({ kind: 'retry' })
  })

  it('trims a trailing slash from the base URL', async () => {
    const { calls, fetchFn } = fakeFetch(Promise.resolve(answer(201)))
    await createAccountClient(`${BASE}/`, fetchFn).createAccount(CREDENTIALS)
    expect(calls[0].url).toBe(`${BASE}/accounts`)
  })
})
