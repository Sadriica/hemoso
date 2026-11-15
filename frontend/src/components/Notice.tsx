import type { ReactNode } from 'react'
import { StatusIcon } from '../icons'

// A boxed note that stands apart from the page text: a coloured rail, an icon
// and the words, and at most one action. The icon is decorative and hidden from
// assistive technology; the tone only reinforces what the sentence already says
// (REQ-15). Warning uses the diamond, review the triangle (DESIGN.md 2.2).
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
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <circle cx="12" cy="12" r="9.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 11v5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="7.7" r="1.2" fill="currentColor" />
          </svg>
        ) : (
          <StatusIcon kind={tone === 'review' ? 'review' : 'warning'} size={18} />
        )}
      </span>
      <div className="notice__body">{children}</div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  )
}
