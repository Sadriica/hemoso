// Pain and injury reports in the browser, and nothing else: they never leave
// this device (Wambi: the report is stored locally only). One localStorage key,
// `hemoso:pain:v1`, holds every report of every person on this device, and a
// read that hits bad data gives back the rows it can read instead of throwing.

import { isClockTime, isMissionDay } from '../domain/clock'
import { newEntryId } from './entryId'

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

/**
 * The reports kept on this device for one person, newest first. A blocked,
 * missing or unreadable storage gives an empty list; nothing is thrown.
 */
export function readPainReports(
  personId: string,
  storage: PainStorage | null = browserStorage(),
): PainReport[] {
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
    .filter((report) => report.personId === personId)
    .sort(newestFirst)
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
  const others = readPainReports(report.personId, storage).filter(
    (kept) => kept.id !== report.id,
  )
  const payload: StoredPayload = {
    version: STORAGE_VERSION,
    reports: [...others, report],
  }
  try {
    storage.setItem(PAIN_STORAGE_KEY, JSON.stringify(payload))
    return { report, saved: true }
  } catch {
    return { report, saved: false }
  }
}
