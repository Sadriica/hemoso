import { describe, expect, it } from 'vitest'
import { createHistoryClient, type HistoryQuery } from './historyClient'
import type { FetchLike } from './sync'

const query: HistoryQuery = {
  personId: 'demo_astronaut_1',
  indicatorId: 'hr_bpm',
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

const row = {
  person_id: 'demo_astronaut_1',
  indicator_id: 'hr_bpm',
  value: 72,
  unit: 'bpm',
  mission_day: 3,
  time: '08:00',
  context: 'rest',
}

describe('createHistoryClient', () => {
  it('asks the history route and maps the rows to the entries of the app', async () => {
    const { urls, fetchFn } = fakeFetch(
      Promise.resolve(answer(200, [row, { ...row, mission_day: 4, value: 75 }])),
    )
    const client = createHistoryClient('https://api.example.test', fetchFn)

    await expect(client.fetchHistory(query)).resolves.toEqual([
      {
        id: 'server:demo_astronaut_1:hr_bpm:3:08:00',
        personId: 'demo_astronaut_1',
        indicatorId: 'hr_bpm',
        value: 72,
        unit: 'bpm',
        missionDay: 3,
        time: '08:00',
        context: 'rest',
      },
      {
        id: 'server:demo_astronaut_1:hr_bpm:4:08:00',
        personId: 'demo_astronaut_1',
        indicatorId: 'hr_bpm',
        value: 75,
        unit: 'bpm',
        missionDay: 4,
        time: '08:00',
        context: 'rest',
      },
    ])
    expect(client.isConfigured()).toBe(true)
    expect(urls).toEqual([
      'https://api.example.test/people/demo_astronaut_1/indicators/hr_bpm/history',
    ])
  })

  it('reads a row without a context as a rest reading', async () => {
    const body = { ...row }
    delete (body as Partial<typeof row>).context
    const { fetchFn } = fakeFetch(Promise.resolve(answer(200, [body])))
    const entries = await createHistoryClient(
      'https://api.example.test',
      fetchFn,
    ).fetchHistory(query)
    expect(entries?.[0].context).toBe('rest')
  })

  it('gives the same id to the same row on a second read', async () => {
    const first = fakeFetch(Promise.resolve(answer(200, [row])))
    const second = fakeFetch(Promise.resolve(answer(200, [row])))
    const one = await createHistoryClient(
      'https://api.example.test',
      first.fetchFn,
    ).fetchHistory(query)
    const two = await createHistoryClient(
      'https://api.example.test',
      second.fetchFn,
    ).fetchHistory(query)
    expect(one?.[0].id).toBe(two?.[0].id)
  })

  it('reads an empty history', async () => {
    const { fetchFn } = fakeFetch(Promise.resolve(answer(200, [])))
    await expect(
      createHistoryClient('https://api.example.test', fetchFn).fetchHistory(
        query,
      ),
    ).resolves.toEqual([])
  })

  it('drops a trailing slash from the base URL', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, [])))
    await createHistoryClient('https://api.example.test/', fetchFn).fetchHistory(
      query,
    )
    expect(urls[0]).toBe(
      'https://api.example.test/people/demo_astronaut_1/indicators/hr_bpm/history',
    )
  })

  it('answers null without a base URL, and asks nothing', async () => {
    const { urls, fetchFn } = fakeFetch(Promise.resolve(answer(200, [row])))
    const client = createHistoryClient('', fetchFn)
    await expect(client.fetchHistory(query)).resolves.toBeNull()
    expect(client.isConfigured()).toBe(false)
    expect(urls).toEqual([])
  })

  it('answers null on a status the contract does not call 200', async () => {
    for (const status of [404, 422, 502, 500]) {
      const { fetchFn } = fakeFetch(Promise.resolve(answer(status, [row])))
      await expect(
        createHistoryClient('https://api.example.test', fetchFn).fetchHistory(
          query,
        ),
      ).resolves.toBeNull()
    }
  })

  it('answers null when the request cannot be made', async () => {
    const { fetchFn } = fakeFetch(Promise.reject(new Error('offline')))
    await expect(
      createHistoryClient('https://api.example.test', fetchFn).fetchHistory(
        query,
      ),
    ).resolves.toBeNull()
  })

  it('answers null when the body is not JSON', async () => {
    const fetchFn: FetchLike = () =>
      Promise.resolve({
        status: 200,
        json: () => Promise.reject(new Error('not json')),
      } as unknown as Response)
    await expect(
      createHistoryClient('https://api.example.test', fetchFn).fetchHistory(
        query,
      ),
    ).resolves.toBeNull()
  })

  it.each([
    ['a body that is not an array', row],
    ['a body with no entry at all', null],
    ['a value that is not a number', [{ ...row, value: '72' }]],
    ['a value that is not finite', [{ ...row, value: null }]],
    ['a mission day of zero', [{ ...row, mission_day: 0 }]],
    ['a mission day that is not whole', [{ ...row, mission_day: 1.5 }]],
    ['a time that is not HH:MM', [{ ...row, time: '8:00' }]],
    ['a context outside the four', [{ ...row, context: 'sleeping' }]],
    ['no unit', [{ ...row, unit: undefined }]],
    ['an id longer than 64 characters', [{ ...row, person_id: 'a'.repeat(65) }]],
    ['a null row', [null]],
    ['one good row and one bad row', [row, { ...row, time: '25:00' }]],
  ])('answers null on %s', async (_name, body) => {
    const { fetchFn } = fakeFetch(Promise.resolve(answer(200, body)))
    await expect(
      createHistoryClient('https://api.example.test', fetchFn).fetchHistory(
        query,
      ),
    ).resolves.toBeNull()
  })
})
