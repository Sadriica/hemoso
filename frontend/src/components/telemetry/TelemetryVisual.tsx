import type { CSSProperties, ReactElement } from 'react'
import { fraction } from '../instruments/scales'
import './telemetry.css'

// The live figure of one report panel: it is drawn from the value in the
// readout (what the person is typing, or their last reading while the field is
// empty) and from nothing else. Decoration only: the value, its unit and its
// state are words beside it, so every figure here is aria-hidden.
//
// The scales are the drawing bounds of components/instruments/scales.ts. They
// place a mark on a figure; they are not clinical ranges, and no figure
// changes colour by value.

export interface TelemetryVisualProps {
  /** `bp` for the pressure pair, otherwise the indicator id. */
  kind: string
  /** The values in the order of the row's fields; null while there is none. */
  values: (number | null)[]
}

const W = 200
const H = 64

// One heart beat as a trace, 100 units wide: flat, a small wave, the spike,
// a recovery wave, flat. Drawn twice so the sweep can loop without a seam.
const BEAT = 'l14 0 l5 -5 l5 5 l8 0 l4 6 l6 -34 l6 44 l5 -16 l9 0 l6 -7 l7 7 l25 0'

function Pulse({ bpm }: { bpm: number | null }) {
  // One beat of the trace passes in the time of one real beat, within sane
  // drawing bounds: the figure follows the number without racing or stalling.
  const beat = bpm === null ? null : 60 / Math.min(Math.max(bpm, 30), 220)
  const style = (
    beat === null ? {} : { '--tele-beat': `${(beat * 2).toFixed(2)}s` }
  ) as CSSProperties
  return (
    <>
      <path className="tele-grid" d={`M0 ${H / 2}H${W}`} />
      {bpm === null ? (
        <path className="tele-line tele-line--idle" d={`M0 ${H * 0.62}H${W}`} />
      ) : (
        <g className="tele-sweep" style={style}>
          <path
            className="tele-line"
            d={`M0 ${H * 0.62}${BEAT}${BEAT}${BEAT}${BEAT}`}
          />
        </g>
      )}
    </>
  )
}

// Two bars on one scale: the upper one systolic, the lower one diastolic.
function PressureBars({ sys, dia }: { sys: number | null; dia: number | null }) {
  const bar = (y: number, id: string, value: number | null, tag: string) => (
    <g>
      <text className="tele-tag" x="0" y={y + 9}>
        {tag}
      </text>
      <rect className="tele-track" x="34" y={y} width={W - 34} height="10" rx="2" />
      <rect
        className="tele-fill"
        x="34"
        y={y}
        width={W - 34}
        height="10"
        rx="2"
        style={{ transform: `scaleX(${value === null ? 0 : fraction(id, value)})`, transformOrigin: '34px 0' }}
      />
    </g>
  )
  return (
    <>
      {bar(12, 'bp_sys_mmhg', sys, 'SYS')}
      {bar(40, 'bp_dia_mmhg', dia, 'DIA')}
    </>
  )
}

// A ring that fills with the value, with tick marks around it.
function Ring({ id, value }: { id: string; value: number | null }) {
  const r = 24
  const c = 2 * Math.PI * r
  const f = value === null ? 0 : fraction(id, value)
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <g transform={`translate(${W / 2} ${H / 2})`}>
      {ticks.map((angle) => (
        <path key={angle} className="tele-tick" d="M0 -31V-28" transform={`rotate(${angle})`} />
      ))}
      <circle className="tele-track tele-track--ring" r={r} />
      <circle
        className="tele-arc"
        r={r}
        transform="rotate(-90)"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
      />
      <circle className="tele-dot" r={value === null ? 0 : 3} />
    </g>
  )
}

