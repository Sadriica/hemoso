import { useCallback, useEffect, useRef, useState } from 'react'
import { missionNow } from '../domain/clock'
import type { EntryStore, Outbox } from '../data/entryStore'
import { sendPending, type SyncClient } from '../data/sync'

export interface SyncState {
  online: boolean
  // Starts a round and returns at once: the screen never waits for the server.
  sendNow: () => void
}

// Runs the outbox: once when the app loads, on every `online` event and on the
// "Send now" button (REQ-28). One round at a time: a second request while one
// is running is dropped, and the next event or click sends what is left.
export function useSync(
  store: EntryStore & Outbox,
  client: SyncClient,
): SyncState {
  const [online, setOnline] = useState(() => isOnline())
  const running = useRef(false)

  const sendNow = useCallback(() => {
    if (running.current || !client.isConfigured()) return
    running.current = true
    void sendPending(store, client, missionNow(store.list())).finally(() => {
      running.current = false
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

  return { online, sendNow }
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
