import { beforeEach, describe, expect, it } from 'vitest'
import type { FetchLike } from '../data/sync'
import {
  createConditionsClient,
  psychologicalCondition,
  type Condition,
} from './conditionsClient'
import { PSYCHOLOGICAL_CONDITION_ID } from './ids'

// The client reads `status` and `json()` only, so a plain object is enough and
// the test does not depend on the Response implementation of the runner.
function answer(status: number, body: unknown): Response {
  return { status, json: () => Promise.resolve(body) } as unknown as Response
}

function fakeFetch(response: Response | Error): {
  urls: string[]
  headers: Record<string, string>[]
  fetchFn: FetchLike
} {
  const urls: string[] = []
  const headers: Record<string, string>[] = []
  return {
    urls,
    headers,
    fetchFn: (url, init) => {
      urls.push(url)
      headers.push((init?.headers ?? {}) as Record<string, string>)
      return response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response)
    },
  }
}

const row = {
  condition_id: PSYCHOLOGICAL_CONDITION_ID,
  name: 'Current state',
  score: 0.5,
  label: 'possible',
  signals: [
    { indicator_id: 'reaction_median_ms', side: 'above', contribution: 1.0, value: 480 },
    { indicator_id: 'sleep_h', side: 'below', contribution: null, value: null },
  ],
  source: 'Assumption',
}

describe('createConditionsClient', () => {
  // No session left by another test file: this client only sends the token the
  // device holds for that person.
  beforeEach(() => localStorage.clear())

  it('asks the conditions route of that person', async () => {
    const fake = fakeFetch(answer(200, [row]))
    const client = createConditionsClient('http://api.test/', fake.fetchFn)
    await client.fetchConditions('demo_astronaut_1')
    expect(fake.urls).toEqual([
      'http://api.test/people/demo_astronaut_1/conditions',
    ])
  })

  it('reads the body of docs/API.md into the fields the screen needs', async () => {
    const client = createConditionsClient(
      'http://api.test',
      fakeFetch(answer(200, [row])).fetchFn,
    )
    const [condition] = (await client.fetchConditions('demo_astronaut_1')) ?? []
    expect(condition.id).toBe(PSYCHOLOGICAL_CONDITION_ID)
    expect(condition.label).toBe('possible')
    expect(condition.score).toBe(0.5)
    expect(condition.signals[0]).toEqual({
      indicatorId: 'reaction_median_ms',
      side: 'above',
      contribution: 1,
      value: 480,
    })
    expect(condition.signals[1].contribution).toBeNull()
  })

  it('answers null, not a half read body, when a row breaks the contract', async () => {
    const broken = { ...row, label: 'certain' }
    const client = createConditionsClient(
      'http://api.test',
      fakeFetch(answer(200, [broken])).fetchFn,
    )
    expect(await client.fetchConditions('demo_astronaut_1')).toBeNull()
  })

  it('answers null when the route is not there yet', async () => {
    const client = createConditionsClient(
      'http://api.test',
      fakeFetch(answer(404, { detail: 'Not Found' })).fetchFn,
    )
    expect(await client.fetchConditions('demo_astronaut_1')).toBeNull()
  })

  it('answers null when the request fails', async () => {
    const client = createConditionsClient(
      'http://api.test',
      fakeFetch(new Error('offline')).fetchFn,
    )
    expect(await client.fetchConditions('demo_astronaut_1')).toBeNull()
  })

  it('asks nothing without a server', async () => {
    const fake = fakeFetch(answer(200, []))
    const client = createConditionsClient('', fake.fetchFn)
    expect(client.isConfigured()).toBe(false)
    expect(await client.fetchConditions('demo_astronaut_1')).toBeNull()
    expect(fake.urls).toEqual([])
  })

  it('sends no Authorization header for a person with no session', async () => {
    const fake = fakeFetch(answer(200, []))
    const client = createConditionsClient('http://api.test', fake.fetchFn)
    await client.fetchConditions('demo_astronaut_1')
    expect(fake.headers[0].Authorization).toBeUndefined()
  })
})

describe('psychologicalCondition', () => {
  const conditions: Condition[] = [
    {
      id: 'orthostatic_intolerance',
      name: 'Orthostatic intolerance',
      score: 0.2,
      label: 'low',
      signals: [],
      source: 'Assumption',
    },
    {
      id: PSYCHOLOGICAL_CONDITION_ID,
      name: 'Current state',
      score: 0.4,
      label: 'possible',
      signals: [],
      source: 'Assumption',
    },
  ]

  it('picks the neuro-behavioural condition, not the first one', () => {
    expect(psychologicalCondition(conditions)?.id).toBe(
      PSYCHOLOGICAL_CONDITION_ID,
    )
  })

  it('is null while Bio 2 has not written that row', () => {
    expect(psychologicalCondition(conditions.slice(0, 1))).toBeNull()
  })
})