// A level scale: ticks along a rail and one marker that slides to the value.
function Level({ id, value }: { id: string; value: number | null }) {
  const ticks = Array.from({ length: 21 }, (_, i) => i)
  const x = value === null ? 0 : fraction(id, value) * (W - 16)
  return (
    <>
      {ticks.map((i) => (
        <path
          key={i}
          className="tele-tick"
          d={`M${8 + (i * (W - 16)) / 20} ${i % 5 === 0 ? 20 : 26}V38`}
        />
      ))}
      <path className="tele-grid" d={`M8 38H${W - 8}`} />
      {value !== null && (
        <g className="tele-marker" style={{ transform: `translateX(${x}px)` }}>
          <path className="tele-line tele-line--marker" d="M8 12V52" />
        </g>
      )}
    </>
  )
}

// Twelve hour cells; the hours slept light up, the last one in part.
function Hours({ value }: { value: number | null }) {
  const cells = Array.from({ length: 12 }, (_, i) => i)
  const hours = value === null ? 0 : Math.min(Math.max(value, 0), 12)
  const cell = (W - 11 * 4) / 12
  return (
    <>
      {cells.map((i) => {
        const part = Math.min(Math.max(hours - i, 0), 1)
        return (
          <g key={i} transform={`translate(${i * (cell + 4)} 16)`}>
            <rect className="tele-track" width={cell} height="26" rx="2" />
            <rect
              className="tele-fill"
              width={cell}
              height="26"
              rx="2"
              style={{ opacity: part }}
            />
          </g>
        )
      })}
      <text className="tele-tag" x="0" y="58">
        0 h
      </text>
      <text className="tele-tag tele-tag--end" x={W} y="58">
        12 h
      </text>
    </>
  )
}

// Five steps of rising height; the chosen one and the ones under it light up.
function Steps({ value }: { value: number | null }) {
  const steps = [1, 2, 3, 4, 5]
  const width = (W - 4 * 8) / 5
  return (
    <>
      {steps.map((step, i) => {
        const height = 12 + i * 9
        const on = value !== null && step <= value
        return (
          <g key={step} transform={`translate(${i * (width + 8)} ${H - 8 - height})`}>
            <rect className="tele-track" width={width} height={height} rx="2" />
            <rect
              className="tele-fill"
              width={width}
              height={height}
              rx="2"
              style={{ opacity: on ? (step === value ? 1 : 0.45) : 0 }}
            />
          </g>
        )
      })}
    </>
  )
}

// The water drunk: a glass that fills from the bottom to the value, with a mark
// every litre on its side. The bounds are a drawing scale, not an amount that
// means anything.
function Glass({ value }: { value: number | null }) {
  const f = value === null ? 0 : fraction('fluid_intake_ml', value)
  const top = 6
  const bottom = 58
  const height = bottom - top
  const d = `M80 ${top}H120L114 ${bottom}H86Z`
  return (
    <>
      <clipPath id="tele-glass-clip">
        <path d={d} />
      </clipPath>
      <path className="tele-track" d={d} />
      <g clipPath="url(#tele-glass-clip)">
        <rect
          className="tele-fill"
          x="78"
          y={top}
          width="44"
          height={height}
          style={{ transform: `scaleY(${f})`, transformOrigin: `100px ${bottom}px` }}
        />
      </g>
      {[1, 2, 3].map((litre) => (
        <path
          key={litre}
          className="tele-tick"
          d={`M126 ${bottom - (litre * height) / 4}h8`}
        />
      ))}
      <text className="tele-tag" x="140" y={bottom + 2}>
        0
      </text>
      <text className="tele-tag" x="140" y={top + 8}>
        4 L
      </text>
    </>
  )
}

