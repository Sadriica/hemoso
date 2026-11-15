import { strings } from '../strings'
import { BAND, MIN_WINDOW } from '../domain/state'
import type { MeasurementContext } from '../domain/types'

// The compact trend row of a card (DESIGN.md 8): the latest value against the
// person's own last readings, as a shape and as words. The band is the usual
// range (the median and three spreads, the rule of FORMATS.md section 3); the
// dot is the latest value, the tick the median. It is drawn from the numbers
// the state already has: nothing is computed here but the position.
export interface Baseline {
  median: number | null
  spread: number | null
  /** How many earlier readings the baseline rests on. */
  n: number
}

// The scale of the drawing: twice the band, so a value far outside still sits
// on the line instead of leaving it.
const SCALE = BAND * 4

function round(value: number): number {
  return Number(value.toFixed(2))
}

export default function TrendRow({
  value,
  unit,
  baseline,
  context,
}: {
  value: number
  unit: string
  baseline: Baseline
  // The context of the reading: only same-context readings are compared, so
  // the sentence says which ones are missing.
  context?: MeasurementContext
}) {
  const { median, spread, n } = baseline
  if (median === null || spread === null || spread <= 0) {
    return (
      <div className="trend trend--waiting">
        {/* How far the baseline is: one mark per reading it still needs. The
            sentence beside it says the same in words. */}
        <span className="trend__pips" aria-hidden="true">
          {Array.from({ length: MIN_WINDOW }, (_, index) => (
            <span
              key={index}
              className={`trend__pip${index < n ? ' trend__pip--on' : ''}`}
            />
          ))}
        </span>
        <p className="trend__words">
          {strings.trend.notEnough(
            n,
            MIN_WINDOW,
            context ? strings.trend.contextPhrase[context] : undefined,
          )}
        </p>
      </div>
    )
  }

  const offset = (value - median) / spread
  const position = Math.min(Math.max(50 + (offset / SCALE) * 100, 4), 96)
  const bandHalf = (BAND / SCALE) * 100
  const side =
    Math.abs(offset) <= BAND ? 'within' : offset > 0 ? 'above' : 'below'

  return (
    <div className={`trend trend--${side}`}>
      <p className="trend__title">{strings.trend.title(n)}</p>
      <div className="trend__track">
        <svg
          className="trend__shape"
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {/* The rail spans the whole track, so the dot lands on a line even
              when the value is far outside the usual band. */}
          <rect className="trend__rail" x="0" y="5" width="100" height="2" />
          <rect
            className="trend__band"
            x={50 - bandHalf}
            y="3"
            width={bandHalf * 2}
            height="6"
          />
          <line className="trend__median" x1="50" x2="50" y1="1" y2="11" />
        </svg>
        <span
          className="trend__dot"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="trend__words">
        {strings.trend[side]}
        {' · '}
        {strings.trend.usualLabel}{' '}
        <span className="trend__unit">
          {round(median)} {strings.cardUnit(unit)}
        </span>
      </p>
    </div>
  )
}
