// Who is signed in on this device (REQ-37, T-70). One entry per person: the
// token the server gave and the moment it stops working. The PIN is never
// stored, here or anywhere else in the browser.
//
// A session whose expiry the browser reads as past counts as no session, so a
// token the server has already dropped is never sent. A payload that cannot be
// read, or that keeps a broken row, gives no session for that person: the
// person signs in again, which costs one PIN.

export const SESSION_STORAGE_KEY = 'hemoso:session:v1'

export interface Session {
  personId: string
  token: string
  /** The server's `expires_at`, kept exactly as it sent it. */
  expiresAt: string
}

/** The sessions of this device, by person id. */
export type SessionMap = Record<string, Session>

// The part of the Storage API this module needs, so tests can pass a fake or a
// storage that throws.
export interface SessionStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type ExpiredListener = (personId: string) => void

const listeners = new Set<ExpiredListener>()

// An expiry time this browser cannot read is not a session it may trust, so it
// counts as expired.
export function isExpired(session: Session, now: number = Date.now()): boolean {
  const at = Date.parse(session.expiresAt)
  return !Number.isFinite(at) || at <= now
}

export function loadSessions(
  storage: SessionStorage | null = browserStorage(),
  now: number = Date.now(),
): SessionMap {
  if (storage === null) return {}
  let raw: string | null
  try {
    raw = storage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return {}
  }
  return raw === null ? {} : readSessions(raw, now)
}

export function readSession(
  personId: string,
  storage: SessionStorage | null = browserStorage(),
  now: number = Date.now(),
): Session | null {
  return loadSessions(storage, now)[personId] ?? null
}

// The token of one person, for the request header of their own routes
// (contract: Authorization: Bearer <token>).
export function bearerToken(
  personId: string,
  storage: SessionStorage | null = browserStorage(),
  now: number = Date.now(),
): string | null {
  return readSession(personId, storage, now)?.token ?? null
}

export function saveSession(
  session: Session,
  storage: SessionStorage | null = browserStorage(),
): void {
  if (storage === null) return
  const sessions = loadSessions(storage)
  sessions[session.personId] = session
  write(sessions, storage)
}

// Signing out forgets the session on this device. The entries stay: they are
// the person's readings, not the session's.
export function clearSession(
  personId: string,
  storage: SessionStorage | null = browserStorage(),
): void {
  if (storage === null) return
  const sessions = loadSessions(storage)
  if (!(personId in sessions)) return
  delete sessions[personId]
  write(sessions, storage)
}

// A person route answered 401: the token is dead, so it leaves this device and
// the screen asks for the PIN again. The listeners are how the screen hears it
// without the clients holding a reference to the app.
export function expireSession(
  personId: string,
  storage: SessionStorage | null = browserStorage(),
): void {
  clearSession(personId, storage)
  for (const listener of [...listeners]) listener(personId)
}

export function watchExpired(listener: ExpiredListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readSessions(raw: string, now: number): SessionMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}
  const sessions: SessionMap = {}
  for (const [personId, value] of Object.entries(parsed as object)) {
    const session = readSessionRow(personId, value)
    if (session === null || isExpired(session, now)) continue
    sessions[personId] = session
  }
  return sessions
}

// The map key is the person the session belongs to, so a row whose own
// personId says otherwise is not read.
function readSessionRow(personId: string, value: unknown): Session | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  if (row.personId !== personId) return null
  if (typeof row.token !== 'string' || row.token === '') return null
  if (typeof row.expiresAt !== 'string' || row.expiresAt === '') return null
  return { personId, token: row.token, expiresAt: row.expiresAt }
}

function write(sessions: SessionMap, storage: SessionStorage): void {
  try {
    if (Object.keys(sessions).length === 0) {
      storage.removeItem(SESSION_STORAGE_KEY)
    } else {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
    }
  } catch {
    // A browser that refuses storage leaves the app working from memory for
    // this tab; the entries the person saves have the same rule.
  }
}

function browserStorage(): SessionStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
