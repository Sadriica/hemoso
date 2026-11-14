import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import Entry from './Entry'
import { LocalEntryStore } from '../data/entryStore'
import { isClockTime } from '../domain/clock'
import type { Entry as EntryRecord, Indicator } from '../domain/types'

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement'],
  sources: ['Assumption'],
}

function entry(missionDay: number, value: number): EntryRecord {
  return {
    id: `demo_astronaut_1:example_indicator:${missionDay}:13:30`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay,
    time: '13:30',
  }
}

const seedEntries = [entry(1, 1), entry(10, 10)]

function renderEntry(indicators: Indicator[] = [indicator]): LocalEntryStore {
  const store = new LocalEntryStore({ seedEntries })
  render(
    <Entry
      store={store}
      personId="demo_astronaut_1"
      indicators={indicators}
      entries={seedEntries}
    />,
  )
  return store
}

function typeValue(text: string) {
  fireEvent.change(screen.getByLabelText('Value (example_unit)'), {
    target: { value: text },
  })
}

async function submit() {
  const save = screen.getByRole('button', { name: 'Save entry' })
  save.focus()
  await userEvent.setup().keyboard('{Enter}')
}

beforeEach(() => {
  localStorage.clear()
})

describe('Entry', () => {
  it('labels every field and shows the unit in the label and next to the field', () => {
    renderEntry()
    expect(screen.getByLabelText('Indicator')).toHaveValue('example_indicator')
    expect(
      screen.getByRole('option', { name: 'Example indicator' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Value (example_unit)')).toBeInTheDocument()
    expect(screen.getByLabelText('Mission day')).toHaveValue(10)
    const time = screen.getByLabelText('Time')
    expect(isClockTime((time as HTMLInputElement).value)).toBe(true)

    const unit = screen.getByText('example_unit')
    expect(unit).toHaveClass('field__unit')
    // The label already carries the unit, so the copy next to the field is
    // decoration for sighted users only.
    expect(unit).toHaveAttribute('aria-hidden', 'true')
  })

  it('asks for a value and moves focus to the value field', async () => {
    renderEntry()
    await submit()

    const value = screen.getByLabelText('Value (example_unit)')
    expect(value).toHaveAccessibleDescription('Enter a value.')
    expect(value).toHaveFocus()
    expect(screen.getByText('Enter a value.')).toBeInTheDocument()
  })

  it('asks for a value without saving anything', async () => {
    const store = renderEntry()
    await submit()

    const value = screen.getByLabelText('Value (example_unit)')
    expect(value).toHaveAccessibleDescription('Enter a value.')
    expect(value).toHaveFocus()
    expect(screen.getByText('Enter a value.')).toBeInTheDocument()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('asks for a whole mission day and moves focus to that field', async () => {
    const store = renderEntry()
    typeValue('42')
    const day = screen.getByLabelText('Mission day')
    fireEvent.change(day, { target: { value: '0' } })
    await submit()

    expect(day).toHaveAccessibleDescription(
      'Enter a whole mission day, 1 or more.',
    )
    expect(day).toHaveFocus()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('asks for a time as HH:MM and moves focus to that field', async () => {
    const store = renderEntry()
    typeValue('42')
    const time = screen.getByLabelText('Time')
    fireEvent.change(time, { target: { value: '' } })
    await submit()

    expect(time).toHaveAccessibleDescription('Enter a time as HH:MM.')
    expect(time).toHaveFocus()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('saves an entry with the keyboard only and clears only the value', async () => {
    const user = userEvent.setup()
    const store = renderEntry()

    await user.tab()
    expect(screen.getByLabelText('Indicator')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Value (example_unit)')).toHaveFocus()
    await user.keyboard('42')
    await user.tab()
    expect(screen.getByLabelText('Mission day')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Time')).toHaveFocus()
    await user.tab()

    const save = screen.getByRole('button', { name: 'Save entry' })
    expect(save).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved. Waiting to be sent.',
    )
    const saved = store.list()
    expect(saved).toHaveLength(seedEntries.length + 1)
    const last = saved[saved.length - 1]
    expect(last).toMatchObject({
      personId: 'demo_astronaut_1',
      indicatorId: 'example_indicator',
      value: 42,
      unit: 'example_unit',
      missionDay: 10,
    })
    expect(isClockTime(last.time)).toBe(true)
    expect(store.pending()).toEqual([last])

    expect(
      (screen.getByLabelText('Value (example_unit)') as HTMLInputElement).value,
    ).toBe('')
    expect(screen.getByLabelText('Mission day')).toHaveValue(10)
  })

  it('says when there are no indicators to enter', () => {
    renderEntry([])
    expect(screen.getByText('No indicators are set up yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save entry' })).toBeNull()
  })
})
