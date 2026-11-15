import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import { useOutbox } from '../hooks/useOutbox'
import { useSync } from '../hooks/useSync'
import { strings } from '../strings'

// The sending state of the outbox (REQ-28) as one line of quiet text: a small
// dot, the connection, then the one thing that matters about it, which is the
// readings waiting or the last send that went wrong. "Send now" is a text link
// that appears only while something waits and a server is set up; a button
// that can never work would only add noise. The dot repeats the words, so the
// state is never colour alone (REQ-15), and the title is the whole sentence,
// which is what a narrow screen keeps after it drops the word "waiting".
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
        <span className="sync-chip__dot" aria-hidden="true" />
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
