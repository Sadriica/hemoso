import { useLayoutEffect, useRef, type RefObject } from 'react'
import { animateIn, tokenMs } from './motion'

/** Sent on `window` when the intro ends or is skipped: the first entrance waits for it. */
export const INTRO_DONE = 'hemoso:intro-done'

const SKIP_EVENTS = ['keydown', 'pointerdown', 'touchstart'] as const
const root = () => document.documentElement

interface Step {
  els: Element[]
  from: Keyframe
  to: Keyframe
  delay: number
  ms: number
  /** Gap between consecutive elements of the step. */
  stagger: number
}

// The sequence of DESIGN.md 7.2 against the data-enter attributes: scene,
// orbit strokes, headline lines, panel, then the rest. Every length is a token
// read at run time, and the whole sequence is scaled to fit --motion-cinematic.
function plan(): Step[] {
  const t = (name: string, fallback: number) => tokenMs(root(), name, fallback)
  const horizon = t('--motion-horizon', 800)
  const stagger = t('--motion-stagger', 70)
  const slow = t('--motion-slow', 400)
  const all = (sel: string) => [...document.querySelectorAll(sel)]
  const fade = { opacity: 0 }
  const lines = all('[data-enter="headline"] .headline__line').length
  const steps: Step[] = [
    { els: all('[data-enter="scene"]'), from: { ...fade, transform: 'scale(0.98)' }, to: { opacity: 1, transform: 'none' }, delay: 0, ms: horizon, stagger: 0 },
    { els: all('[data-enter="headline"] .headline__line'), from: { ...fade, transform: 'translateY(0.4em)' }, to: { opacity: 1, transform: 'none' }, delay: horizon * 0.35, ms: slow, stagger },
    // The sentence under the headline follows the last line by one stagger.
    { els: all('[data-enter="headline"] .phase-heading__intro'), from: { ...fade, transform: 'translateY(0.4em)' }, to: { opacity: 1, transform: 'none' }, delay: horizon * 0.35 + lines * stagger, ms: slow, stagger: 0 },
    { els: all('[data-enter="panel"]'), from: { ...fade, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'none' }, delay: horizon * 0.55, ms: t('--motion-rise', 500), stagger: 0 },
    { els: all('[data-enter="rest"]'), from: fade, to: { opacity: 1 }, delay: horizon * 0.85, ms: slow, stagger: 0 },
  ]
  const draws: Step[] = []
  for (const el of all('[data-draw]')) {
    const len = (el as SVGGeometryElement).getTotalLength?.()
    if (!len) continue
    const dash = { strokeDasharray: len }
    draws.push({ els: [el], from: { ...dash, strokeDashoffset: len }, to: { ...dash, strokeDashoffset: 0 }, delay: horizon * 0.2, ms: t('--motion-draw', 900), stagger: 0 })
  }
  const list = [...steps, ...draws]
  const end = Math.max(0, ...list.map((s) => s.delay + (s.els.length - 1) * s.stagger + s.ms))
  const scale = Math.min(1, t('--motion-cinematic', 1200) / (end || 1))
  return list.map((s) => ({ ...s, delay: s.delay * scale, ms: s.ms * scale, stagger: s.stagger * scale }))
}

interface Run {
  /** Jump to the final state and end. */
  finish(): void
  /** Stop at once; the natural styles show. */
  cancel(): void
}

// Builds the animations paused at their first frame, so nothing flashes while
// the intro is still on screen, and plays them when allowed to.
function create(fallback: Element | null, first: boolean): Run | null {
  const probe = document.createElement('div')
  if (typeof probe.animate !== 'function') return null
  const ease = getComputedStyle(root()).getPropertyValue('--ease-settle').trim() || 'ease-out'
  const anims: Animation[] = []
  for (const step of plan()) {
    step.els.forEach((el, i) => {
      const a = el.animate([step.from, step.to], {
        duration: step.ms,
        delay: step.delay + i * step.stagger,
        easing: ease,
        fill: 'both',
      })
      a.pause()
      anims.push(a)
    })
  }
  if (anims.length === 0) {
    // No scene markup yet: the phase still fades in as one block when it changes.
    const one = first ? undefined : animateIn(fallback as HTMLElement | null, tokenMs(root(), '--motion-slow', 400))
    return one ? { finish: () => one.finish(), cancel: () => one.cancel() } : null
  }

  let left = anims.length
  let started = false
  const stop = () => {
    SKIP_EVENTS.forEach((e) => window.removeEventListener(e, skip))
    window.removeEventListener(INTRO_DONE, play)
  }
  const cancel = () => {
    stop()
    anims.forEach((a) => a.cancel())
  }
  const skip = () => anims.forEach((a) => a.finish())
  const play = () => {
    if (started) return
    started = true
    window.removeEventListener(INTRO_DONE, play)
    SKIP_EVENTS.forEach((e) => window.addEventListener(e, skip, { passive: true }))
    anims.forEach((a) => a.play())
  }
  // Once everything ended, drop the held final frames: the natural styles are
  // the same, and nothing stays attached to the elements.
  anims.forEach((a) => {
    a.onfinish = () => {
      if (--left > 0) return
      cancel()
    }
  })
  if (document.querySelector('.intro__layer, .intro-cover')) window.addEventListener(INTRO_DONE, play)
  else play()
  return { finish: skip, cancel }
}

/**
 * Runs the phase entrance whenever `phase` changes, and once on first load
 * (after the intro). Does nothing, and cancels a running one, when `allowed`
 * is false: the final state is then simply what is on the page. Any key,
 * pointer or touch finishes it; a new phase cancels the one before it.
 * `fallback` is the block that fades if the phase has no data-enter markup.
 */
export function useEntrance(phase: string | number, allowed: boolean, fallback: RefObject<Element | null>) {
  const ran = useRef<string | number | null>(null)
  const run = useRef<Run | null>(null)
  useLayoutEffect(() => {
    if (!allowed) {
      run.current?.cancel()
      run.current = null
      return
    }
    if (ran.current === phase) return
    const first = ran.current === null
    ran.current = phase
    run.current?.cancel()
    run.current = create(fallback.current, first)
  }, [phase, allowed, fallback])
  useLayoutEffect(() => () => run.current?.cancel(), [])
}
