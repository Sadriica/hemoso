import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from './entryStore'
import { STORAGE_KEY } from './storedState'
import type { Entry } from '../domain/types'

class MemoryStorage {
  readonly items = new Map<string, string>()

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

const failingStorage = {
  getItem(): string | null {
    throw new Error('storage is blocked')
  },
  setItem(): void {
    throw new Error('storage is full')
  },
}

function entry(id: string, personId = 'demo_astronaut_1'): Entry {
  return {
    id,
    personId,
    indicatorId: 'example_indicator',
    value: 1,
    unit: 'example_unit',
    missionDay: 1,
    time: '08:00',
  }
}

function newEntry(
  personId = 'demo_astronaut_1',
  indicatorId = 'example_indicator',
): Omit<Entry, 'id'> {
  return {
    personId,
    indicatorId,
    value: 2,
    unit: 'example_unit',
    missionDay: 2,
    time: '09:15',
  }
}

describe('LocalEntryStore', () => {
  it('starts from the seed entries and has nothing pending', () => {
    const store = new LocalEntryStore({
      storage: new MemoryStorage(),
      seedEntries: [entry('a'), entry('b')],
    })
    expect(store.list().map((item) => item.id)).toEqual(['a', 'b'])
    expect(store.pending()).toEqual([])
    expect(store.lastSent()).toBeNull()
    expect(store.isPersistent()).toBe(true)
  })

  it('is not a reset on the first run', () => {
    const store = new LocalEntryStore({
      storage: new MemoryStorage(),
      seedEntries: [entry('a')],
    })
    expect(store.wasReset()).toBe(false)
  })

  it('replaces stored data it cannot read and reports the reset', () => {
    const storage = new MemoryStorage()
    storage.items.set(STORAGE_KEY, '{"version":2,"entries":[]')
    const store = new LocalEntryStore({ storage, seedEntries: [entry('a')] })
    expect(store.wasReset()).toBe(true)
    expect(store.list().map((item) => item.id)).toEqual(['a'])
    expect(store.isPersistent()).toBe(true)
  })

  it('is not a reset when the stored data is read', () => {
    const storage = new MemoryStorage()
    new LocalEntryStore({ storage, seedEntries: [entry('a')] })
    const next = new LocalEntryStore({ storage })
    expect(next.wasReset()).toBe(false)
    expect(next.list().map((item) => item.id)).toEqual(['a'])
  })

  it('adds an entry with its own id and lists it with filters', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const first = store.add(newEntry('demo_astronaut_1', 'example_indicator'))
    const second = store.add(newEntry('demo_astronaut_2', 'example_indicator'))
    const third = store.add(newEntry('demo_astronaut_1', 'other_indicator'))

    expect(first.id).not.toBe(second.id)
    expect(first.id).not.toBe('')
    expect(store.list()).toHaveLength(3)
    expect(store.list({ personId: 'demo_astronaut_1' }).map((item) => item.id)).toEqual([
      first.id,
      third.id,
    ])
    expect(store.list({ indicatorId: 'example_indicator' }).map((item) => item.id)).toEqual([
      first.id,
      second.id,
    ])
    expect(
      store
        .list({ personId: 'demo_astronaut_1', indicatorId: 'other_indicator' })
        .map((item) => item.id),
    ).toEqual([third.id])
  })

  it('keeps the entries and the outbox across two instances on one storage', () => {
    const storage = new MemoryStorage()
    const first = new LocalEntryStore({ storage, seedEntries: [entry('a')] })
    const added = first.add(newEntry())

    const second = new LocalEntryStore({ storage })
    expect(second.list().map((item) => item.id)).toEqual(['a', added.id])
    expect(second.pending().map((item) => item.id)).toEqual([added.id])
  })

  it('seeds only once', () => {
    const storage = new MemoryStorage()
    new LocalEntryStore({ storage, seedEntries: [entry('a')] })
    const next = new LocalEntryStore({ storage, seedEntries: [entry('b')] })
    expect(next.list().map((item) => item.id)).toEqual(['a'])
  })

  it('writes version 2 with the entries, the outbox and the last sent time', () => {
    const storage = new MemoryStorage()
    const store = new LocalEntryStore({ storage, seedEntries: [entry('a')] })
    const added = store.add(newEntry())
    store.markSent([added.id], { missionDay: 2, time: '09:20' })

    const raw = storage.items.get(STORAGE_KEY)
    expect(raw).toBeDefined()
    const stored: unknown = JSON.parse(raw ?? '')
    expect(stored).toMatchObject({
      version: 2,
      pendingIds: [],
      conflictIds: [],
      rejectedIds: [],
      lastSent: { missionDay: 2, time: '09:20' },
    })
  })

  it('marks only the given pending entries as sent', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const first = store.add(newEntry())
    const second = store.add(newEntry())
    expect(store.pending().map((item) => item.id)).toEqual([first.id, second.id])

    store.markSent([first.id], { missionDay: 2, time: '09:20' })
    expect(store.pending().map((item) => item.id)).toEqual([second.id])
    expect(store.lastSent()).toEqual({ missionDay: 2, time: '09:20' })
    expect(store.list().map((item) => item.id)).toEqual([first.id, second.id])
  })

