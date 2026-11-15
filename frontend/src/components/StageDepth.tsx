import { useEffect, useRef } from 'react'
import './stage-depth.css'

// The depth behind every phase: a faint scientific grid, one slow orbit arc
// and a soft glow where the active panel sits, on top of the star field
// (components/Starfield.tsx). Decoration only and hidden from assistive
// technology. The layers shift by a few pixels with the scroll, never more;
// under reduced motion, with the app switch, or while the tab is hidden,
// nothing moves.

/** The most the nearest layer shifts, in px. */
const MAX_SHIFT = 12

export default function StageDepth({ still }: { still: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (element === null || still) return
    let frame = 0
    const update = (): void => {
      frame = 0
      if (document.hidden) return
      const range = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      )
      const progress = Math.min(Math.max(window.scrollY / range, 0), 1)
      element.style.setProperty('--depth-shift', `${(progress * MAX_SHIFT).toFixed(1)}px`)
    }
    const onScroll = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(frame)
      element.style.removeProperty('--depth-shift')
    }
  }, [still])

  return (
    <div ref={ref} className="depth" aria-hidden="true">
      <div className="depth__grid" />
      <svg
        className="depth__orbit"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <g className="depth__turn">
          <ellipse className="depth__arc" cx="500" cy="300" rx="620" ry="210" />
          <circle className="depth__body" cx="1120" cy="300" r="4" />
        </g>
        <ellipse className="depth__arc depth__arc--far" cx="500" cy="300" rx="820" ry="300" />
      </svg>
      <div className="depth__glow" />
    </div>
  )
}
