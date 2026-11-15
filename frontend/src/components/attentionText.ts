import type { Status } from '../domain/state'
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

// The three badge looks of a status: a check, a warning, and no data. The words
// carry the difference between the states; the shape only reinforces them.
export type BadgeKind = 'in_range' | 'attention' | 'no_data'

export function statusBadgeKind(status: Status): BadgeKind {
  if (status.state === 'no_data') return 'no_data'
  if (status.state === 'in_range') return 'in_range'
  return 'attention'
}

// The status of one indicator in the words of the app (docs/API.md, the four
// states). needs_review reads the attention level Bio 2 wrote for the row that
// matched.
export function statusText(status: Status): string {
  if (status.state === 'no_data') return strings.badge.noData
  if (status.state === 'in_range') return strings.badge.inRange
  if (status.state === 'outside_range') return strings.badge.outsideRange
  return status.level ?? strings.badge.needsReview
}
