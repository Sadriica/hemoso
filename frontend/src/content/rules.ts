import type { AttentionRule, Notify } from '../domain/types'
import { parseSources } from '../domain/source'
import { parseCsvFile, parseNumber } from './csv'

// A placeholder attention file may name an indicator that the real
// indicators.csv does not have (FORMATS.md examples `example_indicator`).
// With real indicators around, that row is dropped without a problem.
export interface RuleParseOptions {
  skipUnknownIndicators?: boolean
}

// Validates and reads one attention.csv. Problems are appended in place.
export function parseRules(
  fileName: string,
  text: string,
  validIds: Set<string>,
  problems: string[],
  options: RuleParseOptions = {},
): AttentionRule[] {
  const rules: AttentionRule[] = []
  const seen = new Set<string>()
  for (const row of parseCsvFile(fileName, text, problems)) {
    const indicatorId = row.indicator_id?.trim() ?? ''
    if (!validIds.has(indicatorId)) {
      if (options.skipUnknownIndicators !== true) {
        problems.push(`Unknown indicator id '${indicatorId}' in attention rules.`)
      }
      continue
    }
    const attentionLevel = row.attention_level?.trim() ?? ''
    if (attentionLevel === '') {
      problems.push(
        `Attention rule for '${indicatorId}' has an empty attention level.`,
      )
      continue
    }
    const notify = parseNotify(
      row.notify?.trim() ?? '',
      indicatorId,
      problems,
    )
    if (notify === null) continue
    const threshold = parseNumber(row.threshold ?? '')
    if (threshold === null) {
      problems.push(
        `Attention rule for '${indicatorId}' has a missing or non-numeric threshold.`,
      )
      continue
    }
    const side = parseSide(row.side ?? '', indicatorId, problems)
    if (side === null) continue
    // Two rows on the same indicator, side and threshold make the outcome
    // depend on file order, so the second one is reported and skipped.
    const key = `${indicatorId}|${side}|${threshold}`
    if (seen.has(key)) {
      problems.push(
        `Duplicate attention rule for '${indicatorId}' ${side} ${threshold}.`,
      )
      continue
    }
    seen.add(key)
    const sources = parseSources(row.source ?? '')
    if (sources === null) {
      problems.push(
        `Attention rule for '${indicatorId}' has no source or Assumption.`,
      )
    }
    rules.push({
      indicatorId,
      side,
      threshold,
      attentionLevel,
      notify,
      sources: sources ?? [],
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

function parseNotify(
  value: string,
  indicatorId: string,
  problems: string[],
): Notify | null {
  if (value === 'crew' || value === 'cmo' || value === 'flight_surgeon') {
    return value
  }
  if (value === '') {
    problems.push(`Attention rule for '${indicatorId}' has an empty notify.`)
    return null
  }
  problems.push(
    `Attention rule for '${indicatorId}' has an unknown notify '${value}'.`,
  )
  return null
}
