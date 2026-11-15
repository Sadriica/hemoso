import { isClockTime, isMissionDay } from '../domain/clock'
import {
  DEFAULT_CONTEXT,
  isMeasurementContext,
} from '../domain/context'
import type { Entry, Indicator, MeasurementContext } from '../domain/types'
import { parseCsvFile, parseNumber } from './csv'

const REQUIRED_COLUMNS = [
  'person_id',
  'indicator_id',
  'value',
  'unit',
  'mission_day',
  'time',
]

// A placeholder demo_data.csv may name indicators that the real
// indicators.csv does not have. With real indicators around, those rows are
// dropped without a problem.
export interface EntryParseOptions {
  skipUnknownIndicators?: boolean
}

// Validates and reads one demo_data.csv. Problems are appended in place.
export function parseEntries(
  fileName: string,
  text: string,
  indicators: Indicator[],
  problems: string[],
  options: EntryParseOptions = {},
): Entry[] {
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]))
  const entries: Entry[] = []
  const seen = new Set<string>()
  const rows = parseCsvFile(fileName, text, problems, REQUIRED_COLUMNS)
  for (const row of rows) {
    const personId = row.person_id?.trim() ?? ''
    const indicatorId = row.indicator_id?.trim() ?? ''
    const indicator = byId.get(indicatorId)
    if (indicator === undefined) {
      if (options.skipUnknownIndicators !== true) {
        problems.push(`Unknown indicator id '${indicatorId}' in demo data.`)
      }
      continue
    }
    const unit = row.unit?.trim() ?? ''
    if (unit !== indicator.unit) {
      problems.push(
        `Unit '${unit}' for '${indicatorId}' does not match '${indicator.unit}'.`,
      )
    }
    const value = parseNumber(row.value ?? '')
    const missionDay = parseNumber(row.mission_day ?? '')
    if (value === null || missionDay === null) {
      problems.push(
        `Entry for '${indicatorId}' has a missing or non-numeric value or day.`,
      )
      continue
    }
    if (!isMissionDay(missionDay)) {
      problems.push(
        `Entry for '${indicatorId}' has a mission day that is not a positive integer.`,
      )
      continue
    }
    const time = row.time?.trim() ?? ''
    if (!isClockTime(time)) {
      problems.push(`Entry for '${indicatorId}' has an invalid time '${time}'.`)
      continue
    }
    const entryId = `${personId}:${indicatorId}:${missionDay}:${time}`
    if (seen.has(entryId)) {
      problems.push(`Duplicate demo entry '${entryId}'.`)
      continue
    }
    const context = parseContext(row.context, indicatorId, problems)
    if (context === null) continue
    seen.add(entryId)
    entries.push({
      id: entryId,
      personId,
      indicatorId,
      value,
      unit,
      missionDay,
      time,
      context,
    })
  }
  return entries
}

// The `context` cell of FORMATS.md section 3. A file from before the column
// existed, and an empty cell, read as 'rest', so the old demo data still loads.
// Any other word is a content problem like an invalid time, and the row is not
// loaded: a reading without a known context cannot be compared.
function parseContext(
  cell: string | undefined,
  indicatorId: string,
  problems: string[],
): MeasurementContext | null {
  if (cell === undefined) return DEFAULT_CONTEXT
  const text = cell.trim()
  if (text === '') return DEFAULT_CONTEXT
  if (isMeasurementContext(text)) return text
  problems.push(`Entry for '${indicatorId}' has an invalid context '${text}'.`)
  return null
}
