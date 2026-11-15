import { useEffect, useId, useRef } from 'react'
import { useMotionAllowed } from '../../motion/motion'
import './orbital.css'

/** Which phase the scene stages: scale and the emphasised orbit differ. */
export type OrbitalVariant = 'identify' | 'report' | 'status'

/** Props of OrbitalScene. */
export interface OrbitalSceneProps {
  variant: OrbitalVariant
  /** 0 to 1: a ring around the central body closes with it (the Identify to Report carry). */
  progress?: number
  /** True draws the final scene with no motion and no pointer response. */
  still?: boolean
  className?: string
}

// viewBox (zoom), number of orbits and the emphasised one, per variant.
const VARIANTS: Record<OrbitalVariant, { box: string; orbits: number; accent: number }> = {
  identify: { box: '0 0 400 400', orbits: 4, accent: 2 },
  report: { box: '40 40 320 320', orbits: 3, accent: 1 },
  status: { box: '-10 -10 420 420', orbits: 4, accent: 3 },
}
const ORBITS = [
  { rx: 78, ry: 30, tilt: -18, dot: 4, at: 40 },
  { rx: 116, ry: 46, tilt: -18, dot: 5, at: 215 },
  { rx: 154, ry: 62, tilt: -18, dot: 4, at: 130 },
  { rx: 190, ry: 80, tilt: -18, dot: 6, at: 300 },
]

// A throttled pointer response: one rAF per frame sets two custom properties;
// the layers read them in CSS. Not on touch screens, not when motion is off.
function usePointer(root: React.RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const coarse = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches
    if (!on || coarse) return
    let frame = 0
    let x = 0
    let y = 0
    const apply = () => {
      frame = 0
      root.current?.style.setProperty('--px', x.toFixed(3))
      root.current?.style.setProperty('--py', y.toFixed(3))
    }
    const move = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1
      y = (e.clientY / window.innerHeight) * 2 - 1
      if (!frame) frame = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [on, root])
}

/**
 * The protagonist of the stage: a generic body on elliptical orbits, with small
 * bodies on them. Decorative (aria-hidden, no focus, no text). It fills its
 * parent at a 1:1 ratio.
 */
export function OrbitalScene({ variant, progress, still = false, className }: OrbitalSceneProps) {
  const motion = useMotionAllowed(still)
  const root = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')
  usePointer(root, motion)
  const v = VARIANTS[variant]

  return (
    <div
      ref={root}
      className={`orbital orbital--${variant}${motion ? '' : ' orbital--still'}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <svg viewBox={v.box} focusable="false">
        <defs>
          <radialGradient id={`${id}g`}>
            <stop offset="0" style={{ stopColor: 'var(--orbital-glow)' }} />
            <stop offset="1" style={{ stopColor: 'var(--orbital-glow)', stopOpacity: 0 }} />
          </radialGradient>
          <radialGradient id={`${id}t`}>
            <stop offset="0" style={{ stopColor: 'var(--color-accent)' }} />
            <stop offset="0.65" style={{ stopColor: 'var(--color-accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-surface)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-bg)' }} />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="130" fill={`url(#${id}g)`} />
        <circle className="orbital__tint" cx="200" cy="200" r="84" fill={`url(#${id}t)`} />
        <g className="orbital__layer orbital__layer--far">
          {ORBITS.slice(0, v.orbits).map((o, i) => (
            <g key={i} transform={`rotate(${o.tilt} 200 200)`}>
              <g className="orbital__turn" style={{ animationDuration: `${26 + i * 9}s` }}>
                <ellipse
                  className={`orbital__orbit${i === v.accent - 1 ? ' orbital__orbit--accent' : ''}`}
                  style={{ animationDelay: `calc(var(--motion-stagger) * ${i})` }}
                  cx="200"
                  cy="200"
                  rx={o.rx}
                  ry={o.ry}
                  pathLength="1"
                />
                <circle
                  className="orbital__dot"
                  cx={200 + o.rx * Math.cos((o.at * Math.PI) / 180)}
                  cy={200 + o.ry * Math.sin((o.at * Math.PI) / 180)}
                  r={o.dot}
                />
              </g>
            </g>
          ))}
        </g>
        <g className="orbital__layer orbital__layer--object">
          <circle cx="200" cy="200" r="34" fill={`url(#${id}b)`} className="orbital__core" />
          <path className="orbital__band" d="M168 192q32 -8 64 0M166 204q34 8 68 0" />
          <ellipse className="orbital__ring" cx="200" cy="200" rx="52" ry="14" transform="rotate(-18 200 200)" />
          {progress !== undefined && (
            <circle
              className="orbital__progress"
              cx="200"
              cy="200"
              r="44"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - Math.max(0, Math.min(1, progress))}
              transform="rotate(-90 200 200)"
            />
          )}
        </g>
      </svg>
    </div>
  )
}

export default OrbitalScene
