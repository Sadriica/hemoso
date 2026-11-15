import { isClockTime, isMissionDay } from './clock'

// The symptom layer of the condition score (T-78, T-79; FORMATS.md section 3).
// A symptom is defined once in config/data/symptoms.csv and reported by the
// astronaut as a row of the symptom log. Nothing here says what a symptom
// means: the CMO or the flight surgeon confirms.

export interface SymptomDef {
  /** config/data/symptoms.csv `symptom_id`. */
  id: string
  /** Plain name, as the astronaut reads it. */
  name: string
  /** A red flag sends the person to the CMO before any score. */
  redFlag: boolean
  /** Listed by more than one condition: it weighs less. */
  shared: boolean
  source: string
}

export type SymptomSeverity = 1 | 2 | 3

export interface SymptomReport {
  personId: string
  symptomId: string
  /** 1 mild, 2 moderate, 3 severe. Stored; it adds nothing to the score. */
  severity: SymptomSeverity
  missionDay: number
  time: string // HH:MM
}

/** The weight of a reported symptom only one condition lists. */
export const SYMPTOM_SPECIFIC_WEIGHT = 0.5
/** The weight of a reported symptom that symptoms.csv marks `shared`. */
export const SYMPTOM_SHARED_WEIGHT = 0.25
/** A score from symptoms alone stops here, so its label is at most Possible. */
export const SYMPTOM_ONLY_CAP = 0.5

export function symptomWeight(def: SymptomDef): number {
  return def.shared ? SYMPTOM_SHARED_WEIGHT : SYMPTOM_SPECIFIC_WEIGHT
}

/** The key the server keeps one report per (docs/API.md). */
export function symptomReportKey(report: SymptomReport): string {
  return [report.personId, report.missionDay, report.time, report.symptomId].join('\u0000')
}

/**
 * The reports of the newest mission day that holds any report. An older day is
 * history, not evidence for today, and every condition reads the same day.
 */
export function newestDayReports(reports: SymptomReport[]): SymptomReport[] {
  if (reports.length === 0) return []
  const newest = Math.max(...reports.map((report) => report.missionDay))
  return reports.filter((report) => report.missionDay === newest)
}

/** Reports of one person, one per key, oldest day and time first. */
export function mergeSymptomReports(...lists: SymptomReport[][]): SymptomReport[] {
  const byKey = new Map<string, SymptomReport>()
  for (const report of lists.flat()) {
    const key = symptomReportKey(report)
    if (!byKey.has(key)) byKey.set(key, report)
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.missionDay - b.missionDay ||
      (a.time === b.time ? 0 : a.time < b.time ? -1 : 1),
  )
}

/** A stored or server report is kept only when every field is what the app writes. */
export function readSymptomReport(value: unknown): SymptomReport | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Record<string, unknown>
  const { personId, symptomId, severity, missionDay, time } = row
  if (typeof personId !== 'string' || personId === '') return null
  if (typeof symptomId !== 'string' || !/^[a-z][a-z0-9_]{0,63}$/.test(symptomId)) {
    return null
  }
  if (severity !== 1 && severity !== 2 && severity !== 3) return null
  if (!isMissionDay(missionDay)) return null
  if (typeof time !== 'string' || !isClockTime(time)) return null
  return { personId, symptomId, severity, missionDay, time }
}
