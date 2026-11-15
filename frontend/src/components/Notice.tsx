import type { ReactNode } from 'react'
import { StatusIcon, UtilityIcon } from '../icons'

// A boxed note that stands apart from the page text: a coloured rail, an icon
// and the words, and at most one action. The icon is decorative and hidden from
// assistive technology; the tone only reinforces what the sentence already says
// (REQ-15). Every glyph comes from the one 24 px icon set (DESIGN.md 10).
type NoticeTone = 'info' | 'warning' | 'review'

export default function Notice({
  tone,
  children,
  action,
}: {
  tone: NoticeTone
  children: ReactNode
  /** The one thing the person can do about it, usually a button. */
  action?: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`} role="note">
      <span className="notice__icon" aria-hidden="true">
        {tone === 'info' ? (
          <UtilityIcon kind="info" size={18} />
        ) : (
          <StatusIcon kind={tone === 'review' ? 'review' : 'warning'} size={18} />
        )}
      </span>
      <div className="notice__body">{children}</div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  )
}
