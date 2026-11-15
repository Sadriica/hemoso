import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import Entry from './Entry'
import { LocalEntryStore } from '../data/entryStore'
import { isClockTime } from '../domain/clock'
import type { Entry as EntryRecord, Indicator } from '../domain/types'

// The two indicators Phys writes on a 1 to 5 scale, and one measured reading,
// with the ids and units of config/data/indicators.csv.
const sleepQuality: Indicator = {
  id: 'sleep_quality_1_5',
  name: 'Sleep quality',
  unit: '1 to 5',
  direction: 'lower',
  measuredOnBoard: 'Questionnaire after waking',
  hazards: ['isolation_and_confinement'],
  sources: ['Assumption'],
}

const mood: Indicator = {
  id: 'mood_1_5',
  name: 'Mood',
  unit: '1 to 5',
  direction: 'lower',
  measuredOnBoard: 'Questionnaire before sleep and journaling',
  hazards: ['isolation_and_confinement'],
  sources: ['Assumption'],
}

const heartRate: Indicator = {
  id: 'hr_bpm',
  name: 'Heart rate',
  unit: 'bpm',
  direction: 'both',
  measuredOnBoard: 'Bio-Monitor smart shirt or ECG',
  hazards: ['gravity_fields'],
  sources: ['Assumption'],
}

function entry(missionDay: number, value: number): EntryRecord {
  return {
    id: `demo_astronaut_1:hr_bpm:${missionDay}:13:30`,
    personId: 'demo_astronaut_1',
    indicatorId: 'hr_bpm',
    value,
    unit: 'bpm',
    missionDay,
    time: '13:30',
  }
}

const seedEntries = [entry(1, 56), entry(10, 58)]

function renderEntry(indicators: Indicator[] = [heartRate]): LocalEntryStore {
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
  fireEvent.change(screen.getByLabelText('Value'), { target: { value: text } })
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
  it('labels every field and shows the unit once, as the suffix', () => {
    renderEntry()
    expect(screen.getByLabelText('Indicator')).toHaveValue('hr_bpm')
    expect(
      screen.getByRole('option', { name: 'Heart rate' }),
    ).toBeInTheDocument()

    const value = screen.getByLabelText('Value')
    expect(value).toHaveAttribute('type', 'number')
    expect(value).toHaveAccessibleDescription('bpm')
    expect(screen.queryByText('Value (bpm)')).toBeNull()

    const unit = screen.getByText('bpm')
    expect(unit).toHaveClass('field__unit')
    expect(unit).not.toHaveAttribute('aria-hidden')

    expect(screen.getByLabelText('Mission day')).toHaveValue(10)
    const time = screen.getByLabelText('Time')
    expect(isClockTime((time as HTMLInputElement).value)).toBe(true)
  })

  it('links the value error after the unit and saves nothing', async () => {
    const store = renderEntry()
    await submit()

    const value = screen.getByLabelText('Value')
    expect(value).toHaveAccessibleDescription('bpm Enter a value.')
    expect(value).toHaveFocus()
    expect(screen.getByText('Enter a value.')).toBeInTheDocument()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('asks for a whole mission day and moves focus to that field', async () => {
    const store = renderEntry()
    typeValue('57')
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
    typeValue('57')
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
    expect(screen.getByLabelText('Value')).toHaveFocus()
    await user.keyboard('57')
    await user.tab()
    expect(screen.getByLabelText('Mission day')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Time')).toHaveFocus()
    await user.tab()

    const save = screen.getByRole('button', { name: 'Save entry' })
    expect(save).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved on this device.',
    )
    const saved = store.list()
    expect(saved).toHaveLength(seedEntries.length + 1)
    const last = saved[saved.length - 1]
    expect(last).toMatchObject({
      personId: 'demo_astronaut_1',
      indicatorId: 'hr_bpm',
      value: 57,
      unit: 'bpm',
      missionDay: 10,
    })
    expect(isClockTime(last.time)).toBe(true)
    expect(store.pending()).toEqual([last])

    expect((screen.getByLabelText('Value') as HTMLInputElement).value).toBe('')
    expect(screen.getByLabelText('Mission day')).toHaveValue(10)
  })

  it('promises the send only when a server is set up', async () => {
    const store = new LocalEntryStore({ seedEntries })
    render(
      <Entry
        store={store}
        personId="demo_astronaut_1"
        indicators={[heartRate]}
        serverConfigured
        entries={seedEntries}
      />,
    )

    typeValue('57')
    await submit()

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved. Waiting to be sent.',
    )
    expect(store.pending()).toHaveLength(1)
  })

  it.each([sleepQuality, mood])(
    'shows a 1 to 5 radio group for $name',
    (scaleIndicator) => {
      renderEntry([scaleIndicator])
      expect(
        screen.getByRole('group', { name: 'Value (1 to 5)' }),
      ).toBeInTheDocument()
      expect(
        screen
          .getAllByRole('radio')
          .map((radio) => (radio as HTMLInputElement).value),
      ).toEqual(['1', '2', '3', '4', '5'])
      expect(screen.queryByLabelText('Value')).toBeNull()
    },
  )

  it('keeps the number input for an indicator with a measured unit', () => {
    renderEntry([heartRate])
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'number')
  })

  it('offers nothing outside 1 to 5 for a scale indicator', () => {
    renderEntry([sleepQuality])
    expect(screen.queryByRole('radio', { name: '7' })).toBeNull()
    expect(screen.queryByRole('radio', { name: '-2' })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: 'Value' })).toBeNull()
  })

  it('asks for a choice and moves focus to the first one', async () => {
    const store = renderEntry([sleepQuality])
    await submit()

    expect(
      screen.getByRole('group', { name: 'Value (1 to 5)' }),
    ).toHaveAccessibleDescription('Choose a value from 1 to 5.')
    expect(screen.getByRole('radio', { name: '1' })).toHaveFocus()
    expect(screen.getByText('Choose a value from 1 to 5.')).toBeInTheDocument()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('chooses a scale value with the arrow keys and saves it', async () => {
    const user = userEvent.setup()
    const store = renderEntry([sleepQuality])

    await user.tab()
    expect(screen.getByLabelText('Indicator')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('radio', { name: '1' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '2' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '2' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '3' })).toBeChecked()

    // One tab stop for the group, then the rest of the form.
    await user.tab()
    expect(screen.getByLabelText('Mission day')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Time')).toHaveFocus()
    await user.tab()
    const save = screen.getByRole('button', { name: 'Save entry' })
    expect(save).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved on this device.',
    )
    expect(store.list()[seedEntries.length]).toMatchObject({
      personId: 'demo_astronaut_1',
      indicatorId: 'sleep_quality_1_5',
      value: 3,
      unit: '1 to 5',
      missionDay: 10,
    })
    expect(screen.getByRole('radio', { name: '3' })).not.toBeChecked()
  })

  it('stores the time as 24-hour HH:MM whatever the browser shows', async () => {
    const store = renderEntry()
    typeValue('57')
    const time = screen.getByLabelText('Time')
    fireEvent.change(time, { target: { value: '15:44' } })
    await submit()

    const saved = store.list()
    expect(saved[saved.length - 1]).toMatchObject({
      value: 57,
      time: '15:44',
    })
  })

  it('says when there are no indicators to enter', () => {
    renderEntry([])
    expect(screen.getByText('No indicators are set up yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save entry' })).toBeNull()
  })
})
