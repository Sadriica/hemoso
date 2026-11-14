import { describe, expect, it } from 'vitest'
import { parseStoredState, seedState } from './storedState'
import type { Entry } from '../domain/types'

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'a',
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value: 1,
    unit: 'example_unit',
    missionDay: 1,
    time: '08:00',
    ...overrides,
  }
}

function stored(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 2,
    entries: [entry()],
    pendingIds: ['a'],
    conflictIds: [],
    rejectedIds: [],
    lastSent: { missionDay: 1, time: '08:00' },
    ...overrides,
  })
}

describe('parseStoredState', () => {
  it('reads a valid state', () => {
    expect(parseStoredState(stored())).toEqual({
      version: 2,
      entries: [entry()],
      pendingIds: ['a'],
      conflictIds: [],
      rejectedIds: [],
      lastSent: { missionDay: 1, time: '08:00' },
    })
  })

  it('reads the refused ids', () => {
    const state = parseStoredState(
      stored({ conflictIds: ['b'], rejectedIds: ['c', 'd'] }),
    )
    expect(state?.conflictIds).toEqual(['b'])
    expect(state?.rejectedIds).toEqual(['c', 'd'])
  })

  it('reads a payload without the refused lists as empty', () => {
    const state = parseStoredState(
      JSON.stringify({
        version: 2,
        entries: [entry()],
        pendingIds: ['a'],
        lastSent: null,
      }),
    )
    expect(state?.conflictIds).toEqual([])
    expect(state?.rejectedIds).toEqual([])
  })

  it('rejects a refused list that is not a list of ids', () => {
    expect(parseStoredState(stored({ conflictIds: [1] }))).toBeNull()
    expect(parseStoredState(stored({ rejectedIds: 'c' }))).toBeNull()
  })

  it('rejects broken JSON', () => {
    expect(parseStoredState('{"version":2,"entries":[]')).toBeNull()
  })

  it('rejects a state written by another version', () => {
    expect(parseStoredState(stored({ version: 1 }))).toBeNull()
  })

  it('rejects an entry with an impossible mission day', () => {
    expect(parseStoredState(stored({ entries: [entry({ missionDay: 2.5 })] }))).toBeNull()
    expect(parseStoredState(stored({ entries: [entry({ missionDay: 0 })] }))).toBeNull()
  })

  it('rejects an entry with a time that is not HH:MM', () => {
    expect(parseStoredState(stored({ entries: [entry({ time: '9:5' })] }))).toBeNull()
  })

  it('rejects an entry with an empty id or a missing value', () => {
    expect(parseStoredState(stored({ entries: [{ ...entry(), id: 3 }] }))).toBeNull()
    expect(
      parseStoredState(stored({ entries: [{ ...entry(), value: '1' }] })),
    ).toBeNull()
  })

  it('rejects a last sent time that is not a mission day and time', () => {
    expect(parseStoredState(stored({ lastSent: { missionDay: 0, time: '09:20' } }))).toBeNull()
    expect(parseStoredState(stored({ lastSent: { missionDay: 1, time: '9:20' } }))).toBeNull()
  })

  it('rejects an outbox that is not a list of ids', () => {
    expect(parseStoredState(stored({ pendingIds: [1] }))).toBeNull()
    expect(parseStoredState(stored({ pendingIds: 'a' }))).toBeNull()
  })
})

describe('seedState', () => {
  it('holds the seed rows, an empty outbox and no last sent time', () => {
    const rows = [entry()]
    const state = seedState(rows)
    expect(state).toEqual({
      version: 2,
      entries: rows,
      pendingIds: [],
      conflictIds: [],
      rejectedIds: [],
      lastSent: null,
    })
    expect(state.entries).not.toBe(rows)
  })
})
