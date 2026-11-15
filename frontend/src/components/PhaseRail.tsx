import { UtilityIcon } from '../icons'
import { PHASES, type PhaseId } from '../phases/phaseIds'
import { strings } from '../strings'

// The route along the bottom of the screen: three numbered nodes on one track,
// where the check is out of three. The current node is the accent one and a
// little larger, the ones already done carry a check, and the track fills up to
// the current node. It is a progress indicator, not a menu: the only way
// forward or back is the button inside the phase itself, and each label already
// says what comes next.
export default function PhaseRail({ current }: { current: PhaseId }) {
  const index = PHASES.indexOf(current)
  // The fill stops at the current node, so the first step leaves the track
  // empty and the last one fills it.
  const progress = index <= 0 ? 0 : (index / (PHASES.length - 1)) * 100

  return (
    <nav className="phase-rail" aria-label={strings.phases.railLabel}>
      <p className="sr-only">{strings.phases.step(index + 1, PHASES.length)}</p>
      <div className="phase-rail__stepper">
        <div className="phase-rail__track" aria-hidden="true">
          <span className="phase-rail__fill" style={{ width: `${progress}%` }} />
        </div>
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
                <span className="phase-rail__node" aria-hidden="true">
                  {state === 'done' ? (
                    <UtilityIcon kind="check" size={16} />
                  ) : (
                    copy.number
                  )}
                </span>
                <span className="phase-rail__label">{copy.name}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
