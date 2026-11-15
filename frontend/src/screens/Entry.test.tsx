import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
  options: { serverConfigured?: boolean; onNext?: () => void } = {},
): LocalEntryStore {
  const store = new LocalEntryStore({ seedEntries })
  render(
    <Entry
      store={store}
      personId="demo_astronaut_1"
      indicators={indicators}
      entries={seedEntries}
      serverConfigured={options.serverConfigured}
      onNext={options.onNext}
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
    // One label, so a screen reader says the name once.
    expect((heart as HTMLInputElement).labels).toHaveLength(1)
    expect(heart).toHaveAccessibleName('Heart rate')
    expect(heart).toHaveAttribute('inputmode', 'decimal')
    expect(heart).not.toHaveAttribute('type', 'number')
    expect(heart).toHaveAccessibleDescription('bpm last 58 bpm')
    expect(within(rows[0]).getByText('bpm')).toHaveClass('rep-field__unit')

    const pressure = screen.getByRole('group', { name: 'Blood pressure' })
    expect(within(pressure).getByLabelText('Systolic')).toHaveAttribute(
      'inputmode',
      'decimal',
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

  it('starts on the person’s day and time', () => {
    renderEntry()
    expect(screen.getByLabelText(strings.entry.missionDay)).toHaveValue('10')
    const time = screen.getByLabelText(strings.entry.time)
    expect(isClockTime((time as HTMLInputElement).value)).toBe(true)
  })

  // The header's choices open with the "change" button; a row's with its tag.
  const rowButton = (name: string) =>
    screen.getByRole('button', { name: new RegExp(`^${strings.entry.rowContext(name)}`) })
  // The header chip, not a row's "Context for ..." tag.
  const headerName = new RegExp(`^${strings.entry.context}(?! for)`)
  const openHeader = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: headerName }))
    return screen.getByRole('group', { name: strings.entry.context })
  }

  it('says the context once in the header and tags only the rows that differ', () => {
    vi.spyOn(Date.prototype, 'getUTCHours').mockReturnValue(7)
    vi.spyOn(Date.prototype, 'getUTCMinutes').mockReturnValue(30)
    renderEntry([heartRate, mood])
    // The header carries the context of the clock.
    const header = screen.getByRole('button', { name: headerName })
    expect(header).toHaveTextContent(strings.entry.contextLabels.on_waking)
    // Heart rate was taken at rest in the seeded history, so it is tagged.
    expect(rowButton('Heart rate')).toHaveTextContent(strings.entry.contextLabels.rest)
    expect(rowButton('Heart rate')).toHaveAccessibleName(
      `${strings.entry.rowContext('Heart rate')}: ${strings.entry.contextLabels.rest} ${strings.entry.change}`,
    )
    // Mood has no entries, so it follows the header: only the word "Context" and
    // a caret on the row, with the context in its name.
    expect(rowButton('Mood')).toHaveTextContent(strings.entry.context)
    expect(rowButton('Mood')).toHaveAccessibleName(
      `${strings.entry.rowContext('Mood')}: ${strings.entry.contextLabels.on_waking}`,
    )
    expect(screen.getByText(strings.entry.keepOwn(1))).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('has no tag and no line when every row matches the header', () => {
    vi.spyOn(Date.prototype, 'getUTCHours').mockReturnValue(13)
    vi.spyOn(Date.prototype, 'getUTCMinutes').mockReturnValue(0)
    renderEntry([heartRate, mood])
    expect(rowButton('Heart rate')).not.toHaveTextContent(strings.entry.contextLabels.rest)
    expect(rowButton('Mood')).toHaveTextContent(strings.entry.context)
    expect(screen.queryByText(/keeps? (their|its) own context/)).toBeNull()
    vi.restoreAllMocks()
  })

  it('changing the header moves the rows that were not changed by hand', async () => {
    vi.spyOn(Date.prototype, 'getUTCHours').mockReturnValue(13)
    vi.spyOn(Date.prototype, 'getUTCMinutes').mockReturnValue(0)
    const user = userEvent.setup()
    renderEntry([heartRate, mood])
    // Mood is changed by hand to after exercise.
    await user.click(rowButton('Mood'))
    const own = screen.getByRole('group', { name: strings.entry.rowContext('Mood') })
    await user.click(within(own).getByRole('radio', { name: 'After exercise' }))
    expect(rowButton('Mood')).toHaveTextContent(strings.entry.contextLabels.after_exercise)

    const group = await openHeader(user)
    await user.click(within(group).getByRole('radio', { name: strings.entry.contextLabels.before_sleep }))
    // Heart rate followed the header, so it still shows no tag; mood kept its
    // own context and is tagged.
    expect(rowButton('Heart rate')).toHaveTextContent(/^Context.$/)
    expect(rowButton('Mood')).toHaveTextContent(strings.entry.contextLabels.after_exercise)
    expect(screen.getByText(strings.entry.keepOwn(1))).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('saves each row with its own context, the blood pressure pair sharing one', async () => {
    const user = userEvent.setup()
    const store = renderEntry([heartRate, systolic, diastolic, mood])
    await user.click(rowButton('Blood pressure'))
    await user.click(
      within(screen.getByRole('group', { name: strings.entry.rowContext('Blood pressure') })).getByRole(
        'radio',
        { name: 'After exercise' },
      ),
    )
    await user.click(rowButton('Mood'))
    await user.click(
      within(screen.getByRole('group', { name: strings.entry.rowContext('Mood') })).getByRole('radio', {
        name: strings.entry.contextLabels.before_sleep,
      }),
    )
    typeInto('Heart rate', '60')
    typeInto('Systolic', '118')
    typeInto('Diastolic', '76')
    await user.click(within(screen.getByRole('group', { name: 'Mood' })).getByRole('radio', { name: '4 Good' }))
    await submit()
    const saved = store.list().slice(seedEntries.length)
    const contextOf = (id: string) => saved.find((e) => e.indicatorId === id)?.context
    expect(contextOf('hr_bpm')).toBe('rest')
    expect(contextOf('bp_sys_mmhg')).toBe('after_exercise')
    expect(contextOf('bp_dia_mmhg')).toBe('after_exercise')
    expect(contextOf('mood_1_5')).toBe('before_sleep')
  })

  it('offers the four contexts as one segmented control', async () => {
    renderEntry()
    const context = await openHeader(userEvent.setup())
    expect(
      within(context)
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).value),
    ).toEqual(['rest', 'after_exercise', 'on_waking', 'before_sleep'])
    expect(
      within(context).getByRole('radio', { name: strings.entry.contextLabels.before_sleep }),
    ).toBeInTheDocument()
  })

  it('offers the way on next to the saved message, and Save steps back', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    renderEntry([heartRate], { onNext })
    const save = screen.getByRole('button', { name: strings.entry.save })
    expect(screen.queryByRole('button', { name: strings.entry.nextLabel })).toBeNull()
    expect(save).toHaveClass('button--primary')

    typeInto('Heart rate', '57')
    await submit()
    const next = screen.getByRole('button', { name: strings.entry.nextLabel })
    expect(next).toHaveTextContent(strings.entry.next)
    // One primary at a time: the way on now, Save is the quiet one.
    expect(next).toHaveClass('button--primary')
    expect(save).not.toHaveClass('button--primary')
    await user.click(next)
    expect(onNext).toHaveBeenCalledTimes(1)

    // New text brings Save back as the primary and takes the way on away.
    await user.type(screen.getByLabelText('Heart rate'), '60')
    expect(screen.queryByRole('button', { name: strings.entry.nextLabel })).toBeNull()
    expect(save).toHaveClass('button--primary')
  })

  it('marks a filled row as done with a check', async () => {
    const user = userEvent.setup()
    renderEntry([heartRate, mood])
    const row = screen.getByLabelText('Heart rate').closest('li') as HTMLElement
    expect(row).not.toHaveClass('rep-row--done')
    await user.type(screen.getByLabelText('Heart rate'), '70')
    expect(row).toHaveClass('rep-row--done')
    expect(row.querySelector('.rep-row__check')).not.toBeNull()
  })

  it('saves every filled row as its own entry with the shared day and time', async () => {
    const store = renderEntry([heartRate, systolic, diastolic])

    typeInto('Heart rate', '57')
    typeInto('Systolic', '120')
    typeInto('Diastolic', '80')
    fireEvent.change(screen.getByLabelText(strings.entry.time), {
      target: { value: '15:44' },
    })
    const user = userEvent.setup()
    const group = await openHeader(user)
    await user.click(within(group).getByRole('radio', { name: 'After exercise' }))
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
    expect(screen.getByLabelText(strings.entry.missionDay)).toHaveValue('10')
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

  it('says sent once the outbox lets the readings go', async () => {
    const store = renderEntry([heartRate], { serverConfigured: true })
    typeInto('Heart rate', '57')
    await submit()
    expect(screen.getByRole('status')).toHaveTextContent(strings.entry.saved)

    act(() => {
      store.markSent(
        store.pending().map((entry) => entry.id),
        { missionDay: 10, time: '13:30' },
      )
    })
    expect(screen.getByRole('status')).toHaveTextContent(strings.entry.sent)
    expect(screen.getByRole('status')).not.toHaveTextContent(strings.entry.saved)
  })

  it('says so when the server did not accept the reading', async () => {
    const store = renderEntry([heartRate], { serverConfigured: true })
    typeInto('Heart rate', '57')
    await submit()

    act(() => {
      store.markRejected(store.pending()[0].id)
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      strings.entry.notAccepted,
    )
    expect(screen.getByRole('status')).not.toHaveTextContent(strings.entry.sent)
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

  it('shows progress and keeps Save focusable but not ready until a value is filled', async () => {
    const user = userEvent.setup()
    renderEntry([heartRate, mood])
    const save = screen.getByRole('button', { name: strings.entry.save })
    expect(screen.getByText(strings.entry.progress(0, 2))).toBeInTheDocument()
    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toHaveAccessibleDescription(strings.entry.saveNeeds)
    save.focus()
    expect(save).toHaveFocus()

    await user.type(screen.getByLabelText('Heart rate'), '70')
    expect(screen.getByText(strings.entry.progress(1, 2))).toBeInTheDocument()
    expect(save).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText(strings.entry.saveNeeds)).toBeNull()
  })

  it('moves to the next field with Enter and ends on Save', async () => {
    const user = userEvent.setup()
    renderEntry([heartRate, systolic, diastolic])
    await user.click(screen.getByLabelText('Heart rate'))
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Systolic')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByLabelText('Diastolic')).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: strings.entry.save })).toHaveFocus()
  })

  it('writes the blood pressure as one field with the unit inside', () => {
    renderEntry([systolic, diastolic])
    const field = screen.getByLabelText('Systolic').closest('.rep-field')
    expect(field).not.toBeNull()
    expect(field).toContainElement(screen.getByLabelText('Diastolic'))
    expect(within(field as HTMLElement).getByText('mmHg')).toBeInTheDocument()
  })

  it('keeps the time as 24-hour text with a numeric keypad', () => {
    renderEntry()
    const time = screen.getByLabelText(strings.entry.time)
    expect(time).toHaveAttribute('type', 'text')
    expect(time).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByLabelText(strings.entry.missionDay)).toHaveAttribute('inputmode', 'numeric')
  })
})
