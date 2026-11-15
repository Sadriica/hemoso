import { useCallback, useEffect, useRef, useState } from 'react'
import { missionNow } from '../domain/clock'
import type { EntryStore, Outbox } from '../data/entryStore'
import { sendPending, type SyncClient } from '../data/sync'

export interface SyncState {
  online: boolean
  // Starts a round and returns at once: the screen never waits for the server.
  sendNow: () => void
}

// Runs the outbox: once when the app loads, on every `online` event, when a
// new reading is saved on line, and on the "Send now" button (REQ-28). One
// round at a time: a second request while one is running is dropped, and the
// next event or click sends what is left.
export function useSync(
  store: EntryStore & Outbox,
  client: SyncClient,
): SyncState {
  const [online, setOnline] = useState(() => isOnline())
  const running = useRef(false)

  // Set when a reading is saved while a round runs: the round took its list
  // of readings when it started, so the new one needs a round of its own.
  const again = useRef(false)

  const sendNow = useCallback(() => {
    if (!client.isConfigured()) return
    if (running.current) return
    running.current = true
    const round = (): Promise<unknown> =>
      sendPending(store, client, missionNow(store.list())).then(() => {
        if (!again.current) return
        again.current = false
        return round()
      })
    void round().finally(() => {
      running.current = false
      again.current = false
    })
  }, [store, client])

  useEffect(() => {
    // A browser that comes back on line is the usual way to reach the server,
    // so that event also starts a round.
    function onOnline() {
      setOnline(true)
      sendNow()
    }
    function onOffline() {
      setOnline(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [sendNow])

  // The load of the app: whatever waited in the outbox from the last session.
  useEffect(() => {
    sendNow()
  }, [sendNow])

  // A reading saved while the browser is on line goes out at once: without
  // this it waited for a reload, an `online` event or the "Send now" link,
  // and the bar said "1 waiting" with the server reachable. Only a growing
  // count starts a round, so a round that fails does not start another one.
  useEffect(() => {
    let known = store.getOutboxSnapshot().pendingCount
    return store.subscribe(() => {
      const count = store.getOutboxSnapshot().pendingCount
      const grew = count > known
      known = count
      if (!grew || !isOnline()) return
      // A report saves several readings in a row: the first starts the round
      // and the others ask it to go once more when it ends.
      if (running.current) again.current = true
      else sendNow()
    })
  }, [store, sendNow])

  return { online, sendNow }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
