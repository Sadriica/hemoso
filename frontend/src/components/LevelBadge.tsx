import type { ReactNode } from 'react'
import type { Level } from '../api/types'
import { strings } from '../strings'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="level-badge__icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function LevelIcon({ level }: { level: Level }) {
  if (level === 'green') {
    return (
      <Icon>
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.22" />
        <path
          d="M7.5 12.5l3 3 6-6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
    )
  }
  if (level === 'yellow') {
    return (
      <Icon>
        <path d="M12 3.5L21 19.5H3L12 3.5z" fill="currentColor" opacity="0.22" />
        <path
          d="M12 9.5v4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.3" fill="currentColor" />
      </Icon>
    )
  }
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <rect x="11" y="6.5" width="2" height="6.5" rx="1" fill="#ffffff" />
      <circle cx="12" cy="16.8" r="1.4" fill="#ffffff" />
    </Icon>
  )
}

export default function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`level-badge level-badge--${level}`}>
      <LevelIcon level={level} />
      <span className="level-badge__text">{strings.level[level]}</span>
    </span>
  )
}
