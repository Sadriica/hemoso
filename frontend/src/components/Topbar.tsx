import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import type { MissionClock } from '../domain/clock'
import { strings } from '../strings'
import SyncStatus from './SyncStatus'
import SyntheticNotice from './SyntheticNotice'

interface TopbarProps {
  clock: MissionClock
  /** The crew member of this check, once phase 1 is done. */
  personId: string | null
  store: EntryStore & Outbox
  client: SyncClient
  motionReduced: boolean
  onToggleMotion: () => void
}

// The bar on top of every phase: the mark and name, the mission metadata line,
// the synthetic data sentence (REQ-14), who is on duty, the sync facts
// (REQ-28) and the motion switch. It holds no navigation: the check moves
// forward only through each phase's own button.
export default function Topbar({
  clock,
  personId,
  store,
  client,
  motionReduced,
  onToggleMotion,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__row">
        <p className="identity">
          <svg className="identity__mark" viewBox="0 0 42 42" aria-hidden="true" focusable="false">
            <circle cx="21" cy="21" r="15" />
            <path d="M6 30 C 14 20, 28 14, 37 10" />
            <circle cx="21" cy="21" r="5" />
          </svg>
          <span className="identity__name">
            {strings.appName}
            <small>{strings.topbar.tagline}</small>
          </span>
        </p>
        <div className="topbar__meta">
          <span className="topbar__stamp">
            {strings.header.metadata(clock.missionDay, clock.time)}
          </span>
          {personId && (
            <span className="topbar__duty">
              <i aria-hidden="true" />
              {strings.topbar.onDuty(personId)}
            </span>
          )}
        </div>
        <button
          type="button"
          className="topbar__motion"
          aria-pressed={motionReduced}
          onClick={onToggleMotion}
        >
          {strings.topbar.reduceMotion}
        </button>
      </div>
      <div className="topbar__row topbar__row--facts">
        <SyntheticNotice />
        <SyncStatus store={store} client={client} />
      </div>
    </header>
  )
}
