import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Entry from './Entry'
import { LocalEntryStore } from '../data/entryStore'
import { isClockTime } from '../domain/clock'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import { strings } from '../strings'

// The indicators of config/data/indicators.csv that these cases need, with the
// same ids and units Phys writes in the file.
const heartRate: Indicator = {
  id: 'hr_bpm',
  name: 'Heart rate',
  unit: 'bpm',
  direction: 'both',
  measuredOnBoard: 'Bio-Monitor smart shirt or ECG',
  hazards: ['gravity_fields'],
  minSpread: 4,
  sources: ['Assumption'],
}

const systolic: Indicator = {
  id: 'bp_sys_mmhg',
  name: 'Systolic blood pressure',
  unit: 'mmHg',
  direction: 'both',
  measuredOnBoard: 'Bio-Monitor smart shirt or arm cuff',
  hazards: ['gravity_fields'],
  minSpread: 5,
  sources: ['Assumption'],
}

const diastolic: Indicator = {
  id: 'bp_dia_mmhg',
  name: 'Diastolic blood pressure',
  unit: 'mmHg',
  direction: 'both',
  measuredOnBoard: 'Bio-Monitor smart shirt or arm cuff',
  hazards: ['gravity_fields'],
  minSpread: 4,
  sources: ['Assumption'],
}

const mood: Indicator = {
  id: 'mood_1_5',
  name: 'Mood',
  unit: '1 to 5',
  direction: 'lower',
  measuredOnBoard: 'Questionnaire before sleep and journaling',
  hazards: ['isolation_and_confinement'],
  minSpread: 0.5,
  sources: ['Assumption'],
}

function entry(
  indicatorId: string,
  missionDay: number,
  value: number,
  unit = 'bpm',
): EntryRecord {
  return {
    id: `demo_astronaut_1:${indicatorId}:${missionDay}:13:30`,
    personId: 'demo_astronaut_1',
    indicatorId,
    value,
    unit,
    missionDay,
    time: '13:30',
    context: 'rest',
  }
}

const seedEntries = [entry('hr_bpm', 1, 56), entry('hr_bpm', 10, 58)]

function renderEntry(
  indicators: Indicator[] = [heartRate],
  options: { serverConfigured?: boolean } = {},
): LocalEntryStore {
  const store = new LocalEntryStore({ seedEntries })
  render(
    <Entry
      store={store}
      personId="demo_astronaut_1"
      indicators={indicators}
      entries={seedEntries}
      serverConfigured={options.serverConfigured}
    />,
  )
  return store
}

function typeInto(label: string, text: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
}

async function submit() {
  const save = screen.getByRole('button', { name: strings.entry.save })
  save.focus()
  await userEvent.setup().keyboard('{Enter}')
}

beforeEach(() => {
  localStorage.clear()
})

