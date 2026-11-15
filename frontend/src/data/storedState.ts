import { isClockTime, isMissionDay } from '../domain/clock'
import type { MissionClock } from '../domain/clock'
import { DEFAULT_CONTEXT, isMeasurementContext } from '../domain/context'
import type { Entry } from '../domain/types'

// The shape of the one localStorage key: the entries, the outbox, the ids the
// server did not accept and the last sent time (REQ-02, REQ-28). A payload
// written by another version, or one whose rows break the rules, is not read.

export const STORAGE_KEY = 'hemoso:v2'
const STORAGE_VERSION = 2

export interface StoredState {
  version: number
  entries: Entry[]
  pendingIds: string[]
  // Ids the server answered with 409: another value is already stored for the
  // same person, indicator, day and time. They leave the outbox for good,
  // because sending them again would answer 409 again.
  conflictIds: string[]
  // Ids the server answered with 422: the row itself is wrong, so a retry
  // cannot fix it. They stay in the entries, out of the outbox.
  rejectedIds: string[]
  lastSent: MissionClock | null
}

// The first run: the seed rows already in place, an empty outbox and no send.
export function seedState(entries: Entry[]): StoredState {
  return {
    version: STORAGE_VERSION,
    entries: [...entries],
    pendingIds: [],
    conflictIds: [],
    rejectedIds: [],
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
  // A payload written before the server answers were tracked has neither list.
  // It is read with empty lists instead of being thrown away, so a save kept
  // on this device survives this change.
  const conflictIds = readIdsMissingAsEmpty(candidate.conflictIds)
  if (conflictIds === null) return null
  const rejectedIds = readIdsMissingAsEmpty(candidate.rejectedIds)
  if (rejectedIds === null) return null
  const lastSent = candidate.lastSent
  if (lastSent !== null && !isMissionClock(lastSent)) return null
  return {
    version: STORAGE_VERSION,
    entries,
    pendingIds,
    conflictIds,
    rejectedIds,
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
    const entry = readEntry(item)
    if (entry === null) return null
    entries.push(entry)
  }
  return entries
}

// One stored entry, with the context a payload written before the app recorded
// one loads as 'rest': those readings were taken without an exercise or a sleep
// step around them, and dropping the whole payload would lose the save.
function readEntry(value: unknown): Entry | null {
  if (typeof value !== 'object' || value === null) return null
  const entry = value as Record<string, unknown>
  if (
    typeof entry.id !== 'string' ||
    typeof entry.personId !== 'string' ||
    typeof entry.indicatorId !== 'string' ||
    typeof entry.value !== 'number' ||
    !Number.isFinite(entry.value) ||
    typeof entry.unit !== 'string' ||
    !isMissionDay(entry.missionDay) ||
    typeof entry.time !== 'string' ||
    !isClockTime(entry.time)
  ) {
    return null
  }
  const context = entry.context === undefined ? DEFAULT_CONTEXT : entry.context
  if (!isMeasurementContext(context)) return null
  return {
    id: entry.id,
    personId: entry.personId,
    indicatorId: entry.indicatorId,
    value: entry.value,
    unit: entry.unit,
    missionDay: entry.missionDay,
    time: entry.time,
    context,
  }
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

function readIdsMissingAsEmpty(value: unknown): string[] | null {
  return value === undefined ? [] : readIds(value)
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
