import { useEffect } from 'react'
import type { EntryStore } from '../data/entryStore'
import type { HistoryClient } from '../data/historyClient'
import type { Entry } from '../domain/types'

// The history the server keeps for the chosen person (REQ-27): every indicator
// at once, merged into the store the screens already follow, so a second device
// shows the readings it never made. Nothing happens without a server, without a
// person, or when a request fails: the screens then show what this device has,
// and no error is shown for a history the demo can live without.
export function useHistorySync(
  client: HistoryClient,
  store: EntryStore,
  personId: string | null,
  indicatorIds: string[],
): void {
  // One string: an array is a new value on every render, and the effect only
  // has to follow the ids themselves.
  const indicatorKey = indicatorIds.join('\u0000')

  useEffect(() => {
    if (personId === null || !client.isConfigured()) return
    const ids = indicatorKey === '' ? [] : indicatorKey.split('\u0000')
    let live = true
    // Every indicator at once: one slow answer does not hold the rest, and the
    // store takes the whole history in one change, so the screens update once.
    Promise.all(
      ids.map((indicatorId) =>
        client.fetchHistory({ personId, indicatorId }).catch(() => null),
      ),
    )
      .then((answers) => {
        if (!live) return
        const remote: Entry[] = []
        for (const answer of answers) {
          if (answer !== null) remote.push(...answer)
        }
        store.mergeRemote(remote)
      })
      .catch(() => {
        // A client that throws where the contract says null is still no
        // history for this person.
      })
    return () => {
      live = false
    }
  }, [client, store, personId, indicatorKey])
}
