import { useState } from 'react'
import { createClient } from './api/client'
import type { ApiClient } from './api/client'
import SyntheticNotice from './components/SyntheticNotice'
import { useAppData } from './hooks/useAppData'
import type { Role } from './hooks/useAppData'
import AstronautHome from './screens/AstronautHome'
import MissionControl from './screens/MissionControl'
import { phaseLabel, strings } from './strings'

interface AppProps {
  client?: ApiClient
}

export default function App({ client: clientProp }: AppProps) {
  const [client] = useState<ApiClient>(() => clientProp ?? createClient())
  const [role, setRole] = useState<Role>('astronaut')
  const [crewId, setCrewId] = useState('')
  const [day, setDay] = useState(0)

  const { mission, crew, days, status, mcStatus, loading, error, retry } =
    useAppData(client, role, crewId, day)

  const selectedCrewId = crewId || crew[0]?.id || ''
  const selectedDay = day || days[0] || 0
  const hasContent = role === 'astronaut' ? status !== null : mcStatus.length > 0

  return (
    <>
      <a className="skip-link" href="#main-content">
        {strings.skipToMain}
      </a>
      <header className="app-header">
        <h1>{strings.appName}</h1>
        <div className="top-bar">
          {mission && (
            <span className="top-bar__item">
              {strings.environment[mission.environment]}
            </span>
          )}
          {selectedDay > 0 && (
            <span className="top-bar__item">{strings.dayLabel(selectedDay)}</span>
          )}
          {mission && (
            <span className="top-bar__item">{phaseLabel(mission.phase)}</span>
          )}
        </div>
        <div className="controls">
          <div className="role-switcher" role="group" aria-label={strings.role.label}>
            <button
              type="button"
              aria-pressed={role === 'astronaut'}
              onClick={() => setRole('astronaut')}
            >
              {strings.role.astronaut}
            </button>
            <button
              type="button"
              aria-pressed={role === 'mission_control'}
              onClick={() => setRole('mission_control')}
            >
              {strings.role.missionControl}
            </button>
          </div>
          {role === 'astronaut' && (
            <div className="crew-picker">
              <label htmlFor="crew-picker">{strings.crewPickerLabel}</label>
              <select
                id="crew-picker"
                value={selectedCrewId}
                onChange={(event) => setCrewId(event.target.value)}
              >
                {crew.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="day-picker">
            <label htmlFor="mission-day">{strings.missionDayLabel}</label>
            <select
              id="mission-day"
              value={selectedDay}
              disabled={days.length === 0}
              onChange={(event) => setDay(Number(event.target.value))}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {strings.dayLabel(d)}
                </option>
              ))}
            </select>
          </div>
          {loading && hasContent && (
            <span role="status" className="loading-indicator">
              {strings.loading}
            </span>
          )}
        </div>
      </header>
      <main id="main-content" className="app-main" tabIndex={-1}>
        <SyntheticNotice />
        {error && (
          <div className="error" role="alert">
            <p>{strings.error}</p>
            <button type="button" onClick={retry}>
              {strings.retry}
            </button>
          </div>
        )}
        {!error && !hasContent && <p role="status">{strings.loading}</p>}
        {!error && role === 'astronaut' && status && (
          <AstronautHome
            label={
              crew.find((entry) => entry.id === status.crewId)?.label ??
              status.crewId
            }
            status={status}
          />
        )}
        {!error && role === 'mission_control' && mcStatus.length > 0 && (
          <MissionControl entries={mcStatus} />
        )}
      </main>
    </>
  )
}
