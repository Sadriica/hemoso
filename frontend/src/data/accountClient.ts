import type { Session } from './session'
import { defaultFetch, type FetchLike } from './sync'

// Accounts (REQ-37, T-70): a username the person remembers and a PIN, checked
// by the server, which answers with a token. The contract is docs/API.md:
//
//   POST /accounts  {person_id, pin} -> 201, 409 when the name is taken,
//                   422 when the name or the PIN breaks the rule;
//   POST /sessions  {person_id, pin} -> 200 {token, person_id, expires_at},
//                   401 on a wrong name or PIN, 429 after five wrong tries in
//                   ten minutes.
//
// A null base URL is the public demo: no account is offered at all, and the
// open demo astronaut still works. Nothing here keeps the PIN: it goes out in
// the request body and is not read again.

export interface Credentials {
  personId: string
  pin: string
}

export type CreateResult = 'created' | 'exists' | 'invalid' | 'retry'

export type SignInResult =
  | { kind: 'signedIn'; session: Session }
  | { kind: 'wrong' }
  | { kind: 'blocked' }
  | { kind: 'retry' }

export interface AccountClient {
  // false in the public demo: the account options are not shown at all.
  isConfigured(): boolean
  createAccount(credentials: Credentials): Promise<CreateResult>
  signIn(credentials: Credentials): Promise<SignInResult>
}

export class NoopAccounts implements AccountClient {
  isConfigured(): boolean {
    return false
  }

  // The screen never asks: the account options are hidden when isConfigured()
  // is false. These answers only satisfy the interface.
  createAccount(): Promise<CreateResult> {
    return Promise.resolve('retry')
  }

  signIn(): Promise<SignInResult> {
    return Promise.resolve({ kind: 'retry' })
  }
}

export class HttpAccounts implements AccountClient {
  private readonly baseUrl: string
  private readonly fetchFn: FetchLike

  constructor(baseUrl: string, fetchFn: FetchLike = defaultFetch) {
    // Without this, a base URL that ends in a slash asks for "//accounts".
    this.baseUrl = baseUrl.trim().replace(/\/+$/, '')
    this.fetchFn = fetchFn
  }

  isConfigured(): boolean {
    return this.baseUrl !== ''
  }

  async createAccount(credentials: Credentials): Promise<CreateResult> {
    const status = await this.post('/accounts', credentials)
    if (status === 201) return 'created'
    if (status === 409) return 'exists'
    if (status === 422) return 'invalid'
    return 'retry'
  }

  async signIn(credentials: Credentials): Promise<SignInResult> {
    let response: Response
    try {
      response = await this.fetchFn(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: credentials.personId,
          pin: credentials.pin,
        }),
      })
    } catch {
      return { kind: 'retry' }
    }
    if (response.status === 401) return { kind: 'wrong' }
    if (response.status === 429) return { kind: 'blocked' }
    if (response.status !== 200) return { kind: 'retry' }
    let body: unknown
    try {
      body = await response.json()
    } catch {
      return { kind: 'retry' }
    }
    const session = readSession(body, credentials.personId)
    // An answer that breaks the contract is no answer: the screen asks again
    // instead of keeping a token it cannot read.
    return session === null ? { kind: 'retry' } : { kind: 'signedIn', session }
  }

  // The status, or 0 when the request could not be made at all.
  private async post(path: string, credentials: Credentials): Promise<number> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: credentials.personId,
          pin: credentials.pin,
        }),
      })
      return response.status
    } catch {
      return 0
    }
  }
}

export function createAccountClient(
  rawBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  fetchFn: FetchLike = defaultFetch,
): AccountClient {
  const baseUrl = rawBaseUrl?.trim() ?? ''
  return baseUrl === '' ? new NoopAccounts() : new HttpAccounts(baseUrl, fetchFn)
}

// The body of POST /sessions: the token, the person it belongs to and the
// moment it stops working. A row that names another person is not read.
function readSession(value: unknown, personId: string): Session | null {
  if (typeof value !== 'object' || value === null) return null
  const body = value as Record<string, unknown>
  if (body.person_id !== personId) return null
  if (typeof body.token !== 'string' || body.token === '') return null
  if (typeof body.expires_at !== 'string' || body.expires_at === '') return null
  return { personId, token: body.token, expiresAt: body.expires_at }
}
