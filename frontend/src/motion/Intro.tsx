import { useEffect, useRef, useState } from 'react'
import { tokenMs, useMotionAllowed } from './motion'
import './motion.css'

const KEY = 'hemoso-intro-seen'
let seenInPage = false

/** Has the intro run in this tab? Falls back to once per page load if storage fails. */
function seen(): boolean {
  try {
    return !!sessionStorage.getItem(KEY)
  } catch {
    return seenInPage
  }
}

function mark() {
  seenInPage = true
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked: the module flag covers this page load */
  }
}

/**
 * First-load intro, once per tab. `onDone` runs once, within 1200 ms or on any
 * key, pointer or touch. `still` is the top bar switch. `clockText` is the
 * mission day and time (shown only if given); `skipLabel` is the text of the
 * skip button (rendered only if given). Renders nothing under reduced motion.
 */
export default function Intro({
  onDone,
  still,
  clockText,
  skipLabel,
}: {
  onDone: () => void
  still: boolean
  clockText?: string
  skipLabel?: string
}) {
  const allowed = useMotionAllowed(still)
  const [show] = useState(() => allowed && !seen())
  const [open, setOpen] = useState(show)
  const layer = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const cb = useRef(onDone)
  useEffect(() => {
    cb.current = onDone
  })

  useEffect(() => {
    const finish = () => {
      if (done.current) return
      done.current = true
      setOpen(false)
      cb.current()
    }
    if (!show) {
      finish()
      return
    }
    mark()
    const id = setTimeout(finish, tokenMs(layer.current, '--motion-cinematic', 1200))
    const ev = ['keydown', 'pointerdown', 'touchstart'] as const
    ev.forEach((e) => window.addEventListener(e, finish, { passive: true }))
    return () => {
      clearTimeout(id)
      ev.forEach((e) => window.removeEventListener(e, finish))
    }
  }, [show])

  if (!open) return null
  return (
    <>
      <div ref={layer} className="intro__layer" role="presentation" aria-hidden="true">
        <svg className="intro__mark" viewBox="0 0 42 42" focusable="false">
          <circle cx="21" cy="21" r="15" pathLength="1" />
          <path d="M6 30 C 14 20, 28 14, 37 10" pathLength="1" />
          <circle cx="21" cy="21" r="5" pathLength="1" />
        </svg>
        {clockText ? <p className="intro__clock">{clockText}</p> : null}
      </div>
      {skipLabel ? (
        <button type="button" className="intro__skip">
          {skipLabel}
        </button>
      ) : null}
    </>
  )
}
