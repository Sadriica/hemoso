import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_STORAGE_KEY,
  bearerToken,
  clearSession,
  expireSession,
  isExpired,
  loadSessions,
  readSession,
  saveSession,
  watchExpired,
  type Session,
  type SessionStorage,
} from './session'

// The session store of T-70: the token of each person on this device, never
// the PIN. The tests use a storage of their own, so no test depends on the
// order the browser keeps its keys in.

const FAR = '2999-01-01T00:00:00Z'
const PAST = '2020-01-01T00:00:00Z'

function session(personId = 'cadet_okoro'): Session {
  return { personId, token: `token-${personId}`, expiresAt: FAR }
}

function memoryStorage(initial: string | null = null): SessionStorage & {
  values: Map<string, string>
} {
  const values = new Map<string, string>()
  if (initial !== null) values.set(SESSION_STORAGE_KEY, initial)
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the session store', () => {
  it('keeps one session per person and reads it back', () => {
    const storage = memoryStorage()
    saveSession(session('cadet_okoro'), storage)
    saveSession(session('cadet_reyes'), storage)

    expect(readSession('cadet_okoro', storage)?.token).toBe('token-cadet_okoro')
    expect(Object.keys(loadSessions(storage))).toEqual(['cadet_okoro', 'cadet_reyes'])
  })

  it('never writes the PIN, which is not part of a session', () => {
    const storage = memoryStorage()
    saveSession(session(), storage)
    expect([...storage.values.values()].join('')).not.toMatch(/pin/i)
  })

  it('counts a session past its expiry as no session at all', () => {
    const storage = memoryStorage()
    saveSession({ ...session(), expiresAt: PAST }, storage)

    expect(loadSessions(storage)).toEqual({})
    expect(readSession('cadet_okoro', storage)).toBeNull()
  })

  it('reads a date it cannot parse as expired', () => {
    const expired = isExpired({ ...session(), expiresAt: 'not a date' })
    expect(expired).toBe(true)
  })

  it('sends the token of the person, and nothing for a person without one', () => {
    const storage = memoryStorage()
    saveSession(session('cadet_okoro'), storage)

    expect(bearerToken('cadet_okoro', storage)).toBe('token-cadet_okoro')
    expect(bearerToken('cadet_reyes', storage)).toBeNull()
  })

  it('forgets the session of one person and keeps the others', () => {
    const storage = memoryStorage()
    saveSession(session('cadet_okoro'), storage)
    saveSession(session('cadet_reyes'), storage)

    clearSession('cadet_okoro', storage)

    expect(readSession('cadet_okoro', storage)).toBeNull()
    expect(readSession('cadet_reyes', storage)).not.toBeNull()
  })

  it('leaves no key behind when the last session goes', () => {
    const storage = memoryStorage()
    saveSession(session(), storage)
    clearSession('cadet_okoro', storage)
    expect(storage.values.has(SESSION_STORAGE_KEY)).toBe(false)
  })

  it('reads no session from a payload that breaks the shape', () => {
    expect(loadSessions(memoryStorage('{oops'))).toEqual({})
    expect(loadSessions(memoryStorage('[]'))).toEqual({})
    // The row names another person than its key.
    const wrongPerson = JSON.stringify({
      cadet_okoro: { personId: 'cadet_reyes', token: 'abc', expiresAt: FAR },
    })
    expect(loadSessions(memoryStorage(wrongPerson))).toEqual({})
    const noToken = JSON.stringify({
      cadet_okoro: { personId: 'cadet_okoro', token: '', expiresAt: FAR },
    })
    expect(loadSessions(memoryStorage(noToken))).toEqual({})
  })

  it('works from memory when the browser refuses storage', () => {
    const storage = memoryStorage()
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked')
    })

    expect(() => saveSession(session(), storage)).not.toThrow()
    expect(readSession('cadet_okoro', storage)).toBeNull()
    expect(loadSessions(null)).toEqual({})
  })
})

describe('an expired session', () => {
  it('hears about it once the token leaves the device, and stops when asked', () => {
    const storage = memoryStorage()
    const heard: string[] = []
    const stop = watchExpired((personId) => heard.push(personId))

    saveSession(session('cadet_okoro'), storage)
    expireSession('cadet_okoro', storage)
    expect(heard).toEqual(['cadet_okoro'])
    expect(readSession('cadet_okoro', storage)).toBeNull()

    stop()
    expireSession('cadet_okoro', storage)
    expect(heard).toEqual(['cadet_okoro'])
  })
})
