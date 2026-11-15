import { beforeEach, describe, expect, it } from 'vitest'
import { HttpSymptoms, createSymptomClient } from './symptomClient'
import {
  enqueueSymptomReports,
  pendingSymptomReports,
  sendPendingSymptoms,
  symptomOutboxSnapshot,
} from './symptomOutbox'
import {
  mergeServerSymptomReports,
  readSymptomReports,
  saveSymptomReports,
  subscribeSymptoms,
  type SymptomStorage,
} from './symptomStore'
import type { SymptomReport } from '../domain/symptoms'
import type { FetchLike } from './sync'

function memoryStorage(): SymptomStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

const REPORT: SymptomReport = {
  personId: 'astro_1',
  symptomId: 'thirst',
  severity: 2,
  missionDay: 5,
  time: '10:00',
}
const OTHER: SymptomReport = { ...REPORT, symptomId: 'fatigue', time: '10:05' }

function answer(status: number, body?: unknown): Response {
  return { status, json: () => Promise.resolve(body) } as unknown as Response
}

function fakeFetch(results: Array<Response | Error>) {
  const calls: Array<{ url: string; method: string; body: unknown }> = []
  const queue = [...results]
  const fetchFn: FetchLike = (url, init) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    })
    const next = queue.shift() ?? answer(201)
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  }
  return { calls, fetchFn }
}

describe('symptom store', () => {
  it('saves a report, reads it back and queues it for the server', () => {
    const storage = memoryStorage()
    expect(saveSymptomReports([REPORT, OTHER], storage)).toBe(2)
    expect(readSymptomReports('astro_1', storage)).toEqual([REPORT, OTHER])
    expect(readSymptomReports('someone_else', storage)).toEqual([])
    expect(pendingSymptomReports('astro_1', storage)).toHaveLength(2)
  })

  it('keeps one report per person, day, time and symptom', () => {
    const storage = memoryStorage()
    saveSymptomReports([REPORT], storage)
    expect(saveSymptomReports([REPORT], storage)).toBe(0)
    expect(readSymptomReports('astro_1', storage)).toHaveLength(1)
    expect(pendingSymptomReports('astro_1', storage)).toHaveLength(1)
  })

  it('tells the screen when a report is saved', () => {
    const storage = memoryStorage()
    let calls = 0
    const stop = subscribeSymptoms(() => {
      calls += 1
    })
    saveSymptomReports([REPORT], storage)
    stop()
    saveSymptomReports([OTHER], storage)
    expect(calls).toBe(1)
  })

  it('saves nothing and does not throw with blocked storage', () => {
    expect(saveSymptomReports([REPORT], null)).toBe(0)
    expect(readSymptomReports('astro_1', null)).toEqual([])
  })

  it('joins the reports the server holds, once', () => {
    const storage = memoryStorage()
    saveSymptomReports([REPORT], storage)
    mergeServerSymptomReports([REPORT, OTHER], storage)
    expect(readSymptomReports('astro_1', storage)).toEqual([REPORT, OTHER])
    // What the server returned is not owed back to it.
    expect(pendingSymptomReports('astro_1', storage)).toEqual([REPORT])
  })

  it('reads past a damaged value', () => {
    const storage = memoryStorage()
    storage.setItem('hemoso:symptoms:v1', '{nope')
    expect(readSymptomReports('astro_1', storage)).toEqual([])
    storage.setItem(
      'hemoso:symptoms:v1',
      JSON.stringify({ version: 1, reports: [REPORT, { ...OTHER, severity: 9 }] }),
    )
    expect(readSymptomReports('astro_1', storage)).toEqual([REPORT])
  })
})

