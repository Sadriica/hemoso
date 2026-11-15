import { StatusIcon } from '../icons'
import type { Attention } from '../domain/types'
import { attentionText } from './attentionText'

// State badge: the state icon, then the words. Colour only reinforces the
// icon shape and the text, it never carries the meaning alone (REQ-15).
// Needs review is the shape for a crossed attention rule; a missing rule or
// missing data has the dashed ring.
export default function AttentionBadge({
  attention,
}: {
  attention: Attention
}) {
  const kind = attention.kind
  return (
    <span className={`attention-badge attention-badge--${kind}`}>
      <StatusIcon
        kind={kind === 'in_range' ? 'in_range' : kind === 'attention' ? 'review' : 'no_data'}
        size={16}
      />
      <span className="attention-badge__text">{attentionText(attention)}</span>
    </span>
  )
}
