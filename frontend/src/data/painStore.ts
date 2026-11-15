// Pain and injury reports in the browser. One localStorage key,
// `hemoso:pain:v1`, holds every report of every person on this device, and a
// read that hits bad data gives back the rows it can read instead of throwing.
// A report is saved here first and always stays here; for a person with an
// account it also goes out through the outbox of data/painOutbox.ts, and the
// reports the server holds come back into this store (mergeServerPainReports).

import { isClockTime, isMissionDay } from '../domain/clock'
import { newEntryId } from './entryId'
import { dropPainReport, enqueuePainReport } from './painOutbox'

export const PAIN_STORAGE_KEY = 'hemoso:pain:v1'
const STORAGE_VERSION = 1

/** What the astronaut marked. Plain words; none of them is a condition. */
export const INJURY_KINDS = [
  'pain',
  'swelling',
  'bruise',
  'cut_or_scrape',
  'burn',
  'sprain_or_strain',
] as const

export type InjuryKind = (typeof INJURY_KINDS)[number]

export interface PainRegionMark {
  /** Region id from components/body3d/regions.ts. */
  regionId: string
  kind: InjuryKind
  /** 0 is none, 10 is the worst (the words on the slider). */
  intensity: number
}

export interface PainReport {
  id: string
  personId: string
  missionDay: number
  time: string // HH:MM
  regions: PainRegionMark[]
  note: string
}

/** The part of the Storage API this store needs, so tests can inject a fake. */
export interface PainStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * One report as GET /people/{person_id}/pain returns it, already mapped by
 * data/painClient.ts: one region, where the device keeps a list of them under
 * one report.
 */
export interface ServerPainReport {
  personId: string
  regionId: string
  kind: InjuryKind
  intensity: number
  missionDay: number
  time: string
  note: string | null
}

interface StoredPayload {
  version: number
  reports: PainReport[]
}

function browserStorage(): PainStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** A stored report is kept only when every field is the type the app writes. */
function readMark(value: unknown): PainRegionMark | null {
  if (typeof value !== 'object' || value === null) return null
  const mark = value as Record<string, unknown>
  const { regionId, kind, intensity } = mark
  if (typeof regionId !== 'string' || regionId.length === 0) return null
  if (typeof kind !== 'string' || !(INJURY_KINDS as readonly string[]).includes(kind)) return null
  if (typeof intensity !== 'number' || !Number.isInteger(intensity)) return null
  if (intensity < 0 || intensity > 10) return null
  return { regionId, kind: kind as InjuryKind, intensity }
}

function readReport(value: unknown): PainReport | null {
  if (typeof value !== 'object' || value === null) return null
  const report = value as Record<string, unknown>
  const { id, personId, missionDay, time, regions, note } = report
  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof personId !== 'string' || personId.length === 0) return null
  if (!isMissionDay(missionDay)) return null
  if (typeof time !== 'string' || !isClockTime(time)) return null
  if (!Array.isArray(regions) || regions.length === 0) return null
  const marks = regions.map(readMark)
  if (marks.some((mark) => mark === null)) return null
  if (typeof note !== 'string') return null
  return {
    id,
    personId,
    missionDay,
    time,
    regions: marks as PainRegionMark[],
    note,
  }
}

/** Newest first: the latest day, then the latest clock time. */
function newestFirst(a: PainReport, b: PainReport): number {
  if (a.missionDay !== b.missionDay) return b.missionDay - a.missionDay
  if (a.time === b.time) return 0
  return a.time < b.time ? 1 : -1
}