  it('keeps the last sent time when the server sends no new id', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const added = store.add(newEntry())
    store.markSent([added.id], { missionDay: 2, time: '09:20' })
    store.markSent([added.id], { missionDay: 3, time: '10:00' })
    store.markSent([], { missionDay: 4, time: '11:00' })
    expect(store.lastSent()).toEqual({ missionDay: 2, time: '09:20' })
  })

  it('keeps working in memory when the storage throws', () => {
    const store = new LocalEntryStore({
      storage: failingStorage,
      seedEntries: [entry('a')],
    })
    expect(store.isPersistent()).toBe(false)
    const added = store.add(newEntry())
    expect(store.list().map((item) => item.id)).toEqual(['a', added.id])
    expect(store.pending().map((item) => item.id)).toEqual([added.id])
  })

  it('keeps working in memory when the storage is missing', () => {
    const store = new LocalEntryStore({ storage: null })
    expect(store.isPersistent()).toBe(false)
    expect(store.add(newEntry()).value).toBe(2)
    expect(store.list()).toHaveLength(1)
  })

  it('notifies subscribers on every add and stops after unsubscribe', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })

    store.add(newEntry())
    expect(calls).toBe(1)
    store.add(newEntry())
    expect(calls).toBe(2)

    unsubscribe()
    store.add(newEntry())
    expect(calls).toBe(2)
  })

  it('keeps the same snapshot until something changes', () => {
    const store = new LocalEntryStore({
      storage: new MemoryStorage(),
      seedEntries: [entry('a')],
    })
    const snapshot = store.getSnapshot()
    expect(store.getSnapshot()).toBe(snapshot)

    store.add(newEntry())
    expect(store.getSnapshot()).not.toBe(snapshot)
    expect(store.getSnapshot()).toHaveLength(2)
  })

  it('keeps the outbox snapshot until add or markSent changes it', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const first = store.getOutboxSnapshot()
    expect(store.getOutboxSnapshot()).toBe(first)
    expect(first).toEqual({
      pendingCount: 0,
      conflictCount: 0,
      rejectedCount: 0,
      lastSent: null,
    })

    const added = store.add(newEntry())
    const afterAdd = store.getOutboxSnapshot()
    expect(afterAdd).not.toBe(first)
    expect(afterAdd.pendingCount).toBe(1)
    expect(store.getOutboxSnapshot()).toBe(afterAdd)

    store.markSent([added.id], { missionDay: 2, time: '09:20' })
    const afterSent = store.getOutboxSnapshot()
    expect(afterSent).not.toBe(afterAdd)
    expect(afterSent).toEqual({
      pendingCount: 0,
      conflictCount: 0,
      rejectedCount: 0,
      lastSent: { missionDay: 2, time: '09:20' },
    })
    expect(store.getOutboxSnapshot()).toBe(afterSent)
  })

  it('keeps the outbox snapshot when nothing was pending to send', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const before = store.getOutboxSnapshot()
    store.markSent(['unknown-id'], { missionDay: 2, time: '09:20' })
    expect(store.getOutboxSnapshot()).toBe(before)
  })

  it('takes a conflict out of the outbox and keeps the entry', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const added = store.add(newEntry())

    store.markConflict(added.id)

    expect(store.pending()).toEqual([])
    expect(store.list().map((item) => item.id)).toEqual([added.id])
    expect(store.getOutboxSnapshot()).toEqual({
      pendingCount: 0,
      conflictCount: 1,
      rejectedCount: 0,
      lastSent: null,
    })
    expect(store.lastSent()).toBeNull()
  })

  it('takes a rejected entry out of the outbox and keeps the entry', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const added = store.add(newEntry())

    store.markRejected(added.id)

    expect(store.pending()).toEqual([])
    expect(store.list().map((item) => item.id)).toEqual([added.id])
    expect(store.getOutboxSnapshot()).toEqual({
      pendingCount: 0,
      conflictCount: 0,
      rejectedCount: 1,
      lastSent: null,
    })
  })

  it('ignores a conflict or a rejection for an id that is not waiting', () => {
    const store = new LocalEntryStore({ storage: new MemoryStorage() })
    const before = store.getOutboxSnapshot()

    store.markConflict('unknown-id')
    store.markRejected('unknown-id')

    expect(store.getOutboxSnapshot()).toBe(before)
  })

  it('remembers conflicts and rejected ids across two instances', () => {
    const storage = new MemoryStorage()
    const first = new LocalEntryStore({ storage })
    const conflict = first.add(newEntry())
    const rejected = first.add(newEntry())
    first.markConflict(conflict.id)
    first.markRejected(rejected.id)

    const second = new LocalEntryStore({ storage })
    expect(second.pending()).toEqual([])
    expect(second.getOutboxSnapshot()).toEqual({
      pendingCount: 0,
      conflictCount: 1,
      rejectedCount: 1,
      lastSent: null,
    })
  })

  it('keeps the last sent time and an empty outbox across two instances', () => {
    const storage = new MemoryStorage()
    const first = new LocalEntryStore({ storage })
    const added = first.add(newEntry())
    first.markSent([added.id], { missionDay: 2, time: '09:20' })

    const second = new LocalEntryStore({ storage })
    expect(second.pending()).toEqual([])
    expect(second.lastSent()).toEqual({ missionDay: 2, time: '09:20' })
    expect(second.wasReset()).toBe(false)
  })
})
