import { useId } from 'react'
import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import { useOutbox } from '../hooks/useOutbox'
import { useSync } from '../hooks/useSync'
import { strings } from '../strings'
import Notice from './Notice'

// What the header says about the outbox (REQ-28): what waits, when the last
// entry went, whether the browser is online, and the button that sends now.
// Every state is written in words; no colour carries a meaning of its own.
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
  const reasonId = useId()
  const notAccepted = outbox.conflictCount + outbox.rejectedCount

  return (
    <>
      <div className="person-picker">
        <p className="synthetic-notice">
          {outbox.pendingCount === 0
            ? strings.sync.nothingWaiting
            : strings.sync.waiting(outbox.pendingCount)}
        </p>
        <p className="synthetic-notice">
          {outbox.lastSent === null
            ? strings.sync.notSentYet
            : strings.sync.lastSent(
                outbox.lastSent.missionDay,
                outbox.lastSent.time,
              )}
        </p>
        <p className="synthetic-notice">
          {online ? strings.sync.online : strings.sync.offline}
        </p>
        {/* A disabled button cannot be focused, so the reason is linked to it
            as its description and stays visible next to it. */}
        <button
          className="button button--secondary"
          type="button"
          onClick={sendNow}
          disabled={!configured}
          aria-describedby={configured ? undefined : reasonId}
        >
          {strings.sync.sendNow}
        </button>
        {!configured && (
          <p className="synthetic-notice" id={reasonId}>
            {strings.sync.noServer}
          </p>
        )}
      </div>
      {notAccepted > 0 && (
        <Notice tone="warning">{strings.sync.notAccepted(notAccepted)}</Notice>
      )}
    </>
  )
}
