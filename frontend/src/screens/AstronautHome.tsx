import type { CrewStatus } from '../api/types'
import LevelBadge from '../components/LevelBadge'
import { strings } from '../strings'

export default function AstronautHome({
  label,
  status,
}: {
  label: string
  status: CrewStatus
}) {
  return (
    <section aria-label={label} className="panel">
      <h2>{label}</h2>
      <div className="overall">
        <span className="overall__label">{strings.overall}</span>
        <LevelBadge level={status.worstLevel} />
      </div>
      <ul className="systems">
        {status.systems.map((system) => (
          <li key={system.system} className="systems__item">
            <span className="systems__name">{strings.system[system.system]}</span>
            <LevelBadge level={system.level} />
          </li>
        ))}
      </ul>
    </section>
  )
}
