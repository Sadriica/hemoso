import type { Condition } from '../../domain/conditions'
import type { SymptomDef } from '../../domain/symptoms'

// Presentation of the urgent rows of the evidence board. It reads the labels
// and signals the score already holds and changes nothing in them: a reported
// red-flag symptom still makes its condition urgent (domain/conditions.ts).

/**
 * How the measured signals of an urgent row stand against the row:
 * 0 at least one measured signal points to it, 1 no measurement to compare,
 * 2 every measured signal goes the other way (symptom only).
 */
export type Agreement = 0 | 1 | 2

export function agreementOf(condition: Condition): Agreement {
  let measured = false
  for (const signal of condition.signals) {
    if (signal.kind === 'symptom' || signal.contribution === null) continue
    if (signal.contribution > 0) return 0
    measured = true
  }
  return measured ? 2 : 1
}

/** The urgent rows, those whose measured signals agree first. Stable. */
export function orderUrgent(conditions: Condition[]): Condition[] {
  return conditions
    .filter((condition) => condition.label === 'urgent')
    .map((condition, index) => ({
      condition,
      index,
      rank: agreementOf(condition),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.condition)
}

/** The names of the red-flag symptoms the person reported, once each. */
export function reportedRedFlags(
  conditions: Condition[],
  defs: SymptomDef[],
): string[] {
  const names: string[] = []
  for (const condition of conditions) {
    if (condition.label !== 'urgent') continue
    for (const signal of condition.signals) {
      if (signal.kind !== 'symptom' || signal.contribution === null) continue
      const def = defs.find((item) => item.id === signal.symptomId)
      if (def === undefined || !def.redFlag || names.includes(def.name)) continue
      names.push(def.name)
    }
  }
  return names
}
