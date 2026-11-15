import { useCallback, useSyncExternalStore } from 'react'
import type { EntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'

// The entries in the store, with a re-render whenever one is added or sent
// (REQ-02). The two callbacks depend on the store only, so React keeps a
// single subscription per screen.
export function useEntries(store: EntryStore): Entry[] {
  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener),
    [store],
  )
  const getSnapshot = useCallback(() => store.getSnapshot(), [store])
  return useSyncExternalStore(subscribe, getSnapshot)
}
