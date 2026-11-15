import { useId, type CSSProperties, type ReactElement } from 'react'
import { fraction, SCALES } from './scales'
import './instruments.css'

const COLOR: Record<string, string> = {
  hr_bpm: 'cardiovascular',
  bp_sys_mmhg: 'cardiovascular',
  bp_dia_mmhg: 'cardiovascular',
  temp_core_c: 'thermoregulation',
  sleep_h: 'sleep',
  mood_1_5: 'neuro',
  reaction_median_ms: 'neuro',
  reaction_lapses: 'neuro',
  glucose_mgdl: 'metabolic',
  appetite_1_5: 'metabolic',
  fluid_intake_ml: 'metabolic',
  // Body mass has no body-system colour yet (DESIGN.md 2.3): it takes the accent.
}

const r2 = (n: number) => Math.round(n * 100) / 100
const settle = (final: CSSProperties, from: string, opacity?: number): CSSProperties =>
  ({
    ...final,
    '--ins-from': from,
    ...(opacity === undefined ? {} : { '--ins-from-opacity': opacity }),
  }) as CSSProperties

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function Heart() {
  return (
    <g className="ins-beat">
      <path className="ins-outline" d="M48 80C20 62 12 46 12 34a18 18 0 0 1 36-4 18 18 0 0 1 36 4c0 12-8 28-36 46z" fill="currentColor" />
    </g>
  )
}

function Gauge({ id, value }: { id: string; value: number }) {
  const angle = r2(-90 + fraction(id, value) * 180)
  return (
    <>
      <path className="ins-track" d="M12 66a36 36 0 0 1 72 0" strokeWidth={4} strokeLinecap="round" />
      <g
        className="ins-settle ins-needle"
        data-angle={angle}
        style={settle({ transform: `rotate(${angle}deg)`, transformOrigin: '48px 66px' }, 'rotate(-90deg)')}
      >
        <path d="M48 66V32" {...STROKE} />
      </g>
      <circle cx="48" cy="66" r="6" fill="currentColor" />
    </>
  )
}

function Thermometer({ value }: { value: number }) {
  const f = r2(fraction('temp_core_c', value))
  return (
    <>
      <rect className="ins-track" x="38" y="8" width="20" height="60" rx="10" strokeWidth={4} />
      <circle className="ins-track" cx="48" cy="74" r="14" strokeWidth={4} />
      <circle cx="48" cy="74" r="9" fill="currentColor" />
      <rect
        className="ins-settle ins-fill ins-level"
        data-fill={f}
        x="44"
        y="14"
        width="8"
        height="58"
        rx="4"
        fill="currentColor"
        style={settle({ transform: `scaleY(${f})`, transformOrigin: '48px 72px' }, 'scaleY(0)')}
      />
    </>
  )
}

