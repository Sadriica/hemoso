import { beforeEach, describe, expect, it } from 'vitest'
import { createStateClient, type StateQuery } from './stateClient'
import { readSession, saveSession } from './session'
import type { FetchLike } from './sync'

const query: StateQuery = {
  personId: 'demo_astronaut_1',
  indicatorId: 'hr_bpm',
  value: 72,
  context: 'rest',
}

// The client reads `status` and `json()` only, so a plain object is enough and
// the test does not depend on the Response implementation of the test runner.
function answer(status: number, body: unknown): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function fakeFetch(promise: Promise<Response>): {
  urls: string[]
  fetchFn: FetchLike
} {
  const urls: string[] = []
  return {
    urls,
    fetchFn: (url) => {
      urls.push(url)
      return promise
    },
  }
}

const valid = {
  state: 'in_range',
  median: 70,
  spread: 4,
  n: 14,
  attention: null,
}

describe('createStateClient', () => {
  it('asks the state route with the value and the context', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, valid)))
    const client = createStateClient('https://api.example.test', fetchFn)

    await expect(client.fetchState(query)).resolves.toEqual(valid)
    expect(client.isConfigured()).toBe(true)
    expect(urls).toEqual([
      'https://api.example.test/people/demo_astronaut_1/indicators/hr_bpm/state?value=72&context=rest',
    ])
  })

  it('sends the mission day and the time of the reading when the caller knows them', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, valid)))
    const client = createStateClient('https://api.example.test', fetchFn)

    await client.fetchState({ ...query, missionDay: 41, time: '07:30' })

    expect(urls).toEqual([
      'https://api.example.test/people/demo_astronaut_1/indicators/hr_bpm/state' +
        '?value=72&context=rest&mission_day=41&time=07%3A30',
    ])
  })

  it('drops a trailing slash from the base URL', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, valid)))
    await createStateClient('https://api.example.test/', fetchFn).fetchState(
      query,
    )
    expect(urls[0]).toContain('https://api.example.test/people/')
  })

  it('reads the attention row of a value that needs review', async () => {
    const { fetchFn } = fakeFetch(
      Promise.resolve(
        answer(200, {
          state: 'needs_review',
          median: 120,
          spread: 5,
          n: 9,
          attention: {
            attention_level: 'example_level',
            notify: 'cmo',
            source: 'Assumption',
          },
        }),
      ),
    )
    await expect(
      createStateClient('https://api.example.test', fetchFn).fetchState(query),
    ).resolves.toEqual({
      state: 'needs_review',
      median: 120,
      spread: 5,
      n: 9,
      attention: {
        level: 'example_level',
        notify: 'cmo',
        source: 'Assumption',
      },
    })
  })

  it('answers null without a base URL, and asks nothing', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, valid)))
    const client = createStateClient('', fetchFn)
    await expect(client.fetchState(query)).resolves.toBeNull()
    expect(client.isConfigured()).toBe(false)
    expect(urls).toEqual([])
  })

  it('answers null on a status the contract does not call 200', async () => {
    for (const status of [404, 422, 502, 500]) {
      const { fetchFn } = fakeFetch(Promise.resolve(answer(status, valid)))
      await expect(
        createStateClient('https://api.example.test', fetchFn).fetchState(query),
      ).resolves.toBeNull()
    }
  })

  it('answers null when the request cannot be made', async () => {
    const { fetchFn } = fakeFetch(Promise.reject(new Error('offline')))
    await expect(
      createStateClient('https://api.example.test', fetchFn).fetchState(query),
    ).resolves.toBeNull()
  })

  it('answers null when the body is not JSON', async () => {
    const fetchFn: FetchLike = () =>
      Promise.resolve({
        status: 200,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response)
    await expect(
      createStateClient('https://api.example.test', fetchFn).fetchState(query),
    ).resolves.toBeNull()
  })

  it.each([
    ['an unknown state', { ...valid, state: 'maybe' }],
    ['a median that is not a number', { ...valid, median: '70' }],
    ['a count that is not a whole number', { ...valid, n: 1.5 }],
    ['no attention field', { state: 'in_range', median: 70, spread: 4, n: 14 }],
    ['an attention row without a notify', {
      ...valid,
      attention: { attention_level: 'example_level', source: 'Assumption' },
    }],
  ])('answers null on %s', async (_name, body) => {
    const { fetchFn } = fakeFetch(Promise.resolve(answer(200, body)))
    await expect(
      createStateClient('https://api.example.test', fetchFn).fetchState(query),
    ).resolves.toBeNull()
  })
})

describe('the token of a person with an account', () => {
  // A fetch that keeps the headers of each call, which is what this block is
  // about.
  function recordingFetch(status: number): {
    headers: Array<Record<string, string>>
    fetchFn: FetchLike
  } {
    const headers: Array<Record<string, string>> = []
    return {
      headers,
      fetchFn: (_url, init) => {
        headers.push({ ...(init.headers as Record<string, string>) })
        return Promise.resolve(answer(status, valid))
      },
    }
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('sends the bearer token of that person', async () => {
    saveSession({
      personId: 'demo_astronaut_1',
      token: 'abc.def',
      expiresAt: '2999-01-01T00:00:00Z',
    })
    const { headers, fetchFn } = recordingFetch(200)

    await createStateClient('https://api.example.test', fetchFn).fetchState(query)

    expect(headers[0].Authorization).toBe('Bearer abc.def')
  })

  it('sends no token for a person without a session', async () => {
    const { headers, fetchFn } = recordingFetch(200)
    await createStateClient('https://api.example.test', fetchFn).fetchState(query)
    expect(headers[0].Authorization).toBeUndefined()
  })

  it('forgets a refused session and answers null', async () => {
    saveSession({
      personId: 'demo_astronaut_1',
      token: 'dead',
      expiresAt: '2999-01-01T00:00:00Z',
    })
    const { fetchFn } = recordingFetch(401)

    await expect(
      createStateClient('https://api.example.test', fetchFn).fetchState(query),
    ).resolves.toBeNull()
    expect(readSession('demo_astronaut_1')).toBeNull()
  })
})
