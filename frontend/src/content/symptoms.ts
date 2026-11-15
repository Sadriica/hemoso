import { isClockTime, isMissionDay } from '../domain/clock'
import type { SymptomDef, SymptomReport } from '../domain/symptoms'
import { parseCsvFile } from './csv'

const SYMPTOM_COLUMNS = ['symptom_id', 'name', 'red_flag', 'shared', 'source']
const LOG_COLUMNS = ['person_id', 'mission_day', 'time', 'symptom_id', 'severity']

// Validates and reads config/data/symptoms.csv (T-78). A row that cannot be
// shown safely (no id, no name, a yes/no cell that is neither) is left out and
// reported.
export function parseSymptoms(
  fileName: string,
  text: string,
  problems: string[],
): SymptomDef[] {
  const defs: SymptomDef[] = []
  const seen = new Set<string>()
  for (const row of parseCsvFile(fileName, text, problems, SYMPTOM_COLUMNS)) {
    const id = row.symptom_id?.trim() ?? ''
    const name = row.name?.trim() ?? ''
    if (!/^[a-z][a-z0-9_]*$/.test(id) || name === '') {
      problems.push(`A symptom in ${fileName} has no valid id or no name.`)
      continue
    }
    if (seen.has(id)) {
      problems.push(`Duplicate symptom id '${id}'.`)
      continue
    }
    const redFlag = yesNo(row.red_flag)
    const shared = yesNo(row.shared)
    if (redFlag === null || shared === null) {
      problems.push(`Symptom '${id}' needs yes or no in red_flag and shared.`)
      continue
    }
    const source = row.source?.trim() ?? ''
    if (source !== 'Assumption' && !/^https?:\/\//.test(source)) {
      problems.push(`Symptom '${id}' has no source or Assumption.`)
      continue
    }
    seen.add(id)
    defs.push({ id, name, redFlag, shared, source })
  }
  return defs
}

// Validates and reads config/data/symptom_log.csv, the demo astronaut's
// reports. A row naming a symptom symptoms.csv does not define is reported and
// left out.
export function parseSymptomLog(
  fileName: string,
  text: string,
  defs: SymptomDef[],
  problems: string[],
): SymptomReport[] {
  const known = new Set(defs.map((def) => def.id))
  const reports: SymptomReport[] = []
  for (const row of parseCsvFile(fileName, text, problems, LOG_COLUMNS)) {
    const personId = row.person_id?.trim() ?? ''
    const symptomId = row.symptom_id?.trim() ?? ''
    const missionDay = Number(row.mission_day?.trim())
    const time = row.time?.trim() ?? ''
    const severity = Number(row.severity?.trim())
    if (
      personId === '' ||
      !known.has(symptomId) ||
      !isMissionDay(missionDay) ||
      !isClockTime(time) ||
      (severity !== 1 && severity !== 2 && severity !== 3)
    ) {
      problems.push(`A row in ${fileName} breaks the symptom log format.`)
      continue
    }
    reports.push({ personId, symptomId, severity, missionDay, time })
  }
  return reports
}

function yesNo(cell: string | undefined): boolean | null {
  const value = cell?.trim().toLowerCase()
  if (value === 'yes') return true
  if (value === 'no') return false
  return null
}
