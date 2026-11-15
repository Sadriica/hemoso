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
          <a
            className="topbar__source"
            href={strings.topbar.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={strings.topbar.sourceName}
          >
            <svg
              className="topbar__source-mark"
              viewBox="0 0 16 16"
              width="18"
              height="18"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            <span className="topbar__source-label topbar__source-label--long">
              {strings.topbar.sourceLabel}
            </span>
            <span className="topbar__source-label topbar__source-label--short">
              {strings.topbar.sourceLabelShort}
            </span>
          </a>
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
