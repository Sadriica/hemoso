import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIndicatorState, useIndicatorStates } from './useIndicatorState'
import type { StateClient, StateQuery } from '../data/stateClient'
import type { IndicatorState } from '../domain/state'

// The answer for a reading: the reading's value doubles as the window count, so
// the answer of one screen is told apart from the answer of another.
function answerOf(value: number): IndicatorState {
  return { state: 'in_range', median: 70, spread: 4, n: value, attention: null }
}

// A client without a server: it answers at once and keeps every question it
// was asked, so a test can see the reading the screens sent with it.
function fakeClient(): { client: StateClient; asked: StateQuery[] } {
  const asked: StateQuery[] = []
  return {
    asked,
    client: {
      isConfigured: () => true,
      fetchState: (query) => {
        asked.push(query)
        return Promise.resolve(answerOf(query.value))
      },
    },
  }
}

// Named as hooks, so the React rules see a hook calling a hook.
function useOne(
  client: StateClient,
  query: StateQuery,
): IndicatorState | null {
  return useIndicatorState(client, query)
}

function useMany(
  client: StateClient,
  queries: Record<string, StateQuery | null>,
): Record<string, IndicatorState> {
  return useIndicatorStates(client, queries)
}

const query: StateQuery = {
  personId: 'demo_astronaut_1',
  indicatorId: 'hr_bpm',
  value: 72,
  context: 'rest',
  missionDay: 3,
  time: '08:00',
}

describe('useIndicatorState', () => {
  it('asks with the day and the time of the reading', async () => {
    const { client, asked } = fakeClient()
    const { result } = renderHook(() => useOne(client, query))

    await waitFor(() => expect(result.current).toEqual(answerOf(72)))
    expect(asked).toEqual([query])
  })

  it('asks again for the same value at another time', async () => {
    const { client, asked } = fakeClient()
    const { result, rerender } = renderHook(
      ({ reading }: { reading: StateQuery }) => useOne(client, reading),
      { initialProps: { reading: query } },
    )
    await waitFor(() => expect(result.current).toEqual(answerOf(72)))

    rerender({ reading: { ...query, missionDay: 4, time: '09:00' } })

    await waitFor(() => expect(asked).toHaveLength(2))
    expect(asked[1]).toEqual({ ...query, missionDay: 4, time: '09:00' })
    // A new reading is a new question: its answer is asked again, not reused.
    await waitFor(() => expect(result.current).toEqual(answerOf(72)))
  })

  it('asks again for the same value on another day', async () => {
    const { client, asked } = fakeClient()
    renderHook(
      ({ reading }: { reading: StateQuery }) => useOne(client, reading),
      { initialProps: { reading: query } },
    )
    await waitFor(() => expect(asked).toHaveLength(1))

    renderHook(() => useOne(client, { ...query, missionDay: 5 }))

    await waitFor(() => expect(asked).toHaveLength(2))
    expect(asked[1]).toEqual({ ...query, missionDay: 5 })
  })
})

describe('useIndicatorStates', () => {
  it('asks every reading with its own day and time', async () => {
    const { client, asked } = fakeClient()
    const queries: Record<string, StateQuery> = {
      hr_bpm: query,
      spo2_pct: {
        ...query,
        indicatorId: 'spo2_pct',
        value: 97,
        missionDay: 4,
        time: '21:00',
      },
    }
    const { result } = renderHook(() => useMany(client, queries))

    await waitFor(() =>
      expect(result.current).toEqual({
        hr_bpm: answerOf(72),
        spo2_pct: answerOf(97),
      }),
    )
    expect(asked).toHaveLength(2)
    expect(asked).toEqual(
      expect.arrayContaining([queries.hr_bpm, queries.spo2_pct]),
    )
  })
})
