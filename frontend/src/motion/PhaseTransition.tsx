import { useEffect, useRef, type ReactNode } from 'react'
import { animateIn, tokenMs } from './motion'

/**
 * Wraps one phase. When `phase` changes, the children fade and lift in
 * (opacity and transform only, no layout shift). A new change cancels the
 * running one. With `still` it only renders the children.
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
  const el = useRef<HTMLDivElement>(null)
  const prev = useRef(phase)
  const anim = useRef<Animation | undefined>(undefined)
  useEffect(() => {
    if (prev.current === phase) return
    prev.current = phase
    anim.current?.cancel()
    if (!still) anim.current = animateIn(el.current, tokenMs(el.current, '--motion-slow', 400))
  }, [phase, still])
  useEffect(() => () => anim.current?.cancel(), [])
  return <div ref={el}>{children}</div>
}
