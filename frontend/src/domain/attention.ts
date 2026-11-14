import type { Attention, AttentionRule } from './types'

// A rule with side `above` matches when value > threshold, `below` when
// value < threshold. The first matching rule wins; none matches is in_range.
export function attentionFor(value: number, rules: AttentionRule[]): Attention {
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
