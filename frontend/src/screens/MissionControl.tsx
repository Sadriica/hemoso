import type { MissionControlStatus } from '../api/types'
import { strings } from '../strings'

export default function MissionControl({
  entries,
}: {
  entries: MissionControlStatus[]
}) {
  return (
    <section aria-label={strings.role.missionControl} className="panel">
      <h2>{strings.role.missionControl}</h2>
      <ul className="fitness">
        {entries.map((entry) => (
          <li key={entry.crewId} className="fitness__item">
            <span className="fitness__name">{entry.label}</span>
            <span className="fitness__value">{strings.fitness[entry.fitness]}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
