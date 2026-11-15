import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useEntrance } from './entrance'
import { useMotionAllowed } from './motion'
import './motion-interactions.css'
import './channel-switch.css'

// The order of the guided check, to tell a step forward from a step back.
const ORDER = ['identify', 'report', 'status']

/** The longest a switch may stay on screen, well past its 400 ms. */
const SWITCH_LIMIT_MS = 900

type Direction = 'forward' | 'back'

function directionOf(from: string | number, to: string | number): Direction {
  return ORDER.indexOf(String(to)) < ORDER.indexOf(String(from)) ? 'back' : 'forward'
}

/**
 * Wraps one phase and runs its entrance (see `useEntrance`) on every phase
 * change and on first load: scene, orbits, headline lines, panel, rest, in
 * under 1.2 s, skipped by any key or tap, and absent under `still` or reduced
 * motion.
 *
 * A change of phase is also a channel switch: one scan line sweeps the stage
 * and the content settles from the side it came from, forward top to bottom
 * and back bottom to top, in about 400 ms (DESIGN.md 7.3). The first load has
 * no switch, and with motion off nothing of it is rendered, so the new phase
 * is simply there and the focus lands on its heading as before.
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
  const allowed = useMotionAllowed(still)
  useEntrance(phase, allowed, el)

  // The phase on screen and the switch that brought it, compared during
  // render so the first frame of a new phase already carries its direction.
  const [shown, setShown] = useState(phase)
  const [change, setChange] = useState<{ direction: Direction; count: number } | null>(null)
  if (phase !== shown) {
    setShown(phase)
    setChange((last) => ({
      direction: directionOf(shown, phase),
      count: (last?.count ?? 0) + 1,
    }))
  }
  const active = allowed ? change : null
  // The sweep removes itself when its animation ends. A browser that never
  // fires that event (a hidden tab, a print view) must not keep it either.
  const count = change?.count
  useEffect(() => {
    if (count === undefined) return
    const timer = window.setTimeout(() => setChange(null), SWITCH_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [count])

  return (
    <div
      ref={el}
      className={`channel${active ? ` channel--${active.direction}` : ''}`}
      data-direction={active?.direction}
    >
      {active && (
        <span
          key={active.count}
          className={`channel-switch channel-switch--${active.direction}`}
          aria-hidden="true"
          onAnimationEnd={() => setChange(null)}
        >
          <span className="channel-switch__line" />
        </span>
      )}
      {/* Never keyed: the phase inside keeps its state through the switch. */}
      <div className="channel__content">
        {children}
      </div>
    </div>
  )
}
