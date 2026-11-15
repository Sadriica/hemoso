import { PHASES, type PhaseId } from '../phases/phaseIds'
import { strings } from '../strings'

// The route along the bottom of the screen: where the check is, out of three.
// It is a progress indicator, not a menu: the steps are text, and the only way
// forward or back is the button inside the phase itself.
export default function PhaseRail({ current }: { current: PhaseId }) {
  const index = PHASES.indexOf(current)
  const next = PHASES[index + 1]
  const progress = ((index + 1) / PHASES.length) * 100

  return (
    <nav className="phase-rail" aria-label={strings.phases.railLabel}>
      <div className="phase-rail__track" aria-hidden="true">
        <div className="phase-rail__progress" style={{ width: `${progress}%` }} />
      </div>
      <p className="sr-only">{strings.phases.step(index + 1, PHASES.length)}</p>
      <ol className="phase-rail__steps">
        {PHASES.map((phase, position) => {
          const copy = strings.phases[phase]
          const state =
            position < index ? 'done' : position === index ? 'current' : 'next'
          return (
            <li
              key={phase}
              className={`phase-rail__step phase-rail__step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <b>{copy.number}</b>
              <span>{copy.name}</span>
            </li>
          )
        })}
      </ol>
      <p className="phase-rail__next">
        {next === undefined
          ? strings.phases.last
          : strings.phases.next(strings.phases[next].name)}
      </p>
    </nav>
  )
}
