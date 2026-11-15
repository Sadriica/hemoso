import { useRef, type ReactNode } from 'react'
import { useEntrance } from './entrance'
import { useMotionAllowed } from './motion'
import './motion-interactions.css'

/**
 * Wraps one phase and runs its entrance (see `useEntrance`) on every phase
 * change and on first load: scene, orbits, headline lines, panel, rest, in
 * under 1.2 s, skipped by any key or tap, and absent under `still` or reduced
 * motion. The only fade of the phase content. Renders a plain block.
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
  useEntrance(phase, useMotionAllowed(still), el)
  return <div ref={el}>{children}</div>
}
