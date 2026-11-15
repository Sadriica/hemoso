import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountClient } from '../data/accountClient'
import { SESSION_STORAGE_KEY, expireSession, readSession, saveSession } from '../data/session'
import { DEMO_PERSON_ID, isDemoPerson, useSession } from './useSession'

// The session of T-70 without a server: a fake account client answers the way
// the contract says, and the hook is what turns those answers into the person
// on duty and the token this device keeps.

const FAR = '2999-01-01T00:00:00Z'

function fakeAccounts(
  answers: {
    signIn?: AccountClient['signIn']
    createAccount?: AccountClient['createAccount']
    configured?: boolean
  } = {},
): AccountClient {
  const configured = answers.configured ?? true
  return {
    isConfigured: () => configured,
    signIn:
      answers.signIn ??
      (() =>
        Promise.resolve({
          kind: 'signedIn' as const,
          session: {
            personId: 'cadet_okoro',
            token: 'abc.def',
            expiresAt: FAR,
          },
        })),
    createAccount: answers.createAccount ?? (() => Promise.resolve('created')),
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('useSession', () => {
  it('starts with nobody on duty and no account offered', () => {
    const { result } = renderHook(() => useSession(fakeAccounts({ configured: false })))
    expect(result.current.personId).toBeNull()
    expect(result.current.kind).toBeNull()
    expect(result.current.accountsOffered).toBe(false)
  })

  it('opens the demo astronaut with no PIN and keeps no token', () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => result.current.openDemo())

    expect(result.current.personId).toBe(DEMO_PERSON_ID)
    expect(result.current.kind).toBe('demo')
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('reads the synthetic crew of the demo data as the people who need no PIN', () => {
    expect(isDemoPerson('demo_astronaut_1')).toBe(true)
    expect(isDemoPerson('cadet_okoro')).toBe(false)
  })

  it('signs in with a PIN and keeps the token of that person', async () => {
    const signIn = vi.fn(fakeAccounts().signIn)
    const { result } = renderHook(() => useSession(fakeAccounts({ signIn })))

    let failure: unknown
    await act(async () => {
      failure = await result.current.signIn('cadet_okoro', '4821')
    })

    expect(failure).toBeNull()
    expect(signIn).toHaveBeenCalledWith({ personId: 'cadet_okoro', pin: '4821' })
    expect(result.current.personId).toBe('cadet_okoro')
    expect(result.current.kind).toBe('account')
    expect(readSession('cadet_okoro')?.token).toBe('abc.def')
  })

  it('tells a wrong PIN from the five-try limit, and leaves nobody on duty', async () => {
    for (const answer of [
      { kind: 'wrong' as const },
      { kind: 'blocked' as const },
      { kind: 'retry' as const },
    ]) {
      localStorage.clear()
      const { result } = renderHook(() =>
        useSession(fakeAccounts({ signIn: () => Promise.resolve(answer) })),
      )
      let failure: unknown
      await act(async () => {
        failure = await result.current.signIn('cadet_okoro', '0000')
      })
      expect(failure).toBe(answer.kind)
      expect(result.current.personId).toBeNull()
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
    }
  })

  it('creates the account and then signs in with the same PIN', async () => {
    const createAccount = vi.fn(() => Promise.resolve('created' as const))
    const signIn = vi.fn(fakeAccounts().signIn)
    const { result } = renderHook(() =>
      useSession(fakeAccounts({ createAccount, signIn })),
    )

    await act(async () => {
      expect(await result.current.createAccount('cadet_okoro', '4821')).toBeNull()
    })

    expect(createAccount).toHaveBeenCalledWith({
      personId: 'cadet_okoro',
      pin: '4821',
    })
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(result.current.personId).toBe('cadet_okoro')
  })

  it('says why an account was not created, and keeps nobody on duty', async () => {
    for (const answer of ['exists', 'invalid', 'retry'] as const) {
      const signIn = vi.fn(fakeAccounts().signIn)
      const { result } = renderHook(() =>
        useSession(
          fakeAccounts({
            createAccount: () => Promise.resolve(answer),
            signIn,
          }),
        ),
      )
      await act(async () => {
        expect(await result.current.createAccount('cadet_okoro', '4821')).toBe(
          answer,
        )
      })
      expect(signIn).not.toHaveBeenCalled()
      expect(result.current.personId).toBeNull()
    }
  })

  it('opens a demo person at once, by name or by face', () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => {
      expect(result.current.openByName('demo_astronaut_1')).toBe('opened')
    })
    expect(result.current.kind).toBe('demo')

    act(() => result.current.reset())
    act(() => {
      expect(result.current.openByFace('demo_astronaut_1')).toBe('opened')
    })
    expect(result.current.kind).toBe('demo')
  })

  it('opens a stored session by face, without the PIN', () => {
    saveSession({ personId: 'cadet_okoro', token: 'kept', expiresAt: FAR })
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => {
      expect(result.current.openByFace('cadet_okoro')).toBe('opened')
    })
    expect(result.current.kind).toBe('account')
    expect(readSession('cadet_okoro')?.token).toBe('kept')
  })

  it('asks for the PIN when a name is picked, even with a stored session', () => {
    saveSession({ personId: 'cadet_okoro', token: 'kept', expiresAt: FAR })
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => {
      expect(result.current.openByName('cadet_okoro')).toBe('pin')
    })
    expect(result.current.personId).toBeNull()
    expect(readSession('cadet_okoro')?.token).toBe('kept')
  })

  it('asks for the PIN of a person with no session on this device', () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => {
      expect(result.current.openByFace('cadet_okoro')).toBe('pin')
    })
    expect(result.current.personId).toBeNull()
  })

  it('signs out by forgetting the session and keeping the entries', () => {
    saveSession({ personId: 'cadet_okoro', token: 'abc', expiresAt: FAR })
    localStorage.setItem('hemoso:v2', '{"version":2,"entries":[]}')
    const { result } = renderHook(() => useSession(fakeAccounts()))

    act(() => {
      result.current.openByFace('cadet_okoro')
    })
    act(() => result.current.signOut())

    expect(result.current.personId).toBeNull()
    expect(readSession('cadet_okoro')).toBeNull()
    expect(localStorage.getItem('hemoso:v2')).not.toBeNull()
  })

  it('does not forget a password it never had: the PIN is never stored', async () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))
    await act(async () => {
      await result.current.signIn('cadet_okoro', '4821')
    })
    expect(JSON.stringify(localStorage)).not.toContain('4821')
  })

  it('asks again when the server stops accepting the token', async () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))
    await act(async () => {
      await result.current.signIn('cadet_okoro', '4821')
    })

    // What a person route does on a 401 (data/sync.ts, stateClient.ts).
    act(() => expireSession('cadet_okoro'))

    await waitFor(() => expect(result.current.expiredFor).toBe('cadet_okoro'))
    expect(result.current.personId).toBeNull()
    expect(result.current.kind).toBeNull()
  })

  it('starts a new check without touching the token', async () => {
    const { result } = renderHook(() => useSession(fakeAccounts()))
    await act(async () => {
      await result.current.signIn('cadet_okoro', '4821')
    })

    act(() => result.current.reset())

    expect(result.current.personId).toBeNull()
    expect(readSession('cadet_okoro')).not.toBeNull()
  })
})
