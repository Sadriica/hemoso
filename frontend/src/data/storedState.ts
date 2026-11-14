import { isClockTime, isMissionDay } from '../domain/clock'
import type { MissionClock } from '../domain/clock'
import type { Entry } from '../domain/types'

// The shape of the one localStorage key: the entries, the outbox and the last
// sent time (REQ-02, REQ-28). A payload written by another version, or one
// whose rows break the rules, is not read.

export const STORAGE_KEY = 'hemoso:v2'
const STORAGE_VERSION = 2

export interface StoredState {
  version: number
  entries: Entry[]
  pendingIds: string[]
  lastSent: MissionClock | null
}

// The first run: the seed rows already in place, an empty outbox and no send.
export function seedState(entries: Entry[]): StoredState {
  return {
    version: STORAGE_VERSION,
    entries: [...entries],
    pendingIds: [],
    lastSent: null,
  }
}

export function parseStoredState(raw: string): StoredState | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  if (candidate.version !== STORAGE_VERSION) return null
  const entries = readEntries(candidate.entries)
  if (entries === null) return null
  const pendingIds = readIds(candidate.pendingIds)
  if (pendingIds === null) return null
  const lastSent = candidate.lastSent
  if (lastSent !== null && !isMissionClock(lastSent)) return null
  return {
    version: STORAGE_VERSION,
    entries,
    pendingIds,
    lastSent:
      lastSent === null
        ? null
        : { missionDay: lastSent.missionDay, time: lastSent.time },
  }
}

function readEntries(value: unknown): Entry[] | null {
  if (!Array.isArray(value)) return null
  const entries: Entry[] = []
  for (const item of value) {
    if (!isEntry(item)) return null
    entries.push(item)
  }
  return entries
}

function readIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const ids: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return null
    ids.push(item)
  }
  return ids
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.personId === 'string' &&
    typeof entry.indicatorId === 'string' &&
    typeof entry.value === 'number' &&
    Number.isFinite(entry.value) &&
    typeof entry.unit === 'string' &&
    isMissionDay(entry.missionDay) &&
    typeof entry.time === 'string' &&
    isClockTime(entry.time)
  )
}

function isMissionClock(value: unknown): value is MissionClock {
  if (typeof value !== 'object' || value === null) return false
  const clock = value as Record<string, unknown>
  return (
    isMissionDay(clock.missionDay) &&
    typeof clock.time === 'string' &&
    isClockTime(clock.time)
  )
}
