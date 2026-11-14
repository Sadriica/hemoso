import { isClockTime, isMissionDay } from '../domain/clock'
import type { Entry, Indicator } from '../domain/types'
import { parseCsvFile, parseNumber } from './csv'

// Validates and reads one demo_data.csv. Problems are appended in place.
export function parseEntries(
  fileName: string,
  text: string,
  indicators: Indicator[],
  problems: string[],
): Entry[] {
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]))
  const entries: Entry[] = []
  const seen = new Set<string>()
  for (const row of parseCsvFile(fileName, text, problems)) {
    const personId = row.person_id?.trim() ?? ''
    const indicatorId = row.indicator_id?.trim() ?? ''
    const indicator = byId.get(indicatorId)
    if (indicator === undefined) {
      problems.push(`Unknown indicator id '${indicatorId}' in demo data.`)
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
    seen.add(entryId)
    entries.push({
      id: entryId,
      personId,
      indicatorId,
      value,
      unit,
      missionDay,
      time,
    })
  }
  return entries
}
