import { StatusIcon } from '../icons'
import type { BadgeKind } from './attentionText'

// Status badge: the state icon, then the words. Colour only reinforces the icon
// shape and the text, it never carries the meaning alone (REQ-15).
export default function AttentionBadge({
  kind,
  text,
}: {
  kind: BadgeKind
  text: string
}) {
  return (
    <span className={`attention-badge attention-badge--${kind}`}>
      <StatusIcon kind={kind} size={16} />
      <span className="attention-badge__text">{text}</span>
    </span>
  )
}
