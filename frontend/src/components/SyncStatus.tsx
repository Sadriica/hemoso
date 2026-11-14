import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import { useOutbox } from '../hooks/useOutbox'
import { useSync } from '../hooks/useSync'
import { strings } from '../strings'
import Notice from './Notice'

// What the header says about the outbox (REQ-28): what waits, when the last
// entry went, whether the browser is online, and the button that sends now.
// Each fact is its own item, so the row wraps on a narrow screen instead of
// pushing the page sideways (REQ-32). The connection state is an icon and a
// word, never a colour on its own (REQ-15).
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
  const notAccepted = outbox.conflictCount + outbox.rejectedCount

  return (
    <>
      <div className="sync-status">
        <p className="sync-status__item">
          {outbox.pendingCount === 0
            ? strings.sync.nothingWaiting
            : strings.sync.waiting(outbox.pendingCount)}
        </p>
        <p className="sync-status__item">
          {outbox.lastSent === null
            ? strings.sync.notSentYet
            : strings.sync.lastSent(
                outbox.lastSent.missionDay,
                outbox.lastSent.time,
              )}
        </p>
        <p
          className={`sync-status__state sync-status__state--${
            online ? 'online' : 'offline'
          }`}
        >
          <span className="sync-status__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
              {online ? <OnlineIcon /> : <OfflineIcon />}
            </svg>
          </span>
          {online ? strings.sync.online : strings.sync.offline}
        </p>
        {/* No server means no send: the reason is the whole item. A button
            that can never work would only add noise. */}
        {configured ? (
          <button
            className="button button--secondary"
            type="button"
            onClick={sendNow}
          >
            {strings.sync.sendNow}
          </button>
        ) : (
          <p className="sync-status__item">{strings.sync.noServer}</p>
        )}
      </div>
      {notAccepted > 0 && (
        <Notice tone="warning">{strings.sync.notAccepted(notAccepted)}</Notice>
      )}
    </>
  )
}

// Two signal arcs and a dot: the browser is online.
function OnlineIcon() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5.8 11.6a9 9 0 0 1 12.4 0" />
      <path d="M8.6 14.9a5.2 5.2 0 0 1 6.8 0" />
      <circle cx="12" cy="18.4" r="1.3" fill="currentColor" stroke="none" />
    </g>
  )
}

// The same arcs, cut by a line: the browser is offline.
function OfflineIcon() {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5.8 11.6a9 9 0 0 1 12.4 0" />
      <path d="M8.6 14.9a5.2 5.2 0 0 1 6.8 0" />
      <circle cx="12" cy="18.4" r="1.3" fill="currentColor" stroke="none" />
      <path d="M4.5 4.5l15 15" />
    </g>
  )
}
