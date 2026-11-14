import type { Attention, AttentionRule, Notify } from './types'

// Who acts, least to most severe (FORMATS.md section 3, `notify`).
const NOTIFY_RANK: Record<Notify, number> = {
  crew: 0,
  cmo: 1,
  flight_surgeon: 2,
}

// A rule with side `above` matches when value > threshold, `below` when
// value < threshold. Every matching rule is collected and the most severe
// `notify` wins, because one value can cross several steps of the same
// indicator. On the same severity the more extreme threshold wins: lower on
// `below`, higher on `above`.
//
// No rule at all is `no_rules`, never `in_range`: without a threshold the app
// cannot say a value is in range, and saying it would be a health claim the
// data does not support.
export function attentionFor(value: number, rules: AttentionRule[]): Attention {
  if (rules.length === 0) return { kind: 'no_rules' }

  let winner: AttentionRule | null = null
  for (const rule of rules) {
    if (!matches(rule, value)) continue
    if (winner === null || isMoreSevere(rule, winner)) winner = rule
  }
  if (winner === null) return { kind: 'in_range' }
  return { kind: 'attention', level: winner.attentionLevel, rule: winner }
}

function matches(rule: AttentionRule, value: number): boolean {
  return rule.side === 'above' ? value > rule.threshold : value < rule.threshold
}

function isMoreSevere(candidate: AttentionRule, winner: AttentionRule): boolean {
  const candidateRank = NOTIFY_RANK[candidate.notify]
  const winnerRank = NOTIFY_RANK[winner.notify]
  if (candidateRank !== winnerRank) return candidateRank > winnerRank
  return isMoreExtreme(candidate, winner)
}

// Two steps on opposite sides of the same indicator keep the first one in
// file order: there is no shared scale to call one of them more extreme.
function isMoreExtreme(candidate: AttentionRule, winner: AttentionRule): boolean {
  if (candidate.side !== winner.side) return false
  if (candidate.side === 'below') return candidate.threshold < winner.threshold
  return candidate.threshold > winner.threshold
}
