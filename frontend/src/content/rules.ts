import type { AttentionRule } from '../domain/types'
import { parseSource } from '../domain/source'
import { parseCsvFile, parseNumber } from './csv'

// Validates and reads one attention.csv. Problems are appended in place.
export function parseRules(
  fileName: string,
  text: string,
  validIds: Set<string>,
  problems: string[],
): AttentionRule[] {
  const rules: AttentionRule[] = []
  for (const row of parseCsvFile(fileName, text, problems)) {
    const indicatorId = row.indicator_id?.trim() ?? ''
    if (!validIds.has(indicatorId)) {
      problems.push(`Unknown indicator id '${indicatorId}' in attention rules.`)
      continue
    }
    const source = parseSource(row.source ?? '')
    if (source === null) {
      problems.push(
        `Attention rule for '${indicatorId}' has no source or Assumption.`,
      )
    }
    const threshold = parseNumber(row.threshold ?? '')
    if (threshold === null) {
      problems.push(
        `Attention rule for '${indicatorId}' has a missing or non-numeric threshold.`,
      )
      continue
    }
    const side = parseSide(row.side ?? '', indicatorId, problems)
    if (side === null) continue
    rules.push({
      indicatorId,
      side,
      threshold,
      attentionLevel: row.attention_level?.trim() ?? '',
      sources: source === null ? [] : [source],
    })
  }
  return rules
}

function parseSide(
  value: string,
  indicatorId: string,
  problems: string[],
): 'below' | 'above' | null {
  if (value === 'below' || value === 'above') return value
  problems.push(
    `Attention rule for '${indicatorId}' has an unknown side '${value}'.`,
  )
  return null
}
