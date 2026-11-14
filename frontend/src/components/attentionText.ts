import type { Attention } from '../domain/types'
import { strings } from '../strings'

// The status as words, for the screens that show it without a badge (the
// History table): the level name of a crossed rule, so colour never carries the
// meaning alone (REQ-15).
export function attentionText(attention: Attention): string {
  if (attention.kind === 'no_data') return strings.badge.noData
  if (attention.kind === 'no_rules') return strings.badge.noRules
  if (attention.kind === 'in_range') return strings.badge.inRange
  return attention.level
}
