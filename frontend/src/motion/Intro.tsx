import { useEffect, useRef, useState } from 'react'
import { tokenMs, useMotionAllowed } from './motion'
import './motion.css'

// The stars of the intro, drawn from a small fixed set so the sky is the same
// on every visit and in every screenshot. Decoration only.
const STARS = [
  { x: 12, y: 18, size: 1.5, delay: 0 },
  { x: 28, y: 72, size: 1, delay: 400 },
  { x: 41, y: 24, size: 1.2, delay: 900 },
  { x: 58, y: 12, size: 1, delay: 200 },
  { x: 67, y: 66, size: 1.6, delay: 700 },
  { x: 82, y: 32, size: 1.1, delay: 1200 },
  { x: 90, y: 78, size: 1, delay: 300 },
  { x: 18, y: 86, size: 1.2, delay: 1100 },
  { x: 47, y: 58, size: 0.9, delay: 1500 },
  { x: 74, y: 88, size: 1.3, delay: 500 },
]

/**
 * First-load intro, on every full page load: the sky drifts, the mark draws itself and the
 * name types in, in about three and a half seconds. `onDone` runs once, when it
 * ends or on any key, pointer or touch, so a person never waits for it. `still`
 * is the top bar switch. `clockText` is the mission day and time (shown only if
 * given); `skipLabel` is the text of the skip button (rendered only if given).
 * Renders nothing under reduced motion: the app is complete without it.
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
  const [show] = useState(allowed)
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
    const id = setTimeout(
      finish,
      tokenMs(layer.current, '--motion-intro', 3400),
    )
    // Any key or tap skips it, and the key still does its usual work.
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
      <div
        ref={layer}
        className="intro__layer"
        role="presentation"
        aria-hidden="true"
      >
        {STARS.map((star) => (
          <span
            key={`${star.x}-${star.y}`}
            className="intro__star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size * 2}px`,
              height: `${star.size * 2}px`,
              animationDelay: `${star.delay}ms`,
            }}
          />
        ))}
        <svg className="intro__mark" viewBox="0 0 42 42" focusable="false">
          <circle cx="21" cy="21" r="15" pathLength="1" />
          <path d="M6 30 C 14 20, 28 14, 37 10" pathLength="1" />
          <circle cx="21" cy="21" r="5" pathLength="1" />
        </svg>
        <p className="intro__name">HeMoSo</p>
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
