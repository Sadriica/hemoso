import type { Direction, Indicator } from '../domain/types'
import { parseSources } from '../domain/source'
import { parseCsvFile } from './csv'

// Validates and reads one indicators.csv. Problems are appended in place so a
// single file with several bad rows reports them all instead of throwing.
export function parseIndicators(
  fileName: string,
  text: string,
  problems: string[],
): Indicator[] {
  const indicators: Indicator[] = []
  const seen = new Set<string>()
  for (const row of parseCsvFile(fileName, text, problems)) {
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
      hazards: (row.hazards ?? '').split(/\s+/).filter(Boolean),
      sources: sources ?? [],
    })
  }
  return indicators
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
