import { forwardRef } from 'react'

interface PhaseHeadingProps {
  eyebrow: string
  /** The headline, one entry per stacked line. */
  lines: readonly string[]
  intro: string
}

// The opening of a phase: a numbered eyebrow, a short headline set as stacked
// lines (the only level 1 heading on screen), and one sentence of help. The
// heading takes focus when the phase opens, so a screen reader starts there.
const PhaseHeading = forwardRef<HTMLHeadingElement, PhaseHeadingProps>(
  function PhaseHeading({ eyebrow, lines, intro }, ref) {
    return (
      <div className="phase-heading" data-enter="headline">
        <p className="eyebrow">
          <span className="hairline" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 ref={ref} id="phase-heading" tabIndex={-1} className="headline">
          {lines.map((line) => (
            <span key={line} className="headline__line">
              {line}{' '}
            </span>
          ))}
        </h1>
        <p className="phase-heading__intro">{intro}</p>
      </div>
    )
  },
)

export default PhaseHeading
