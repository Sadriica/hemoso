import { useEffect, useRef, useState } from 'react'

const RM = '(prefers-reduced-motion: reduce)'

/** True when the system asks for reduced motion. Safe where matchMedia is missing (jsdom). */
function prefersReduced(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia(RM).matches
  } catch {
    return false
  }
}

/**
 * Whether motion may play. `still` is the top bar switch; the system setting is
 * read too and followed live. False means: show the final state at once.
 */
export function useMotionAllowed(still: boolean): boolean {
  const reduced = useReducedMotion()
  return !still && !reduced
}

/**
 * The system setting, followed live: a person who turns "reduce motion" on in
 * the OS while the app is open stops the motion at once.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReduced)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia(RM)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

/** Reads a duration token such as `--motion-slow` (ms) from the element; `fallback` mirrors DESIGN.md. */
export function tokenMs(el: Element | null, name: string, fallback: number): number {
  const raw = el ? getComputedStyle(el).getPropertyValue(name).trim() : ''
  const n = parseFloat(raw)
  return raw.endsWith('ms') && n > 0 ? n : raw.endsWith('s') && n > 0 ? n * 1000 : fallback
}

/**
 * Fades and lifts `el` in over `ms` with the Web Animations API (opacity and
 * transform only). Does nothing without `el.animate`, or when the system or an
 * ancestor `.app--still` asks for no motion. Returns the animation, so it can be cancelled.
 */
export function animateIn(el: HTMLElement | null, ms: number): Animation | undefined {
  if (!el || typeof el.animate !== 'function' || prefersReduced() || el.closest('.app--still')) return
  const ease = getComputedStyle(el).getPropertyValue('--ease-standard').trim() || 'ease-out'
  return el.animate(
    [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: Math.min(ms, 1200), easing: ease },
  )
}

/**
 * The number to display: counts from the previous value to `target` in `ms`
 * (default 250, never over 600). Returns `target` at once when `allowed` is
 * false. `decimals` rounds the shown number.
 */
export function useCountUp(target: number, allowed: boolean, ms = 250, decimals?: number): number {
  const [shown, setShown] = useState(target)
  const cur = useRef(target)
  useEffect(() => {
    if (!allowed || cur.current === target) {
      cur.current = target
      setShown(target)
      return
    }
    const from = cur.current
    const d = Math.min(Math.max(ms, 1), 600)
    const t0 = Date.now()
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / d)
      cur.current = t >= 1 ? target : from + (target - from) * t
      setShown(cur.current)
      if (t >= 1) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [target, allowed, ms])
  const v = allowed ? shown : target
  if (decimals === undefined) return v
  const k = 10 ** decimals
  return Math.round(v * k) / k
}
