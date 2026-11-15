import { useEffect, useRef, type ReactNode } from 'react'
import { animateIn, tokenMs, useMotionAllowed } from './motion'

/**
 * Wraps one phase and is the only fade of its content. When `phase` changes,
 * the children fade and lift in (opacity and transform only, no layout shift).
 * A new change cancels the running one, and so does motion turning off
 * (`still` or the system setting). With `still` it only renders the children.
 */
export default function PhaseTransition({
  phase,
  still,
  children,
}: {
  phase: string | number
  still: boolean
  children: ReactNode
}) {
  const allowed = useMotionAllowed(still)
  const el = useRef<HTMLDivElement>(null)
  const prev = useRef(phase)
  const anim = useRef<Animation | undefined>(undefined)
  useEffect(() => {
    // Turning motion off (the switch, the system setting) stops whatever runs
    // now, even in the middle of a phase that does not change.
    if (still) {
      anim.current?.cancel()
      anim.current = undefined
    }
    if (prev.current === phase) return
    prev.current = phase
    anim.current?.cancel()
    anim.current = allowed ? animateIn(el.current, tokenMs(el.current, '--motion-slow', 400)) : undefined
  }, [phase, allowed])
  useEffect(() => {
    if (!allowed) anim.current?.cancel()
  }, [allowed])
  useEffect(() => () => anim.current?.cancel(), [])
  return <div ref={el}>{children}</div>
}
