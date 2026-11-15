import type { Direction, Indicator } from '../domain/types'
import { parseSources } from '../domain/source'
import { hazardName } from '../strings'
import { parseCsvFile, parseNumber } from './csv'

// The columns this reader uses. FORMATS.md also lists tier and system, which
// the frontend does not read yet: requiring them would reject the real
// config/data/indicators.csv on the day Phys adds them. `min_spread` is read
// when the column is there, because the local baseline rule needs the noise
// floor.
const REQUIRED_COLUMNS = [
  'id',
  'name',
  'unit',
  'direction',
  'measured_on_board',
  'hazards',
  'source',
]

// Validates and reads one indicators.csv. Problems are appended in place so a
// single file with several bad rows reports them all instead of throwing.
export function parseIndicators(
  fileName: string,
  text: string,
  problems: string[],
): Indicator[] {
  const indicators: Indicator[] = []
  const seen = new Set<string>()
  for (const row of parseCsvFile(fileName, text, problems, REQUIRED_COLUMNS)) {
    const id = row.id?.trim() ?? ''
    if (id === '') {
      problems.push(`Indicator in ${fileName} has an empty id.`)
      continue
    }
    if (seen.has(id)) {
      problems.push(`Duplicate indicator id '${id}'.`)
      continue
    }
    seen.add(id)
    const sources = parseSources(row.source ?? '')
    if (sources === null) {
      problems.push(`Indicator '${id}' has no source or Assumption.`)
    }
    indicators.push({
      id,
      name: row.name?.trim() ?? '',
      unit: row.unit?.trim() ?? '',
      direction: parseDirection(row.direction ?? '', id, problems),
      measuredOnBoard: row.measured_on_board?.trim() ?? '',
      hazards: parseHazards(row.hazards ?? '', id, problems),
      minSpread: parseMinSpread(row.min_spread, id, problems),
      sources: sources ?? [],
    })
  }
  return indicators
}

// The noise floor of the baseline rule: a number greater than 0, in the
// indicator's unit (FORMATS.md section 3). A file from before the column
// existed loads with 0, which leaves the spread at the median absolute
// deviation alone.
function parseMinSpread(
  cell: string | undefined,
  id: string,
  problems: string[],
): number {
  if (cell === undefined) return 0
  const minSpread = parseNumber(cell)
  if (minSpread === null || minSpread <= 0) {
    problems.push(`Indicator '${id}' has an invalid min_spread '${cell.trim()}'.`)
    return 0
  }
  return minSpread
}

// Only the five hazard ids of FORMATS.md section 3 reach a screen. An id with
// no plain name is reported for the team and dropped, so it never appears raw.
function parseHazards(
  value: string,
  id: string,
  problems: string[],
): string[] {
  const hazards: string[] = []
  for (const hazard of value.split(/\s+/).filter(Boolean)) {
    if (hazardName(hazard) === null) {
      problems.push(`Indicator '${id}' has unknown hazard '${hazard}'.`)
      continue
    }
    hazards.push(hazard)
  }
  return hazards
}

function parseDirection(
  value: string,
  id: string,
  problems: string[],
): Direction {
  if (value === 'higher' || value === 'lower' || value === 'both') return value
  problems.push(`Indicator '${id}' has an unknown direction '${value}'.`)
  return 'both'
}
