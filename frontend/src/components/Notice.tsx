import type { ReactNode } from 'react'

// A boxed note that stands apart from the page text: a coloured rail, an icon
// and the words. The icon is decorative and hidden from assistive technology;
// the tone only reinforces what the sentence already says (REQ-15).
type NoticeTone = 'info' | 'warning'

export default function Notice({
  tone,
  children,
}: {
  tone: NoticeTone
  children: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`} role="note">
      <span className="notice__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
          <NoticeIcon tone={tone} />
        </svg>
      </span>
      <div className="notice__body">{children}</div>
    </div>
  )
}

function NoticeIcon({ tone }: { tone: NoticeTone }) {
  if (tone === 'info') {
    return (
      <>
        <circle
          cx="12"
          cy="12"
          r="9.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M12 11v5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="7.7" r="1.2" fill="currentColor" />
      </>
    )
  }
  return (
    <>
      <path
        d="M12 3.75L20.75 19.5H3.25L12 3.75z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.75v4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.9" r="1.2" fill="currentColor" />
    </>
  )
}