/** Every valid report on this device, whoever it belongs to, in stored order. */
function readAllReports(storage: PainStorage | null): PainReport[] {
  if (storage === null) return []
  let raw: string | null
  try {
    raw = storage.getItem(PAIN_STORAGE_KEY)
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
  const candidate = value as Partial<StoredPayload>
  if (candidate.version !== STORAGE_VERSION) return []
  if (!Array.isArray(candidate.reports)) return []
  // Rows written by another version of the app are dropped one by one, so one
  // bad row never hides the reports around it.
  return candidate.reports
    .map(readReport)
    .filter((report): report is PainReport => report !== null)
}

/**
 * The reports kept on this device for one person, newest first. A blocked,
 * missing or unreadable storage gives an empty list; nothing is thrown.
 */
export function readPainReports(
  personId: string,
  storage: PainStorage | null = browserStorage(),
): PainReport[] {
  return readAllReports(storage)
    .filter((report) => report.personId === personId)
    .sort(newestFirst)
}

function writeReports(
  reports: PainReport[],
  storage: PainStorage,
): boolean {
  const payload: StoredPayload = { version: STORAGE_VERSION, reports }
  try {
    storage.setItem(PAIN_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

/**
 * Stores one report and gives back what was written, or null when the write
 * failed (a blocked storage, a full one). Every write is in a try/catch.
 */
export function savePainReport(
  input: Omit<PainReport, 'id'>,
  storage: PainStorage | null = browserStorage(),
): { report: PainReport; saved: boolean } {
  const report: PainReport = {
    ...input,
    id: newEntryId(),
    note: input.note.trim().slice(0, 280),
    regions: input.regions.map((mark) => ({
      ...mark,
      intensity: Math.min(10, Math.max(0, Math.round(mark.intensity))),
    })),
  }
  if (storage === null) return { report, saved: false }
  // Every other report stays, whoever it belongs to: saving one never drops
  // the reports of another person on the same device.
  const others = readAllReports(storage).filter((kept) => kept.id !== report.id)
  const saved = writeReports([...others, report], storage)
  // The device copy is the record; the outbox is the copy the server gets when
  // that person has an account, and it holds the report until a route takes it.
  enqueuePainReport(report, storage)
  return { report, saved }
}

/**
 * Removes one report by id and tells whether the device kept the change. An id
 * that is not stored changes nothing and counts as removed.
 */
export function removePainReport(
  id: string,
  storage: PainStorage | null = browserStorage(),
): boolean {
  if (storage === null) return false
  const all = readAllReports(storage)
  // What this report still owed the server goes with it: a report the person
  // deleted is never sent later.
  dropPainReport(id, storage)
  if (!all.some((report) => report.id === id)) return true
  return writeReports(
    all.filter((report) => report.id !== id),
    storage,
  )
}

/**
 * Merges the reports the server holds into this device's store (REQ-37), so the
 * phone and the PC show the same reports. The key is the route's: person,
 * region, mission day and time. A day and time this device has nothing for
 * becomes a new report with the regions the server holds for it; a region it
 * has no mark for is added to the report it already has there. Nothing is
 * deleted, and where both hold one, the device's own note and intensity stay.
 * A row this app cannot read is skipped, never guessed. Returns true when the
 * store changed.
 */
export function mergeServerPainReports(
  rows: ServerPainReport[],
  storage: PainStorage | null = browserStorage(),
): boolean {
  if (storage === null) return false
  const reports = readAllReports(storage)
  // One device report per person, day and time, which is where the server's
  // regions of that moment are read into.
  const byTime = new Map<string, PainReport>()
  for (const report of reports) {
    byTime.set(
      `${report.personId}\u0000${report.missionDay}\u0000${report.time}`,
      report,
    )
  }
  let changed = false
  for (const row of rows) {
    const mark = readMark({
      regionId: row.regionId,
      kind: row.kind,
      intensity: row.intensity,
    })
    if (mark === null) continue
    if (typeof row.personId !== 'string' || row.personId === '') continue
    if (!isMissionDay(row.missionDay)) continue
    if (typeof row.time !== 'string' || !isClockTime(row.time)) continue
    const key = `${row.personId}\u0000${row.missionDay}\u0000${row.time}`
    const existing = byTime.get(key)
    if (existing === undefined) {
      const created: PainReport = {
        id: newEntryId(),
        personId: row.personId,
        missionDay: row.missionDay,
        time: row.time,
        regions: [mark],
        note: (row.note ?? '').trim().slice(0, 280),
      }
      reports.push(created)
      byTime.set(key, created)
      changed = true
      continue
    }
    if (existing.regions.some((kept) => kept.regionId === mark.regionId)) continue
    existing.regions = [...existing.regions, mark]
    changed = true
  }
  if (changed) writeReports(reports, storage)
  return changed
}
