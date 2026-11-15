import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import type { MissionClock } from '../domain/clock'
import { UtilityIcon } from '../icons'
import { strings } from '../strings'
import OfflineNotice from './OfflineNotice'
import MissionStart from './MissionStart'
import SyncStatus from './SyncStatus'
import SyntheticNotice from './SyntheticNotice'

interface TopbarProps {
  /** Mission day and clock of the signed-in person; null hides them (phase 1). */
  clock: MissionClock | null
  /** The crew member of this check, once phase 1 is done. */
  personId: string | null
  /** Saved mission start (YYYY-MM-DD) of the person; null when none. */
  missionStart?: string | null
  /** Called with the new date; without it the start cannot be edited here. */
  onChangeMissionStart?: (date: string) => void
  store: EntryStore & Outbox
  client: SyncClient
  motionReduced: boolean
  onToggleMotion: () => void
}

// The bar on top of every phase, as one calm line of plain text: the mark and
// the name, the mission line of real data (day, clock, who is on duty), the
// synthetic data sentence of REQ-14, the sync state and the motion switch. No
// boxes and no stripe, one hairline under it. A narrow screen moves the
// mission line and the sentence to rows of their own. It holds no navigation:
// the check moves forward only through each phase's own button.
export default function Topbar({
  clock,
  personId,
  missionStart = null,
  onChangeMissionStart,
  store,
  client,
  motionReduced,
  onToggleMotion,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__bar">
        <p className="identity">
          <svg
            className="identity__mark"
            viewBox="0 0 42 42"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="21" cy="21" r="15" />
            <path d="M6 30 C 14 20, 28 14, 37 10" />
            <circle cx="21" cy="21" r="5" />
          </svg>
          <span className="identity__name">{strings.appName}</span>
        </p>

        <div className="topbar__mission">
          {clock && (
            <p className="topbar__stamp">
              {strings.header.metadata(clock.missionDay, clock.time)}
            </p>
          )}
          {personId && (
            <p className="topbar__duty">{strings.topbar.onDuty(personId)}</p>
          )}
          {personId && onChangeMissionStart && (
            <MissionStart start={missionStart} onChange={onChangeMissionStart} />
          )}
        </div>

        <SyntheticNotice />

        <div className="topbar__controls">
          <SyncStatus store={store} client={client} />
          <button
            type="button"
            className="topbar__motion"
            aria-pressed={motionReduced}
            aria-label={strings.topbar.reduceMotion}
            title={
              motionReduced ? strings.topbar.motionOff : strings.topbar.motionOn
            }
            onClick={onToggleMotion}
          >
            <UtilityIcon kind={motionReduced ? 'still' : 'motion'} size={18} />
            <span className="topbar__motion-label">{strings.topbar.reduceMotion}</span>
          </button>
        </div>
      </div>
      <OfflineNotice client={client} />
    </header>
  )
}
