import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountClient } from '../data/accountClient'
import {
  clearSession,
  readSession,
  saveSession,
  watchExpired,
} from '../data/session'

// Who is signed in on this device, and the four ways in of T-70: a face that
// matches a saved one, a username and PIN, a new account, or the open demo.
// The face and the PIN both end here, at one person and, when that person has
// an account, at the token the server gave.
//
// The session lives in the store (data/session.ts), so a reload keeps the
// person signed in for as long as the token lasts. The PIN is never kept.

// The synthetic astronaut of REQ-32: the one person a judge signs in as with no
// account and no PIN, so the shared link opens the check.
export const DEMO_PERSON_ID = 'demo_astronaut_1'

// The demo crew ids of the synthetic data (REQ-14). Their routes stay open
// when the server has accounts, so the demo still runs without a PIN.
export function isDemoPerson(personId: string): boolean {
  return personId.startsWith('demo_')
}

// What went wrong with a PIN or a new account. Each has one sentence in
// strings.ts; the screen never shows a status code.
export type AttemptFailure = 'wrong' | 'blocked' | 'retry' | 'exists' | 'invalid'

export type OpenResult = 'opened' | 'pin'

export interface SessionState {
  /** The person on duty, or null when the check has not begun. */
  personId: string | null
  /** 'demo' needs no token; 'account' sends the token of that person. */
  kind: 'demo' | 'account' | null
  /** false in the public demo: no account is offered at all. */
  accountsOffered: boolean
  /** The person whose token the server stopped accepting. */
  expiredFor: string | null
  signIn(personId: string, pin: string): Promise<AttemptFailure | null>
  createAccount(personId: string, pin: string): Promise<AttemptFailure | null>
  openDemo(): void
  openPerson(personId: string): OpenResult
  signOut(): void
  // A new check in the same session: the person is asked again, the token
  // stays.
  reset(): void
  forgetExpiry(): void
}

export function useSession(accounts: AccountClient): SessionState {
  const [personId, setPersonId] = useState<string | null>(null)
  const [kind, setKind] = useState<'demo' | 'account' | null>(null)
  const [expiredFor, setExpiredFor] = useState<string | null>(null)
  // The listener of the store runs outside React: it reads the person from
  // here instead of from a stale render.
  const currentPerson = useRef<string | null>(null)
  useEffect(() => {
    currentPerson.current = personId
  }, [personId])

  // A person route answered 401: the token left the device, and the screen
  // asks for the PIN of that person again.
  useEffect(
    () =>
      watchExpired((expired) => {
        if (currentPerson.current !== expired) return
        setPersonId(null)
        setKind(null)
        setExpiredFor(expired)
      }),
    [],
  )

  const openAs = useCallback((person: string, mode: 'demo' | 'account') => {
    setPersonId(person)
    setKind(mode)
    setExpiredFor(null)
  }, [])

  const signIn = useCallback(
    async (person: string, pin: string): Promise<AttemptFailure | null> => {
      const result = await accounts.signIn({ personId: person, pin })
      if (result.kind !== 'signedIn') return result.kind
      saveSession(result.session)
      openAs(person, 'account')
      return null
    },
    [accounts, openAs],
  )

  const createAccount = useCallback(
    async (person: string, pin: string): Promise<AttemptFailure | null> => {
      const result = await accounts.createAccount({ personId: person, pin })
      if (result !== 'created') return result
      // The account exists now; signing in is what gives the token.
      return signIn(person, pin)
    },
    [accounts, signIn],
  )

  const openDemo = useCallback(() => {
    openAs(DEMO_PERSON_ID, 'demo')
  }, [openAs])

  // A person picked by name or recognised by the face: a demo person opens
  // straight away, a person with a stored session opens with it, and anyone
  // else has to give the PIN.
  const openPerson = useCallback(
    (person: string): OpenResult => {
      if (isDemoPerson(person)) {
        openAs(person, 'demo')
        return 'opened'
      }
      if (readSession(person) !== null) {
        openAs(person, 'account')
        return 'opened'
      }
      return 'pin'
    },
    [openAs],
  )

  const signOut = useCallback(() => {
    if (personId !== null) clearSession(personId)
    setPersonId(null)
    setKind(null)
    setExpiredFor(null)
  }, [personId])

  const reset = useCallback(() => {
    setPersonId(null)
    setKind(null)
  }, [])

  const forgetExpiry = useCallback(() => setExpiredFor(null), [])

  return {
    personId,
    kind,
    accountsOffered: accounts.isConfigured(),
    expiredFor,
    signIn,
    createAccount,
    openDemo,
    openPerson,
    signOut,
    reset,
    forgetExpiry,
  }
}
