import type { MissionClock } from '../domain/clock'
import type { Entry } from '../domain/types'
import { newEntryId } from './entryId'
import { STORAGE_KEY, parseStoredState, seedState } from './storedState'
import type { StoredState } from './storedState'

// The astronaut's entries in the browser, plus the outbox of entries the
// server has not accepted yet (REQ-02, REQ-28). One localStorage key holds
// both, and the app keeps working from memory when the browser blocks it.

type EntryFilter = {
  personId?: string
  indicatorId?: string
}

export interface EntryStore {
  list(filter?: EntryFilter): Entry[]
  add(entry: Omit<Entry, 'id'>): Entry
  // false once a read or a write has failed: the screens then say the entries
  // are not saved on this device.
  isPersistent(): boolean
  // true when stored data existed and could not be read, so the seed rows
  // replaced it. A first run is not a reset.
  wasReset(): boolean
  subscribe(listener: () => void): () => void
  // The same array until something changes (useSyncExternalStore).
  getSnapshot(): Entry[]
}

export interface Outbox {
  pending(): Entry[]
  markSent(ids: string[], at: MissionClock): void
  lastSent(): MissionClock | null
  // The waiting count and the last sent time as one object that keeps its
  // identity until add or markSent changes it (useSyncExternalStore).
  getOutboxSnapshot(): OutboxSnapshot
}

export interface OutboxSnapshot {
  pendingCount: number
  lastSent: MissionClock | null
}

// The part of the Storage API the store needs, so tests can inject a fake or
// a storage that throws.
interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface LocalEntryStoreOptions {
  // Rows written on the first run, when the key is absent: the demo data the
  // caller reads from config/ with loadContent(). The store itself reads no
  // content file.
  seedEntries?: Entry[]
  // Tests pass a fake storage; the app leaves it out to use localStorage.
  storage?: StorageLike | null
}

export class LocalEntryStore implements EntryStore, Outbox {
  private readonly storage: StorageLike | null
  private readonly seedEntries: Entry[]
  private readonly listeners = new Set<() => void>()
  private state: StoredState
  private snapshot: Entry[]
  private outboxSnapshot: OutboxSnapshot
  private persistent = true
  private reset = false

  constructor(options: LocalEntryStoreOptions = {}) {
    this.storage =
      options.storage === undefined ? browserStorage() : options.storage
    this.seedEntries = options.seedEntries ?? []
    this.state = this.restore()
    this.snapshot = this.state.entries
    this.outboxSnapshot = outboxSnapshotOf(this.state)
  }

  list(filter: EntryFilter = {}): Entry[] {
    return this.state.entries.filter(
      (entry) =>
        (filter.personId === undefined ||
          entry.personId === filter.personId) &&
        (filter.indicatorId === undefined ||
          entry.indicatorId === filter.indicatorId),
    )
  }

  add(entry: Omit<Entry, 'id'>): Entry {
    const created: Entry = { ...entry, id: newEntryId() }
    this.commit({
      ...this.state,
      entries: [...this.state.entries, created],
      pendingIds: [...this.state.pendingIds, created.id],
    })
    return created
  }

  isPersistent(): boolean {
    return this.persistent
  }

  wasReset(): boolean {
    return this.reset
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): Entry[] {
    return this.snapshot
  }

  pending(): Entry[] {
    const pendingIds = new Set(this.state.pendingIds)
    return this.state.entries.filter((entry) => pendingIds.has(entry.id))
  }

  // Only ids still in the outbox count, so a repeated answer from the server
  // does not move the last sent time.
  markSent(ids: string[], at: MissionClock): void {
    const sent = new Set(ids)
    const pendingIds = this.state.pendingIds.filter((id) => !sent.has(id))
    if (pendingIds.length === this.state.pendingIds.length) return
    this.commit({ ...this.state, pendingIds, lastSent: { ...at } })
  }

  lastSent(): MissionClock | null {
    return this.state.lastSent === null ? null : { ...this.state.lastSent }
  }

  getOutboxSnapshot(): OutboxSnapshot {
    return this.outboxSnapshot
  }

  private restore(): StoredState {
    const raw = this.read()
    const stored = raw === null ? null : parseStoredState(raw)
    if (stored !== null) return stored
    this.reset = raw !== null
    const seeded = seedState(this.seedEntries)
    this.write(seeded)
    return seeded
  }

  private read(): string | null {
    if (this.storage === null) {
      this.persistent = false
      return null
    }
    try {
      return this.storage.getItem(STORAGE_KEY)
    } catch {
      this.persistent = false
      return null
    }
  }

  private commit(next: StoredState): void {
    this.state = next
    this.snapshot = next.entries
    this.outboxSnapshot = outboxSnapshotOf(next)
    this.write(next)
    for (const listener of [...this.listeners]) listener()
  }

  private write(state: StoredState): void {
    if (this.storage === null) {
      this.persistent = false
      return
    }
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      this.persistent = false
    }
  }
}

function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function outboxSnapshotOf(state: StoredState): OutboxSnapshot {
  return {
    pendingCount: state.pendingIds.length,
    lastSent: state.lastSent === null ? null : { ...state.lastSent },
  }
}