function Moon({ value }: { value: number }) {
  const clip = 'ins-' + useId().replace(/\W/g, '')
  const offset = r2((1 - fraction('sleep_h', value)) * 56)
  return (
    <>
      <clipPath id={clip}>
        <rect x="0" y="0" width="96" height="76" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g
          className="ins-settle ins-moon"
          data-offset={offset}
          style={settle({ transform: `translateY(${offset}px)` }, 'translateY(56px)')}
        >
          <path className="ins-outline" d="M56 14a30 30 0 1 0 26 44 24 24 0 0 1-26-44z" fill="currentColor" />
        </g>
      </g>
      <path className="ins-track" d="M8 82h80" strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

function Face({ value }: { value: number }) {
  const v = SCALES.mood_1_5.min + fraction('mood_1_5', value) * 4
  const y = r2(64 + (v - 3) * 11)
  return (
    <g className="ins-settle" style={settle({}, 'scale(0.9)', 0)}>
      <circle className="ins-outline" cx="48" cy="48" r="36" {...STROKE} />
      <circle cx="35" cy="40" r="4" fill="currentColor" />
      <circle cx="61" cy="40" r="4" fill="currentColor" />
      <path className="ins-mouth" data-y={y} d={`M32 62Q48 ${y} 64 62`} {...STROKE} />
    </g>
  )
}

function Drop({ value }: { value: number }) {
  const clip = 'ins-' + useId().replace(/\W/g, '')
  const f = fraction('glucose_mgdl', value)
  const offset = r2((1 - f) * 72)
  const d = 'M48 10C34 30 20 44 20 58a28 28 0 0 0 56 0C76 44 62 30 48 10z'
  return (
    <>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path className="ins-track" d={d} strokeWidth={4} strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <rect
          className="ins-settle ins-level"
          data-offset={offset}
          x="16"
          y="10"
          width="64"
          height="76"
          fill="currentColor"
          style={settle({ transform: `translateY(${offset}px)` }, 'translateY(76px)')}
        />
      </g>
    </>
  )
}

// The 1 to 5 self-rating as five steps of rising height, like the mood steps of
// the report: the steps up to the value are filled.
function Steps5({ id, value }: { id: string; value: number }) {
  const on = Math.round(SCALES[id].min + fraction(id, value) * (SCALES[id].max - SCALES[id].min))
  return (
    <>
      {[1, 2, 3, 4, 5].map((step) => {
        const filled = step <= on
        const height = 16 + step * 11
        return (
          <rect
            key={step}
            className={filled ? undefined : 'ins-track'}
            x={10 + (step - 1) * 16}
            y={84 - height}
            width={11}
            height={height}
            rx={4}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={3}
          />
        )
      })}
    </>
  )
}

// A glass that fills to the water drunk. Drawing bounds only.
function Cup({ value }: { value: number }) {
  const clip = 'ins-' + useId().replace(/\W/g, '')
  const f = fraction('fluid_intake_ml', value)
  const offset = r2((1 - f) * 72)
  const d = 'M22 14h52l-6 68H28z'
  return (
    <>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      <path className="ins-track" d={d} strokeWidth={4} strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <rect
          className="ins-settle ins-level"
          data-offset={offset}
          x="16"
          y="12"
          width="64"
          height="72"
          fill="currentColor"
          style={settle({ transform: `translateY(${offset}px)` }, 'translateY(72px)')}
        />
      </g>
    </>
  )
}

// The dial of a body scale: a half circle with ticks, a needle and a flat base.
function Dial({ value }: { value: number }) {
  const angle = r2(-90 + fraction('body_mass_kg', value) * 180)
  return (
    <>
      <path className="ins-track" d="M12 62a36 36 0 0 1 72 0" strokeWidth={4} strokeLinecap="round" />
      {[-90, -54, -18, 18, 54, 90].map((a) => (
        <path key={a} d="M48 20v6" stroke="currentColor" strokeWidth={3} strokeLinecap="round" transform={`rotate(${a} 48 62)`} />
      ))}
      <g
        className="ins-settle ins-needle"
        data-angle={angle}
        style={settle({ transform: `rotate(${angle}deg)`, transformOrigin: '48px 62px' }, 'rotate(-90deg)')}
      >
        <path d="M48 62V34" {...STROKE} />
      </g>
      <circle cx="48" cy="62" r="5" fill="currentColor" />
      <path className="ins-track" d="M14 78h68" strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

/** Status of the reading, for colour only; the shapes never change with it. */
export type InstrumentState = 'in_range' | 'outside' | 'review' | 'no_data'

const STATE_TOKEN: Record<InstrumentState, string> = {
  in_range: '--status-in-range-text',
  outside: '--status-attention-text',
  review: '--status-review-text',
  no_data: '--status-no-data-text',
}

/**
 * Lapses as a row of five ticks: the filled ones are the lapses counted. The
 * drawing only reads `value`; the card states the number in words.
 */
function Tally({ value }: { value: number }) {
  const on = Math.round(fraction('reaction_lapses', value) * 5)
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => {
        const filled = index < on
        return (
          <rect
            key={index}
            className={filled ? undefined : 'ins-track'}
            x={14 + index * 15}
            y={filled ? 30 : 52}
            width={9}
            height={filled ? 34 : 12}
            rx={4}
            fill={filled ? 'currentColor' : 'none'}
            strokeWidth={3}
          />
        )
      })}
    </>
  )
}

/**
 * Props of `Instrument`.
 * - `indicatorId`: one of hr_bpm, bp_sys_mmhg, bp_dia_mmhg, temp_core_c,
 *   sleep_h, mood_1_5, glucose_mgdl, reaction_median_ms, reaction_lapses, appetite_1_5, fluid_intake_ml, body_mass_kg. Any
 *   other id renders nothing.
 * - `value`: the number the card already shows; it only sets the drawing.
 * - `reducedMotion`: draw the final state with no animation.
 * - `state`: optional. The whole figure (fill, needle, features and outline)
 *   takes the state colour; the system colour stays on the name icon. The tint changes over
 *   `--motion-base`. Without it the figure is drawn in the system colour.
 */
export interface InstrumentProps {
  indicatorId: string
  value: number
  reducedMotion?: boolean
  state?: InstrumentState
}

/**
 * Animated figure of one indicator, driven only by `value`. Decorative
 * (`aria-hidden`): the card already states the value in words. The heart
 * beats three times at a fixed calm pace, then rests, that does not follow the value.
 */
export default function Instrument({ indicatorId, value, reducedMotion = false, state }: InstrumentProps): ReactElement | null {
  let figure: ReactElement
  switch (indicatorId) {
    case 'hr_bpm':
      figure = <Heart />
      break
    case 'bp_sys_mmhg':
    case 'bp_dia_mmhg':
      figure = <Gauge id={indicatorId} value={value} />
      break
    case 'temp_core_c':
      figure = <Thermometer value={value} />
      break
    case 'sleep_h':
      figure = <Moon value={value} />
      break
    case 'mood_1_5':
      figure = <Face value={value} />
      break
    case 'glucose_mgdl':
      figure = <Drop value={value} />
      break
    case 'reaction_median_ms':
      // The needle settles on the median time, like the blood pressure gauge.
      figure = <Gauge id={indicatorId} value={value} />
      break
    case 'reaction_lapses':
      figure = <Tally value={value} />
      break
    case 'appetite_1_5':
      figure = <Steps5 id={indicatorId} value={value} />
      break
    case 'fluid_intake_ml':
      figure = <Cup value={value} />
      break
    case 'body_mass_kg':
      figure = <Dial value={value} />
      break
    default:
      return null
  }
  const system = COLOR[indicatorId] ? `var(--system-${COLOR[indicatorId]})` : 'var(--color-accent)'
  const tint = state && STATE_TOKEN[state]
  return (
    <span
      className={`instrument ${reducedMotion ? 'instrument--still' : 'instrument--anim'}${tint ? ' instrument--state' : ''}`}
      style={{ color: tint ? `var(${tint})` : system }}
      data-state={tint ? state : undefined}
      aria-hidden="true"
      data-indicator={indicatorId}
    >
      <svg viewBox="0 0 96 96" width="96" height="96" focusable="false">
        {figure}
      </svg>
    </span>
  )
}
