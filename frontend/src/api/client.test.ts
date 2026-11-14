import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpClient, MockClient, createClient } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('createClient', () => {
  it('returns MockClient when VITE_API_BASE_URL is empty', () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    expect(createClient()).toBeInstanceOf(MockClient)
  })

  it('returns HttpClient when VITE_API_BASE_URL is set', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000')
    expect(createClient()).toBeInstanceOf(HttpClient)
  })
})

describe('HttpClient', () => {
  it('builds the right URLs for each endpoint', async () => {
    const calls: string[] = []
    const fetchFn = vi.fn(async (url: string) => {
      calls.push(String(url))
      return jsonResponse([])
    })
    const client = new HttpClient('http://api', fetchFn)

    await client.getCrew()
    await client.getMission()
    await client.getCrewStatus('crew_a', 41)
    await client.getSeries('crew_a', 'resting_hr', 46)
    await client.getMissionControlStatus(42)

    expect(calls).toEqual([
      'http://api/crew',
      'http://api/mission',
      'http://api/crew/crew_a/status?day=41',
      'http://api/crew/crew_a/series/resting_hr?to=46',
      'http://api/mission-control/status?day=42',
    ])
  })

  it('encodes path parameters and strips a trailing slash from the base URL', async () => {
    const calls: string[] = []
    const fetchFn = vi.fn(async (url: string) => {
      calls.push(String(url))
      return jsonResponse([])
    })
    const client = new HttpClient('http://api/', fetchFn)

    await client.getCrewStatus('crew a', 41)
    await client.getSeries('crew_a', 'skin temp', 46)

    expect(calls).toEqual([
      'http://api/crew/crew%20a/status?day=41',
      'http://api/crew/crew_a/series/skin%20temp?to=46',
    ])
  })

  it('maps a non-ok response to an ApiError with its status', async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, 404))
    const client = new HttpClient('http://api', fetchFn)

    await expect(client.getCrew()).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    })
  })

  it('maps a rejected fetch to an ApiError with status 0', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down')
    })
    const client = new HttpClient('http://api', fetchFn)

    await expect(client.getCrew()).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
    })
  })

  it('resolves the default fetch at call time, not construction time', async () => {
    // Constructed before fetch is stubbed; the default must still reach the stub.
    const client = new HttpClient('http://api')
    const fetchFn = vi.fn(async () => jsonResponse([]))
    vi.stubGlobal('fetch', fetchFn)

    await client.getCrew()

    expect(fetchFn).toHaveBeenCalledWith('http://api/crew', undefined)
  })

  it('getDemoDays returns every day from 1 to mission.currentDay', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).endsWith('/mission')) {
        return jsonResponse({ environment: 'ship', currentDay: 3, phase: 'long_duration' })
      }
      return jsonResponse([])
    })
    const client = new HttpClient('http://api', fetchFn)

    await expect(client.getDemoDays()).resolves.toEqual([1, 2, 3])
  })
})