describe('symptom outbox, one round', () => {
  let storage: SymptomStorage
  beforeEach(() => {
    storage = memoryStorage()
    enqueueSymptomReports([REPORT, OTHER], storage)
  })

  function client(fetchFn: FetchLike) {
    return new HttpSymptoms('http://api.test/', fetchFn)
  }

  it('posts each report in the API field names and removes what the server took', async () => {
    const { calls, fetchFn } = fakeFetch([answer(201), answer(200)])
    const round = await sendPendingSymptoms(client(fetchFn), 'astro_1', storage)
    expect(round).toMatchObject({ sent: 2, refused: 0, pending: 0 })
    expect(calls[0].url).toBe('http://api.test/people/astro_1/symptoms')
    expect(calls[0].method).toBe('POST')
    expect(calls[0].body).toEqual({
      symptom_id: 'thirst',
      severity: 2,
      mission_day: 5,
      time: '10:00',
    })
  })

  it('keeps a refused report (409, 422) on the device and stops retrying it', async () => {
    const { fetchFn } = fakeFetch([answer(409), answer(422)])
    const round = await sendPendingSymptoms(client(fetchFn), 'astro_1', storage)
    expect(round).toMatchObject({ sent: 0, refused: 2, pending: 0 })
    expect(symptomOutboxSnapshot('astro_1', storage).refusedCount).toBe(2)
    expect(enqueueSymptomReports([REPORT], storage)).toBe(0)
  })

  it('retries after a network error or a 5xx, and stops the round', async () => {
    const { calls, fetchFn } = fakeFetch([new Error('offline')])
    const round = await sendPendingSymptoms(client(fetchFn), 'astro_1', storage)
    expect(round).toMatchObject({ sent: 0, pending: 2 })
    expect(calls).toHaveLength(1)
    const later = fakeFetch([answer(503)])
    expect((await sendPendingSymptoms(client(later.fetchFn), 'astro_1', storage)).pending).toBe(2)
  })

  it('notes a server without the route (404, 405) and keeps the reports', async () => {
    const { calls, fetchFn } = fakeFetch([answer(404)])
    const round = await sendPendingSymptoms(client(fetchFn), 'astro_1', storage)
    expect(round).toMatchObject({ sent: 0, pending: 2, serverMissing: true })
    // One answer is enough: the rest would get the same 404.
    expect(calls).toHaveLength(1)
    const ok = fakeFetch([answer(201), answer(201)])
    const next = await sendPendingSymptoms(client(ok.fetchFn), 'astro_1', storage)
    expect(next).toMatchObject({ sent: 2, serverMissing: false })
  })

  it('sends nothing without a server', async () => {
    const round = await sendPendingSymptoms(createSymptomClient(''), 'astro_1', storage)
    expect(round).toMatchObject({ sent: 0, pending: 2 })
  })
})

describe('symptom client, GET', () => {
  it('reads the reports of the person', async () => {
    const { calls, fetchFn } = fakeFetch([
      answer(200, [
        { symptom_id: 'thirst', severity: 2, mission_day: 5, time: '10:00', person_id: 'astro_1' },
      ]),
    ])
    const rows = await new HttpSymptoms('http://api.test', fetchFn).fetchReports('astro_1')
    expect(rows).toEqual([REPORT])
    expect(calls[0].method).toBe('GET')
  })

  it('answers null for a body, status or row the contract does not name', async () => {
    const bad = [
      answer(500),
      answer(200, { not: 'a list' }),
      answer(200, [{ symptom_id: 'thirst', severity: 7, mission_day: 5, time: '10:00' }]),
      answer(200, [{ symptom_id: 'thirst', severity: 1, mission_day: 5, time: '10:00', person_id: 'x' }]),
    ]
    for (const response of bad) {
      const { fetchFn } = fakeFetch([response])
      expect(await new HttpSymptoms('http://api.test', fetchFn).fetchReports('astro_1')).toBeNull()
    }
    const { fetchFn } = fakeFetch([new Error('offline')])
    expect(await new HttpSymptoms('http://api.test', fetchFn).fetchReports('astro_1')).toBeNull()
  })
})
