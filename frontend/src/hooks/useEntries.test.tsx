import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'
import { useEntries } from './useEntries'

function List({ store }: { store: LocalEntryStore }) {
  const entries = useEntries(store)
  return (
    <ul>
      {entries.map((item) => (
        <li key={item.id}>{`${item.indicatorId} ${item.value} ${item.unit}`}</li>
      ))}
    </ul>
  )
}

function entry(id: string, value: number): Entry {
  return {
    id,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay: 1,
    time: '08:00',
  }
}

describe('useEntries', () => {
  it('renders the entries of the store', () => {
    const store = new LocalEntryStore({ storage: null, seedEntries: [entry('a', 1)] })
    render(<List store={store} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('example_indicator 1 example_unit')).toBeInTheDocument()
  })

  it('renders an entry added after the first render', () => {
    const store = new LocalEntryStore({ storage: null, seedEntries: [entry('a', 1)] })
    render(<List store={store} />)
    act(() => {
      store.add({
        personId: 'demo_astronaut_1',
        indicatorId: 'example_indicator',
        value: 2,
        unit: 'example_unit',
        missionDay: 2,
        time: '09:15',
      })
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('example_indicator 2 example_unit')).toBeInTheDocument()
  })
})
