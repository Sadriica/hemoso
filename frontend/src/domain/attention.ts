import type { Attention, AttentionRule } from './types'

// A rule with side `above` matches when value > threshold, `below` when
// value < threshold. The first matching rule wins.
//
// No rule at all is `no_rules`, never `in_range`: without a threshold the app
// cannot say a value is in range, and saying it would be a health claim the
// data does not support.
export function attentionFor(value: number, rules: AttentionRule[]): Attention {
  if (rules.length === 0) return { kind: 'no_rules' }

  for (const rule of rules) {
    if (rule.side === 'above' && value > rule.threshold) {
      return { kind: 'attention', level: rule.attentionLevel, rule }
    }
    if (rule.side === 'below' && value < rule.threshold) {
      return { kind: 'attention', level: rule.attentionLevel, rule }
    }
  }
  return { kind: 'in_range' }
}
