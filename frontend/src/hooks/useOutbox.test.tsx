import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'
import { useOutbox } from './useOutbox'

function Status({ store }: { store: LocalEntryStore }) {
  const outbox = useOutbox(store)
  const lastSent =
    outbox.lastSent === null
      ? 'never'
      : `${outbox.lastSent.missionDay} ${outbox.lastSent.time}`
  return <p>{`${outbox.pendingCount} waiting, last sent ${lastSent}`}</p>
}

function newEntry(): Omit<Entry, 'id'> {
  return {
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value: 2,
    unit: 'example_unit',
    missionDay: 2,
    time: '09:15',
  }
}

describe('useOutbox', () => {
  it('renders the waiting count and follows add and markSent', () => {
    const store = new LocalEntryStore({ storage: null })
    render(<Status store={store} />)
    expect(screen.getByText('0 waiting, last sent never')).toBeInTheDocument()

    let addedId = ''
    act(() => {
      addedId = store.add(newEntry()).id
    })
    expect(screen.getByText('1 waiting, last sent never')).toBeInTheDocument()

    const id = addedId
    act(() => {
      store.markSent([id], { missionDay: 2, time: '09:20' })
    })
    expect(screen.getByText('0 waiting, last sent 2 09:20')).toBeInTheDocument()
  })
})
