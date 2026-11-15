import type { ConditionRule, ConditionSignalRule } from '../domain/types'
import { parseCsvFile } from './csv'

// The four columns of FORMATS.md section 3, in order.
const REQUIRED_COLUMNS = ['condition_id', 'name', 'based_on', 'source']

// Validates and reads one conditions.csv (REQ-06). Problems are appended in
// place; a row that cannot be shown safely (no id, no name, no source) is left
// out, and a signal that names an unknown indicator or has no side is kept and
// reported, because the score treats it as not usable instead of failing.
export function parseConditions(
  fileName: string,
  text: string,
  validIds: Set<string>,
  problems: string[],
): ConditionRule[] {
  const conditions: ConditionRule[] = []
  const seen = new Set<string>()
  const rows = parseCsvFile(fileName, text, problems, REQUIRED_COLUMNS)
  for (const row of rows) {
    const id = row.condition_id?.trim() ?? ''
    const name = row.name?.trim() ?? ''
    if (id === '' || name === '') {
      problems.push(`A condition in ${fileName} has no id or no name.`)
      continue
    }
    if (seen.has(id)) {
      problems.push(`Duplicate condition id '${id}'.`)
      continue
    }
    seen.add(id)
    const source = row.source?.trim() ?? ''
    if (source !== 'Assumption' && !/^https?:\/\//.test(source)) {
      problems.push(`Condition '${id}' has no source or Assumption.`)
      continue
    }
    const signals = parseSignals(row.based_on ?? '')
    for (const signal of signals) {
      if (!validIds.has(signal.indicatorId)) {
        problems.push(
          `Condition '${id}' rests on unknown indicator '${signal.indicatorId}'.`,
        )
      }
      if (signal.side === null) {
        problems.push(
          `Condition '${id}' has no side for '${signal.indicatorId}'.`,
        )
      }
    }
    conditions.push({ id, name, signals, source })
  }
  return conditions
}

// `indicator_id:above` or `indicator_id:below`, separated by spaces.
function parseSignals(cell: string): ConditionSignalRule[] {
  return cell
    .split(/\s+/)
    .filter((token) => token !== '')
    .map((token) => {
      const [indicatorId, side] = token.split(':')
      return {
        indicatorId,
        side: side === 'above' || side === 'below' ? side : null,
      }
    })
}