// The body mass as the dial of a scale: ticks along a half circle, one needle,
// and the figure of the readout under it. Same bounds idea as the pressure
// gauge: a place on the dial, not a verdict.
function ScaleDial({ value }: { value: number | null }) {
  const f = value === null ? 0 : fraction('body_mass_kg', value)
  const angle = -90 + f * 180
  const ticks = Array.from({ length: 11 }, (_, i) => -90 + i * 18)
  return (
    <g transform="translate(100 54)">
      {ticks.map((a, i) => (
        <path
          key={a}
          className="tele-tick"
          d={i % 5 === 0 ? 'M0 -44V-36' : 'M0 -42V-38'}
          transform={`rotate(${a})`}
        />
      ))}
      <path className="tele-track tele-track--ring" d="M-34 0A34 34 0 0 1 34 0" />
      {value !== null && (
        <g className="tele-marker-rot" style={{ transform: `rotate(${angle}deg)` }}>
          <path className="tele-line tele-line--marker" d="M0 0V-32" />
        </g>
      )}
      <circle className="tele-dot" r="3.5" />
      <text className="tele-tag" x="-66" y="2">
        40
      </text>
      <text className="tele-tag tele-tag--end" x="66" y="2">
        140 kg
      </text>
    </g>
  )
}

/** The figures made of lines only, which can stretch without distortion. */
const STRETCHED = new Set(['hr_bpm', 'glucose_mgdl'])

function figure(kind: string, values: (number | null)[]): ReactElement {
  const first = values[0] ?? null
  switch (kind) {
    case 'hr_bpm':
      return <Pulse bpm={first} />
    case 'bp':
      return <PressureBars sys={first} dia={values[1] ?? null} />
    case 'temp_core_c':
      return <Ring id={kind} value={first} />
    case 'sleep_h':
      return <Hours value={first} />
    case 'mood_1_5':
    case 'appetite_1_5':
      // Appetite is a 1 to 5 self-rating like mood, so it draws the same steps.
      return <Steps value={first} />
    case 'fluid_intake_ml':
      return <Glass value={first} />
    case 'body_mass_kg':
      return <ScaleDial value={first} />
    default:
      return <Level id={kind} value={first} />
  }
}

export default function TelemetryVisual({ kind, values }: TelemetryVisualProps) {
  const live = values.some((value) => value !== null)
  return (
    <span
      className={`tele${live ? ' tele--live' : ''}`}
      data-telemetry={kind}
      aria-hidden="true"
    >
      {/* The pulse trace and the level scale run the whole width of the
          window; the other figures keep their proportions. */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio={STRETCHED.has(kind) ? 'none' : 'xMidYMid meet'}
        focusable="false"
      >
        {figure(kind, values)}
      </svg>
    </span>
  )
}

export interface SparklineProps {
  /** Earlier readings, oldest first. */
  values: number[]
  /** The value in the readout that is not saved yet, drawn as an open dot. */
  pending?: number | null
}

// The small history of one indicator: the person's own earlier readings in
// the order they were taken. It has no axis and no band: it shows the shape,
// and the words under it give the count, the lowest and the highest.
export function Sparkline({ values, pending = null }: SparklineProps) {
  const all = pending === null ? values : [...values, pending]
  if (all.length < 2) return null
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const width = 120
  const height = 28
  const x = (index: number) => 3 + (index * (width - 6)) / (all.length - 1)
  const y = (value: number) => height - 4 - ((value - min) / span) * (height - 8)
  const points = values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`)
  const last = values.length - 1
  return (
    <span className="tele-spark" aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
        {points.length > 1 && <polyline className="tele-spark__line" points={points.join(' ')} />}
        {last >= 0 && (
          <circle className="tele-spark__dot" cx={x(last)} cy={y(values[last])} r="2.5" />
        )}
        {pending !== null && (
          <>
            {last >= 0 && (
              <path
                className="tele-spark__link"
                d={`M${x(last).toFixed(1)} ${y(values[last]).toFixed(1)}L${x(all.length - 1).toFixed(1)} ${y(pending).toFixed(1)}`}
              />
            )}
            <circle
              className="tele-spark__pending"
              cx={x(all.length - 1)}
              cy={y(pending)}
              r="3"
            />
          </>
        )}
      </svg>
    </span>
  )
}