describe('Entry', () => {
  it('gives every indicator its own row, labelled, with the unit inside', () => {
    renderEntry([heartRate, systolic, diastolic, mood])

    // One row per indicator, in the order of the file; the two blood pressures
    // share a row and keep the order of their ids.
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)

    const heart = screen.getByLabelText('Heart rate')
    expect(heart).toHaveAttribute('type', 'number')
    expect(heart).toHaveAccessibleDescription('bpm last 58 bpm')
    expect(within(rows[0]).getByText('bpm')).toHaveClass('reading__unit')

    const pressure = screen.getByRole('group', { name: 'Blood pressure' })
    expect(within(pressure).getByLabelText('Systolic')).toHaveAttribute(
      'type',
      'number',
    )
    expect(within(pressure).getByLabelText('Diastolic')).toBeInTheDocument()
    expect(within(pressure).getByText('mmHg')).toBeInTheDocument()

    // Mood is the scale: five choices in the words of the content.
    const scale = screen.getByRole('group', { name: 'Mood' })
    expect(
      within(scale)
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(['1', '2', '3', '4', '5'])
    expect(
      within(scale).getByRole('radio', { name: '5 Very good' }),
    ).toBeInTheDocument()
    // The scale is choices, never a number field.
    expect(screen.queryByRole('spinbutton', { name: 'Mood' })).toBeNull()
  })

  it('draws one icon per row', () => {
    renderEntry([heartRate, systolic, diastolic, mood])
    const icons = document.querySelectorAll('[data-icon]')
    // Heart rate, the blood pressure pair (one gauge), mood.
    expect(icons).toHaveLength(3)
  })

  it('starts on the person’s day and time, with the context of that clock', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(7)
    vi.spyOn(Date.prototype, 'getMinutes').mockReturnValue(30)
    renderEntry()

    expect(screen.getByLabelText(strings.entry.missionDay)).toHaveValue(10)
    const time = screen.getByLabelText(strings.entry.time)
    expect(isClockTime((time as HTMLInputElement).value)).toBe(true)
    const context = screen.getByRole('group', { name: strings.entry.context })
    expect(
      within(context).getByRole('radio', { name: 'On waking' }),
    ).toBeChecked()
    vi.restoreAllMocks()
  })

  it('offers the four contexts as one segmented control', () => {
    renderEntry()
    const context = screen.getByRole('group', { name: strings.entry.context })
    expect(
      within(context)
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(['rest', 'after_exercise', 'on_waking', 'before_sleep'])
    expect(
      within(context).getByRole('radio', { name: 'Before sleep' }),
    ).toBeInTheDocument()
  })

  it('saves every filled row as its own entry with the shared day and time', async () => {
    const store = renderEntry([heartRate, systolic, diastolic])

    typeInto('Heart rate', '57')
    typeInto('Systolic', '120')
    typeInto('Diastolic', '80')
    fireEvent.change(screen.getByLabelText(strings.entry.time), {
      target: { value: '15:44' },
    })
    await userEvent
      .setup()
      .click(screen.getByRole('radio', { name: 'After exercise' }))
    await submit()

    const saved = store.list().slice(seedEntries.length)
    expect(saved).toHaveLength(3)
    expect(saved).toMatchObject([
      {
        personId: 'demo_astronaut_1',
        indicatorId: 'hr_bpm',
        value: 57,
        unit: 'bpm',
        missionDay: 10,
        time: '15:44',
        context: 'after_exercise',
      },
      {
        indicatorId: 'bp_sys_mmhg',
        value: 120,
        unit: 'mmHg',
        missionDay: 10,
        time: '15:44',
        context: 'after_exercise',
      },
      {
        indicatorId: 'bp_dia_mmhg',
        value: 80,
        unit: 'mmHg',
        missionDay: 10,
        time: '15:44',
        context: 'after_exercise',
      },
    ])
    expect(store.pending()).toEqual(saved)
  })

  it('skips the rows left empty and names what it saved', async () => {
    const store = renderEntry([heartRate, systolic, diastolic])

    typeInto('Heart rate', '57')
    await submit()

    expect(store.list()).toHaveLength(seedEntries.length + 1)
    expect(store.list()[seedEntries.length]).toMatchObject({
      indicatorId: 'hr_bpm',
      value: 57,
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      strings.entry.savedList('Heart rate 57 bpm'),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      strings.entry.savedOnDevice,
    )
    // The day and the time stay, the reading goes.
    expect((screen.getByLabelText('Heart rate') as HTMLInputElement).value).toBe(
      '',
    )
    expect(screen.getByLabelText(strings.entry.missionDay)).toHaveValue(10)
  })

  it('saves nothing and points at the row that is wrong', async () => {
    const store = renderEntry([heartRate, systolic, diastolic])

    typeInto('Heart rate', '57')
    typeInto('Systolic', '120')
    await submit()

    expect(store.list()).toHaveLength(seedEntries.length)
    expect(screen.getByText(strings.entry.errors.valueRequired)).toBeInTheDocument()
    // The error belongs to the pressure row, not to the heart rate one.
    expect(screen.getByLabelText('Heart rate')).not.toHaveAttribute(
      'aria-invalid',
    )
    expect(screen.getByLabelText('Diastolic')).toHaveFocus()
  })

  it('asks for the second blood pressure when the first one is filled', async () => {
    const store = renderEntry([systolic, diastolic])

    typeInto('Systolic', '120')
    await submit()

    const pressure = screen.getByRole('group', { name: 'Blood pressure' })
    expect(pressure).toHaveAccessibleDescription(
      `mmHg ${strings.entry.errors.valueRequired}`,
    )
    // The empty half of the pair is the one the person still has to write.
    expect(within(pressure).getByLabelText('Diastolic')).toHaveFocus()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('keeps the day and time checks, next to their field', async () => {
    const store = renderEntry()

    typeInto('Heart rate', '57')
    fireEvent.change(screen.getByLabelText(strings.entry.missionDay), {
      target: { value: '0' },
    })
    fireEvent.change(screen.getByLabelText(strings.entry.time), {
      target: { value: '' },
    })
    await submit()

    const day = screen.getByLabelText(strings.entry.missionDay)
    expect(day).toHaveAccessibleDescription(strings.entry.errors.missionDay)
    expect(day).toHaveFocus()
    expect(
      screen.getByText(strings.entry.errors.time),
    ).toBeInTheDocument()
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('asks for a whole day before it saves, and for nothing else', async () => {
    const store = renderEntry()

    typeInto('Heart rate', '57')
    fireEvent.change(screen.getByLabelText(strings.entry.missionDay), {
      target: { value: '2.5' },
    })
    await submit()

    expect(
      screen.getByLabelText(strings.entry.missionDay),
    ).toHaveAccessibleDescription(strings.entry.errors.missionDay)
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('says when there is nothing to save instead of saving an empty report', async () => {
    const store = renderEntry()
    await submit()

    expect(screen.getByRole('status')).toHaveTextContent(
      strings.entry.noReading,
    )
    expect(store.list()).toHaveLength(seedEntries.length)
  })

  it('promises the send only when a server is set up', async () => {
    const store = renderEntry([heartRate], { serverConfigured: true })

    typeInto('Heart rate', '57')
    await submit()

    expect(screen.getByRole('status')).toHaveTextContent(strings.entry.saved)
    expect(screen.getByRole('status')).not.toHaveTextContent(
      strings.entry.savedOnDevice,
    )
    expect(store.pending()).toHaveLength(1)
  })

  it('answers the scale with the arrow keys and saves it as 1 to 5', async () => {
    const user = userEvent.setup()
    const store = renderEntry([mood])

    const scale = screen.getByRole('group', { name: 'Mood' })
    const first = within(scale).getByRole('radio', { name: '1 Very low' })
    first.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(within(scale).getByRole('radio', { name: '3 Neutral' })).toBeChecked()

    await submit()

    expect(store.list()[seedEntries.length]).toMatchObject({
      indicatorId: 'mood_1_5',
      value: 3,
      unit: '1 to 5',
    })
    expect(
      within(scale).getByRole('radio', { name: '3 Neutral' }),
    ).not.toBeChecked()
  })

  it('says when there are no indicators to enter', () => {
    renderEntry([])
    expect(screen.getByText(strings.entry.noIndicators)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: strings.entry.save }),
    ).toBeNull()
  })
})
