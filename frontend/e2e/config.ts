import { readFileSync } from 'node:fs'
import { SCALE_UNIT } from '../src/strings'

// What the Entry screen offers, read from the team's file instead of names
// written here: the same rows the content loader reads at build time, so the
// test follows config/data/indicators.csv when Phys changes it.
export interface IndicatorRows {
  // Indicator names, in the order of the "Indicator" select.
  names: string[]
  // Unit of each indicator, by index.
  units: string[]
  // How each indicator is measured on board, by index.
  measuredOnBoard: string[]
  // Hazard ids as the file writes them, by index.
  hazards: string[][]
  // Index of the indicator measured on the 1 to 5 scale, or -1 when there is none.
  scaleIndex: number
}

export function readIndicatorRows(): IndicatorRows {
  const text = readFileSync(
    new URL('../../config/data/indicators.csv', import.meta.url),
    'utf8',
  )
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .map(splitCsvLine)
  // The first row is the header.
  const data = rows.slice(1)
  const names = data.map((cells) => cells[1] ?? '')
  const units = data.map((cells) => cells[2] ?? '')
  const measuredOnBoard = data.map((cells) => cells[4] ?? '')
  const hazards = data.map((cells) =>
    (cells[5] ?? '').split(/\s+/).filter(Boolean),
  )
  return {
    names,
    units,
    measuredOnBoard,
    hazards,
    scaleIndex: units.indexOf(SCALE_UNIT),
  }
}

// The same rule as src/content/csv.ts: a quoted cell may hold a comma.
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}
