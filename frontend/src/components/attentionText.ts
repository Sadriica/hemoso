import type { IndicatorStateName, Status } from '../domain/state'
import type { Attention } from '../domain/types'
import type { StatusKind } from '../icons/meta'
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

// The look of one status: the state icon shape of DESIGN.md 2.2 (the warning
// shape belongs to a notice), the left edge of the card and the ring of the
// planetarium all take it from here, so one status is drawn one way.
export type BadgeKind = Exclude<StatusKind, 'warning'>

const KIND_BY_STATE: Record<IndicatorStateName, BadgeKind> = {
  in_range: 'in_range',
  outside_range: 'outside',
  needs_review: 'review',
  no_data: 'no_data',
}

// A crossed attention row is drawn by who acts on it (Wambi, Sat 23:00): a row
// for the crew reads as outside (amber), a row for the CMO or the flight
// surgeon as needs review (red). The words stay the level name of the row.
export function statusBadgeKind(status: Status): BadgeKind {
  if (status.state === 'needs_review' && status.notify === 'crew') {
    return 'outside'
  }
  return KIND_BY_STATE[status.state]
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
