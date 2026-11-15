import { useSyncExternalStore } from 'react'

// Each astronaut's mission start, kept on this device only (map personId ->
// YYYY-MM-DD) until the backend resumes. Storage can be missing or full, so
// every access is guarded and a failed write still holds for this page load.
export const MISSION_START_KEY = 'hemoso:mission:v1'

const memory: Record<string, string> = {}
const listeners = new Set<() => void>()

/** True for a real calendar date written YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Today's local calendar date as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${String(now.getFullYear()).padStart(4, '0')}-${month}-${day}`
}

function readAll(): Record<string, string> {
  const starts: Record<string, string> = {}
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MISSION_START_KEY) ?? '{}')
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const [person, date] of Object.entries(raw)) {
        if (isIsoDate(date)) starts[person] = date
      }
    }
  } catch {
    /* storage blocked or the value is not JSON: start from nothing */
  }
  return { ...starts, ...memory }
}

/** The saved mission start of a person, or null when none was set. */
export function getMissionStart(personId: string): string | null {
  return readAll()[personId] ?? null
}

/** Saves a person's mission start. Ignores a date that is not YYYY-MM-DD. */
export function setMissionStart(personId: string, date: string): void {
  if (!isIsoDate(date)) return
  memory[personId] = date
  try {
    const stored: Record<string, string> = JSON.parse(localStorage.getItem(MISSION_START_KEY) ?? '{}')
    localStorage.setItem(MISSION_START_KEY, JSON.stringify({ ...stored, [personId]: date }))
    delete memory[personId]
  } catch {
    /* kept in memory for this page load */
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

/** The mission start of `personId` (null: none), re-read when it changes. */
export function useMissionStart(personId: string | null): string | null {
  return useSyncExternalStore(subscribe, () => (personId ? getMissionStart(personId) : null))
}
