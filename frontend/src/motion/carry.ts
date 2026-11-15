import { useCallback, useEffect, useRef, useState } from 'react'
import { tokenMs, useMotionAllowed } from './motion'

const SKIP_EVENTS = ['keydown', 'pointerdown', 'touchstart'] as const

// A copy of the picked crew avatar, flown from where it is to the top left of
// the panel, where the report head chips live: transform and opacity only.
function flyAvatar(ms: number, delay: number): { stop: () => void } | null {
  const source = document.querySelector('.crew-option input:checked ~ .crew-option__avatar')
  // The report head chips sit near the top left of where the Identify panel is.
  const stage = document.querySelector('.identify__panel') ?? document.getElementById('main-content')
  if (!(source instanceof HTMLElement) || !stage || typeof source.animate !== 'function') return null
  const from = source.getBoundingClientRect()
  const to = stage.getBoundingClientRect()
  const clone = source.cloneNode(true) as HTMLElement
  clone.setAttribute('aria-hidden', 'true')
  // The copy lives on the body, outside the label that styles the avatar, so it
  // carries the look it has now.
  const look = getComputedStyle(source)
  for (const name of ['display', 'alignItems', 'justifyContent', 'boxSizing', 'backgroundColor', 'color', 'border', 'borderRadius', 'boxShadow', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'textTransform'] as const) {
    clone.style[name] = look[name]
  }
  // Solid, so it reads over the panel and the scene: the tint over the page colour.
  clone.style.backgroundImage = `linear-gradient(${look.backgroundColor}, ${look.backgroundColor})`
  clone.style.backgroundColor = 'var(--color-bg-raised)'
  clone.style.boxShadow = '0 0 0 2px var(--color-accent), var(--shadow-float)'
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '90',
  })
  document.body.append(clone)
  const dx = to.left + 24 - from.left
  const dy = to.top + 80 - from.top
  // Two effects: the flight eases out, the fade near the end keeps a steady pace.
  const timing = { duration: ms, delay, fill: 'both' } as const
  const flight = clone.animate(
    [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(0.7)` }],
    { ...timing, easing: getComputedStyle(document.documentElement).getPropertyValue('--ease-settle').trim() || 'ease-out' },
  )
  const fade = clone.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], timing)
  return {
    stop: () => {
      flight.cancel()
      fade.cancel()
      clone.remove()
    },
  }
}

/**
 * The carry from Identify to Report (DESIGN.md 7.2, step 5). `run(done)` closes
 * the orbital ring (`progress` goes from 0 to 1), flies the picked avatar to
 * the top left, then calls `done` once, after about 500 ms. Any key, pointer or
 * touch calls `done` at once. Under `still` or reduced motion, `done` runs
 * immediately. A second `run` while one is going does nothing. `progress` is
 * undefined while idle, so the scene shows no ring. `done` runs even if
 * nothing could be animated.
 */
export function useCarry(still: boolean): { progress: number | undefined; run: (done: () => void) => void } {
  const allowed = useMotionAllowed(still)
  const [progress, setProgress] = useState<number | undefined>(undefined)
  const running = useRef(false)
  const cleanup = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanup.current?.(), [])

  const run = useCallback(
    (done: () => void) => {
      if (running.current) return
      if (!allowed) {
        done()
        return
      }
      running.current = true
      const slow = tokenMs(document.documentElement, '--motion-slow', 400)
      const total = slow * 1.25
      const fly = flyAvatar(slow, total - slow)
      setProgress(0)
      const start = setTimeout(() => setProgress(1), 16)
      let ended = false
      const end = () => {
        if (ended) return
        ended = true
        cleanup.current?.()
        cleanup.current = null
        fly?.stop()
        done()
      }
      const timer = setTimeout(end, total)
      SKIP_EVENTS.forEach((e) => window.addEventListener(e, end, { passive: true }))
      cleanup.current = () => {
        clearTimeout(start)
        clearTimeout(timer)
        SKIP_EVENTS.forEach((e) => window.removeEventListener(e, end))
      }
    },
    [allowed],
  )
  return { progress, run }
}
