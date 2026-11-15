import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHistorySync } from './useHistorySync'
import { LocalEntryStore } from '../data/entryStore'
import type { HistoryClient } from '../data/historyClient'
import type { Entry } from '../domain/types'

// One row as the history route returns it, already mapped by historyClient.
function remoteEntry(indicatorId: string, missionDay = 3): Entry {
  return {
    id: `server:demo_astronaut_1:${indicatorId}:${missionDay}:08:00`,
    personId: 'demo_astronaut_1',
    indicatorId,
    value: 72,
    unit: 'bpm',
    missionDay,
    time: '08:00',
    context: 'rest',
  }
}

// A client without a server, with one answer per indicator and a record of the
// indicators it was asked about. An indicator named in `broken` fails the way a
// dropped connection does.
function fakeHistory(
  rows: Record<string, Entry[]>,
  broken: string[] = [],
): { asked: string[]; client: HistoryClient } {
  const asked: string[] = []
  return {
    asked,
    client: {
      isConfigured: () => true,
      fetchHistory: ({ indicatorId }) => {
        asked.push(indicatorId)
        if (broken.includes(indicatorId)) {
          return Promise.reject(new Error('offline'))
        }
        return Promise.resolve(rows[indicatorId] ?? [])
      },
    },
  }
}

describe('useHistorySync', () => {
  it('reads every indicator of the person and merges it in one change', async () => {
    const store = new LocalEntryStore({ storage: null })
    let changes = 0
    store.subscribe(() => {
      changes += 1
    })
    const { client, asked } = fakeHistory({
      hr_bpm: [remoteEntry('hr_bpm')],
      spo2_pct: [remoteEntry('spo2_pct')],
    })

    renderHook(() =>
      useHistorySync(client, store, 'demo_astronaut_1', [
        'hr_bpm',
        'spo2_pct',
      ]),
    )

    await waitFor(() => expect(store.list()).toHaveLength(2))
    expect(asked.sort()).toEqual(['hr_bpm', 'spo2_pct'])
    expect(store.pending()).toEqual([])
    expect(changes).toBe(1)
  })

  it('asks nothing without a person', async () => {
    const store = new LocalEntryStore({ storage: null })
    const { client, asked } = fakeHistory({ hr_bpm: [remoteEntry('hr_bpm')] })

    renderHook(() => useHistorySync(client, store, null, ['hr_bpm']))

    expect(asked).toEqual([])
    expect(store.list()).toEqual([])
  })

  it('keeps the other indicators when one request fails', async () => {
    const store = new LocalEntryStore({ storage: null })
    const { client } = fakeHistory(
      { hr_bpm: [remoteEntry('hr_bpm')], spo2_pct: [remoteEntry('spo2_pct')] },
      ['hr_bpm'],
    )

    renderHook(() =>
      useHistorySync(client, store, 'demo_astronaut_1', [
        'hr_bpm',
        'spo2_pct',
      ]),
    )

    await waitFor(() => expect(store.list()).toHaveLength(1))
    expect(store.list()[0].indicatorId).toBe('spo2_pct')
  })

  it('merges nothing when no answer follows the contract', async () => {
    const store = new LocalEntryStore({ storage: null })
    const before = store.getSnapshot()
    let answer!: (rows: Entry[] | null) => void
    const client: HistoryClient = {
      isConfigured: () => true,
      fetchHistory: () =>
        new Promise((resolve) => {
          answer = resolve
        }),
    }

    renderHook(() =>
      useHistorySync(client, store, 'demo_astronaut_1', ['hr_bpm']),
    )
    await act(async () => answer(null))

    expect(store.list()).toEqual([])
    expect(store.getSnapshot()).toBe(before)
  })
})
