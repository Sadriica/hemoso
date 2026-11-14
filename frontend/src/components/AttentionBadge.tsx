import type { Attention } from '../domain/types'
import { strings } from '../strings'

// Status badge: icon plus always-visible text. Colour only reinforces the
// text, it never carries the meaning alone (REQ-15).
export default function AttentionBadge({
  attention,
}: {
  attention: Attention
}) {
  if (attention.kind === 'no_data') {
    return <Badge kind="no_data" text={strings.badge.noData} />
  }
  if (attention.kind === 'no_rules') {
    return <Badge kind="no_rules" text={strings.badge.noRules} />
  }
  if (attention.kind === 'in_range') {
    return <Badge kind="in_range" text={strings.badge.inRange} />
  }
  return <Badge kind="attention" text={attention.level} />
}

type BadgeKind = 'in_range' | 'attention' | 'no_rules' | 'no_data'

function Badge({ kind, text }: { kind: BadgeKind; text: string }) {
  return (
    <span className={`attention-badge attention-badge--${kind}`}>
      <svg
        className="attention-badge__icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        <BadgeIcon kind={kind} />
      </svg>
      <span className="attention-badge__text">{text}</span>
    </span>
  )
}

function BadgeIcon({ kind }: { kind: BadgeKind }) {
  if (kind === 'in_range') {
    return (
      <>
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.22" />
        <path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    )
  }
  if (kind === 'no_rules') {
    return (
      <>
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M8.5 12h7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>
    )
  }
  if (kind === 'attention') {
    return (
      <>
        <path d="M12 3.5L21 19.5H3L12 3.5z" fill="currentColor" opacity="0.22" />
        <path
          d="M12 9.5v4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.3" fill="currentColor" />
      </>
    )
  }
  return (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.22" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>
  )
}
