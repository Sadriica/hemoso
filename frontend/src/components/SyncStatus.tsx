import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import { useOutbox } from '../hooks/useOutbox'
import { useSync } from '../hooks/useSync'
import { strings } from '../strings'

// The sending state of the outbox (REQ-28) as one chip: the connection, then
// the one thing that matters about it, which is the readings waiting or the
// last send that went wrong. "Send now" appears only while something waits and
// a server is set up; a button that can never work would only add noise. The
// icon draws the same state as the words, so the chip is never colour alone
// (REQ-15), and its title is the whole sentence, which is what a narrow screen
// keeps after it drops the word "waiting".
export default function SyncStatus({
  store,
  client,
}: {
  store: EntryStore & Outbox
  client: SyncClient
}) {
  const outbox = useOutbox(store)
  const { online, sendNow } = useSync(store, client)
  const configured = client.isConfigured()
  const waiting = outbox.pendingCount
  const notAccepted = outbox.conflictCount + outbox.rejectedCount

  const state = !configured
    ? strings.sync.noServer
    : online
      ? strings.sync.online
      : strings.sync.offline
  // One fact after the state, most important first: a refused reading, then
  // the count of readings on their way, then the quiet state.
  const detail =
    notAccepted > 0
      ? strings.sync.notAccepted(notAccepted)
      : waiting > 0
        ? strings.sync.waiting(waiting)
        : configured
          ? strings.sync.allSent
          : strings.sync.savedHere
  const tone =
    notAccepted > 0 || (!configured && waiting > 0) || !online
      ? 'attention'
      : configured
        ? 'online'
        : 'idle'

  return (
    <div className="sync">
      <p
        className={`sync-chip sync-chip--${tone}`}
        title={strings.sync.chip(state, detail)}
      >
        <span className="sync-chip__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
            {online ? <OnlineIcon /> : <OfflineIcon />}
          </svg>
        </span>
        <span className="sync-chip__state">{state}</span>
        <span className="sync-chip__rest">
          <span className="sync-chip__separator">{' · '}</span>
          {notAccepted > 0 || waiting === 0 ? (
            <span className="sync-chip__quiet">{detail}</span>
          ) : (
            // The count stays in every width; a phone drops the word after it,
            // which stays in the accessibility tree.
            <>
              <span className="sync-chip__count">{waiting}</span>
              <span className="sync-chip__word">
                {' '}
                {strings.sync.waitingWord}
              </span>
            </>
          )}
        </span>
      </p>

      {configured && waiting > 0 && (
        <button className="sync__send" type="button" onClick={sendNow}>
          {strings.sync.sendNow}
        </button>
      )}
    </div>
  )
}

// Two signal arcs and a dot: the browser is online.
function OnlineIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5.8 11.6a9 9 0 0 1 12.4 0" />
      <path d="M8.6 14.9a5.2 5.2 0 0 1 6.8 0" />
      <circle cx="12" cy="18.4" r="1.3" fill="currentColor" stroke="none" />
    </g>
  )
}

// The same arcs, cut by a line: the browser is offline.
function OfflineIcon() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M5.8 11.6a9 9 0 0 1 12.4 0" />
      <path d="M8.6 14.9a5.2 5.2 0 0 1 6.8 0" />
      <circle cx="12" cy="18.4" r="1.3" fill="currentColor" stroke="none" />
      <path d="M4.5 4.5l15 15" />
    </g>
  )
}
