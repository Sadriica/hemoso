// Symptom reports in the browser (T-80). One localStorage key,
// `hemoso:symptoms:v1`, holds every report of every person on this device, and
// a read that hits bad data gives back the rows it can read instead of
// throwing. A report is saved here first and always stays here, so the score on
// this device counts it with no server; for a person with an account it also
// goes out through data/symptomOutbox.ts, and the reports the server holds come
// back into this store (mergeServerSymptomReports).

import {
  mergeSymptomReports,
  readSymptomReport,
  type SymptomReport,
} from '../domain/symptoms'
import { enqueueSymptomReports } from './symptomOutbox'

export const SYMPTOM_STORAGE_KEY = 'hemoso:symptoms:v1'
const STORAGE_VERSION = 1

/** The part of the Storage API this store needs, so tests can inject a fake. */
export interface SymptomStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const listeners = new Set<() => void>()

function browserStorage(): SymptomStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Called after every change of the stored reports. */
export function subscribeSymptoms(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readAll(storage: SymptomStorage | null): SymptomReport[] {
  if (storage === null) return []
  let raw: string | null
  try {
    raw = storage.getItem(SYMPTOM_STORAGE_KEY)
  } catch {
    return []
  }
  if (raw === null) return []
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof value !== 'object' || value === null) return []
  const payload = value as { version?: unknown; reports?: unknown }
  if (payload.version !== STORAGE_VERSION || !Array.isArray(payload.reports)) {
    return []
  }
  return payload.reports
    .map(readSymptomReport)
    .filter((report): report is SymptomReport => report !== null)
}

function writeAll(
  reports: SymptomReport[],
  storage: SymptomStorage | null,
): boolean {
  if (storage === null) return false
  try {
    storage.setItem(
      SYMPTOM_STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, reports }),
    )
  } catch {
    return false
  }
  for (const listener of [...listeners]) listener()
  return true
}

/** One person's stored reports, oldest day and time first. */
export function readSymptomReports(
  personId: string,
  storage: SymptomStorage | null = browserStorage(),
): SymptomReport[] {
  return mergeSymptomReports(
    readAll(storage).filter((report) => report.personId === personId),
  )
}

/**
 * Saves reports and queues them for the server. A report with a key the device
 * already holds is not added twice. Returns how many were added; 0 when storage
 * is blocked, where nothing is kept and the screen says so.
 */
export function saveSymptomReports(
  reports: SymptomReport[],
  storage: SymptomStorage | null = browserStorage(),
): number {
  if (storage === null || reports.length === 0) return 0
  const stored = readAll(storage)
  const merged = mergeSymptomReports(stored, reports)
  const added = merged.length - mergeSymptomReports(stored).length
  if (added === 0) return 0
  if (!writeAll(merged, storage)) return 0
  enqueueSymptomReports(reports, storage)
  return added
}

/** The reports the server holds join this device's store. */
export function mergeServerSymptomReports(
  rows: SymptomReport[],
  storage: SymptomStorage | null = browserStorage(),
): void {
  if (storage === null || rows.length === 0) return
  const stored = readAll(storage)
  const merged = mergeSymptomReports(stored, rows)
  if (merged.length === mergeSymptomReports(stored).length) return
  writeAll(merged, storage)
}
