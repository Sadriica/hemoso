import { useCallback, useSyncExternalStore } from 'react'
import type { EntryStore, Outbox, OutboxSnapshot } from '../data/entryStore'

// The outbox as the header shows it: how many entries wait to be sent, and
// when the last one was sent (REQ-28). The store returns one object per
// change, so the header re-renders on add and on markSent.
export function useOutbox(store: EntryStore & Outbox): OutboxSnapshot {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener),
    [store],
  )
  const getSnapshot = useCallback(() => store.getOutboxSnapshot(), [store])
  return useSyncExternalStore(subscribe, getSnapshot)
}
