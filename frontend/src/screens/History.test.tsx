import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import History from './History'
import type { LoadedContent } from '../content/load'
import { LocalEntryStore } from '../data/entryStore'
import type { Entry, Indicator } from '../domain/types'

// Every test starts with no server, and the fakes of one test never reach the
// next.
afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubEnv('VITE_API_BASE_URL', '')
})

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement'],
  minSpread: 1,
  sources: ['Assumption'],
}

const scale: Indicator = {
  id: 'sleep_quality_1_5',
  name: 'Sleep quality',
  unit: '1 to 5',
  direction: 'lower',
  measuredOnBoard: 'Questionnaire after waking',
  hazards: ['isolation_and_confinement'],
  minSpread: 1,
  sources: ['Assumption'],
}

const data: LoadedContent = {
  indicators: [indicator, scale],
  conditions: [],
  rules: [
    {
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 100,
      attentionLevel: 'example_level',
      notify: 'crew',
      sources: [{ title: 'Example', url: 'https://example.org' }],
    },
  ],
  contents: {},
  demoEntries: [],
  symptoms: [],
  demoSymptoms: [],
  usingPlaceholders: false,
  problems: [],
}

function entry(
  missionDay: number,
  time: string,
  value: number,
  extra: Partial<Entry> = {},
): Entry {
  return {
    id: `x:${missionDay}:${time}:${value}`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay,
    time,
    context: 'rest',
    ...extra,
  }
}

const readings = [
  entry(1, '08:00', 1),
  entry(10, '15:44', 42),
  entry(3, '09:00', 9),
]

function renderHistory(
  entries: Entry[],
  personId = 'demo_astronaut_1',
): LocalEntryStore {
  const store = new LocalEntryStore({ storage: null, seedEntries: entries })
  render(<History store={store} personId={personId} data={data} />)
  return store
}

function rowCells(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '')
}

describe('History', () => {
  it('shows every indicator and the table headers', () => {
    renderHistory(readings)
    expect(screen.getByLabelText('Indicator')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Example indicator' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sleep quality' })).toBeInTheDocument()
    expect(
      screen.getByRole('table', { name: 'Readings for Example indicator' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent),
    ).toEqual(['Flight Day', 'GMT', 'Context', 'Value', 'Status'])
  })

  it('lists the readings newest first', () => {
    renderHistory(readings)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((row) => rowCells(row)[0])).toEqual(['10', '3', '1'])
    expect(rows.map((row) => rowCells(row)[1])).toEqual(['15:44', '09:00', '08:00'])
  })

  it('writes the status of each reading with the card rule', () => {
    renderHistory([
      entry(1, '08:00', 50),
      entry(2, '08:00', 52),
      entry(3, '08:00', 51),
      entry(4, '08:00', 50),
      entry(5, '08:00', 101),
      entry(6, '08:00', 52),
    ])
    const rows = screen.getAllByRole('row').slice(1)
    const status = rows.map((row) => rowCells(row)[4])
    // Newest first: day 6 and 4 sit near their baseline, day 5 crossed the
    // threshold, and the first three days have too few earlier readings.
    expect(status).toEqual([
      'In your usual range',
      'example_level',
      'In your usual range',
      'No data yet',
      'No data yet',
      'No data yet',
    ])
  })

  it('never says in your usual range without a baseline', () => {
    renderHistory([entry(1, '08:00', 50), entry(2, '08:00', 51)])
    expect(screen.queryByText('In your usual range')).toBeNull()
    expect(
      within(screen.getByRole('table')).getAllByText('No data yet'),
    ).toHaveLength(2)
  })

  it('shows the context of each reading', () => {
    renderHistory([
      entry(1, '07:00', 50),
      entry(1, '18:00', 90, { context: 'after_exercise' }),
    ])
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((row) => rowCells(row)[2])).toEqual(['After exercise', 'At rest'])
  })

  it('shows the newest 14 readings and a button for all of them', async () => {
    const user = userEvent.setup()
    renderHistory(Array.from({ length: 20 }, (_, i) => entry(i + 1, '08:00', 50)))
    expect(screen.getAllByRole('row')).toHaveLength(15)
    const more = screen.getByRole('button', { name: 'Show all 20 readings' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)
    expect(screen.getAllByRole('row')).toHaveLength(21)
    const fewer = screen.getByRole('button', { name: 'Show fewer' })
    expect(fewer).toHaveAttribute('aria-expanded', 'true')
    await user.click(fewer)
    expect(screen.getAllByRole('row')).toHaveLength(15)
  })

  it('has no show-all button for a short list', () => {
    renderHistory(readings)
    expect(screen.queryByRole('button', { name: /readings/ })).toBeNull()
  })

  it('gives the scrolling table box a name and a keyboard stop', () => {
    renderHistory(readings)
    const region = screen.getByRole('region', {
      name: 'Readings table for Example indicator',
    })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('says no data yet for an indicator without attention rules and no baseline', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(
      within(screen.getByRole('table')).getByText('No data yet'),
    ).toBeInTheDocument()
  })

  it('shows a 1 to 5 reading as the value over 5', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(rowCells(screen.getAllByRole('row')[1])[3]).toBe('4 / 5')
  })

  it('compares the latest reading with the usual value of the same context', () => {
    renderHistory([
      entry(1, '08:00', 4),
      entry(2, '08:00', 5),
      entry(3, '08:00', 6),
      entry(10, '15:44', 42),
    ])
    expect(
      screen.getByText(
        'Latest: 42 example_unit on FD 10, GMT 15:44. ' +
          'Your usual at rest: 5 example_unit (last 3 readings). ' +
          'Difference: +37 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('ignores earlier readings of another context, like the card does', () => {
    renderHistory([
      entry(1, '08:00', 100, { context: 'after_exercise' }),
      entry(2, '08:00', 4),
      entry(3, '08:00', 5),
      entry(4, '08:00', 6),
      entry(5, '08:00', 8),
    ])
    expect(
      screen.getByText(
        'Latest: 8 example_unit on FD 5, GMT 08:00. ' +
          'Your usual at rest: 5 example_unit (last 3 readings). ' +
          'Difference: +3 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('says there is not enough when the context has fewer than three earlier readings', () => {
    renderHistory([
      entry(1, '08:00', 100, { context: 'after_exercise' }),
      entry(2, '08:00', 101, { context: 'after_exercise' }),
      entry(3, '08:00', 102, { context: 'after_exercise' }),
      entry(4, '08:00', 5),
      entry(5, '08:00', 6),
    ])
    expect(
      screen.getByText(
        'Latest: 6 example_unit on FD 5, GMT 08:00. Not enough earlier entries to compare yet.',
      ),
    ).toBeInTheDocument()
  })

  it('writes a negative difference with its sign', () => {
    renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 12),
      entry(3, '08:00', 11),
      entry(4, '08:00', 8),
    ])
    expect(
      screen.getByText(
        'Latest: 8 example_unit on FD 4, GMT 08:00. ' +
          'Your usual at rest: 11 example_unit (last 3 readings). ' +
          'Difference: -3 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps one decimal in the sentence when the readings carry one', () => {
    renderHistory([
      entry(1, '08:00', 36.4),
      entry(2, '08:00', 36.7),
      entry(3, '08:00', 36.6),
      entry(4, '08:00', 36.7),
    ])
    expect(
      screen.getByText(
        'Latest: 36.7 example_unit on FD 4, GMT 08:00. ' +
          'Your usual at rest: 36.6 example_unit (last 3 readings). ' +
          'Difference: +0.1 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('uses the median the state route answers', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              state: 'in_range',
              median: 30,
              spread: 4,
              n: 7,
              attention: null,
            }),
        } as unknown as Response),
      ),
    )
    renderHistory(readings)

    expect(
      await screen.findByText(
        /Your usual at rest: 30 example_unit \(last 7 readings\)/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Difference: \+12 example_unit\./),
    ).toBeInTheDocument()
  })

  it('keeps the local comparison when the state route fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 10),
      entry(3, '08:00', 10),
      entry(10, '15:44', 42),
    ])

    expect(
      await screen.findByText(/Your usual at rest: 10 example_unit/),
    ).toBeInTheDocument()
  })

  it('publishes the id of the summary sentence for the chart', () => {
    renderHistory(readings)
    const summary = screen.getByText(/^Latest:/)
    expect(summary.id).not.toBe('')
    expect(summary).toHaveAttribute('data-summary-id', summary.id)
  })

  it('describes the chart group with the summary sentence', () => {
    renderHistory(readings)
    const summary = screen.getByText(/^Latest:/)
    const chart = screen.getByRole('group', { name: 'Trend of Example indicator' })
    expect(chart.getAttribute('aria-describedby')).toContain(summary.id)
  })

  it('shows the chart next to the table, with a mark per reading in the context', () => {
    renderHistory(readings)
    const chart = screen.getByRole('group', { name: 'Trend of Example indicator' })
    expect(chart.querySelectorAll('.tc__pt')).toHaveLength(readings.length)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('draws no threshold line for an indicator without attention rules', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(document.querySelectorAll('.tc__threshold')).toHaveLength(0)
  })

  it('shows no chart without entries', () => {
    renderHistory([])
    expect(screen.queryByRole('group', { name: /^Trend of/ })).toBeNull()
  })

  it('says there is not enough with one entry', () => {
    renderHistory([entry(1, '08:00', 10)])
    expect(
      screen.getByText(
        'Latest: 10 example_unit on FD 1, GMT 08:00. Not enough earlier entries to compare yet.',
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('says there are no entries yet', () => {
    renderHistory([])
    expect(screen.getByText('No entries for this indicator yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('never counts another person readings', () => {
    renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 10),
      entry(3, '08:00', 10),
      entry(4, '08:00', 12),
      entry(5, '08:00', 1000, { personId: 'demo_astronaut_2' }),
      entry(6, '08:00', 2000, { personId: 'demo_astronaut_2' }),
    ])
    expect(screen.getAllByRole('row')).toHaveLength(5)
    expect(screen.queryByText(/2000/)).toBeNull()
    expect(
      screen.getByText(
        'Latest: 12 example_unit on FD 4, GMT 08:00. ' +
          'Your usual at rest: 10 example_unit (last 3 readings). ' +
          'Difference: +2 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('never counts another indicator readings', () => {
    renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 12),
      entry(3, '08:00', 4, { indicatorId: 'sleep_quality_1_5', unit: '1 to 5' }),
    ])
    expect(screen.getAllByRole('row')).toHaveLength(3)
    const valueCells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => rowCells(row)[3])
    expect(valueCells).toEqual(['12 example_unit', '10 example_unit'])
  })

  it('shows a reading added after the first render', () => {
    const store = renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 10),
      entry(3, '08:00', 10),
    ])
    act(() => {
      store.add({
        personId: 'demo_astronaut_1',
        indicatorId: 'example_indicator',
        value: 20,
        unit: 'example_unit',
        missionDay: 4,
        time: '09:00',
        context: 'rest',
      })
    })
    expect(screen.getAllByRole('row')).toHaveLength(5)
    expect(screen.getByText(/Your usual at rest: 10 example_unit/)).toBeInTheDocument()
  })

  it('opens on the indicator of the card and follows a new card selection', () => {
    const store = new LocalEntryStore({
      storage: null,
      seedEntries: [
        entry(1, '08:00', 10),
        { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
      ],
    })
    const { rerender } = render(
      <History
        store={store}
        personId="demo_astronaut_1"
        data={data}
        indicatorId="sleep_quality_1_5"
      />,
    )
    expect(screen.getByLabelText('Indicator')).toHaveValue('sleep_quality_1_5')
    rerender(
      <History
        store={store}
        personId="demo_astronaut_1"
        data={data}
        indicatorId="example_indicator"
      />,
    )
    expect(screen.getByLabelText('Indicator')).toHaveValue('example_indicator')
  })

  it('lets the person pick another indicator without moving the card', async () => {
    const user = userEvent.setup()
    const store = new LocalEntryStore({ storage: null, seedEntries: [] })
    render(
      <History
        store={store}
        personId="demo_astronaut_1"
        data={data}
        indicatorId="example_indicator"
      />,
    )
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(screen.getByLabelText('Indicator')).toHaveValue('sleep_quality_1_5')
  })
})

describe('History trend', () => {
  const cited = {
    indicatorId: 'example_indicator',
    side: 'above' as const,
    threshold: 100,
    attentionLevel: 'consult',
    notify: 'cmo' as const,
    sources: [{ title: 'NASA', url: 'https://example.org' }],
  }

  function renderWith(entries: Entry[], content: LoadedContent = data) {
    const store = new LocalEntryStore({ storage: null, seedEntries: entries })
    render(<History store={store} personId="demo_astronaut_1" data={content} />)
  }

  const mixed = [
    entry(1, '07:00', 10, { context: 'on_waking' }),
    entry(2, '07:00', 11, { context: 'on_waking' }),
    entry(3, '07:00', 12, { context: 'on_waking' }),
    entry(4, '12:00', 50),
    entry(5, '12:00', 52),
  ]

  it('opens on the usual context of the indicator', () => {
    renderWith(mixed)
    expect(
      screen.getByRole('radio', { name: 'Post-sleep · on waking' }),
    ).toBeChecked()
    expect(document.querySelectorAll('.tc__svg .tc__pt')).toHaveLength(3)
  })

  it('filters the chart by context with the segmented control', async () => {
    const user = userEvent.setup()
    renderWith(mixed)
    await user.click(screen.getByRole('radio', { name: 'At rest' }))
    expect(document.querySelectorAll('.tc__svg .tc__pt')).toHaveLength(2)
    await user.click(screen.getByRole('radio', { name: 'After exercise' }))
    expect(screen.getByText('No readings in this context yet.')).toBeInTheDocument()
    expect(
      screen.getByText('Readings are in: At rest, Post-sleep · on waking.'),
    ).toBeInTheDocument()
    // The table keeps every reading: it is the text of all the numbers.
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(6)
  })

  it('switches between the last 14 and all readings', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 20 }, (_, i) => entry(i + 1, '08:00', 40 + i))
    renderWith(many)
    expect(screen.getByRole('radio', { name: 'Last 14' })).toBeChecked()
    expect(document.querySelectorAll('.tc__svg .tc__pt')).toHaveLength(14)
    await user.click(screen.getByRole('radio', { name: 'All' }))
    expect(document.querySelectorAll('.tc__svg .tc__pt')).toHaveLength(20)
  })

  it('draws a threshold only when its row has a link as a source', () => {
    renderWith(readings, {
      ...data,
      rules: [cited, { ...cited, threshold: 90, attentionLevel: 'watch', sources: ['Assumption'] }],
    })
    const labels = [...document.querySelectorAll('.tc__threshold-label')].map(
      (node) => node.textContent,
    )
    expect(labels).toEqual(['consult'])
  })

  it('puts systolic and diastolic on one chart', () => {
    const sys: Indicator = { ...indicator, id: 'bp_sys_mmhg', name: 'Systolic blood pressure', unit: 'mmHg' }
    const dia: Indicator = { ...indicator, id: 'bp_dia_mmhg', name: 'Diastolic blood pressure', unit: 'mmHg' }
    const bp = { ...data, indicators: [sys, dia], rules: [] }
    const store = new LocalEntryStore({
      storage: null,
      seedEntries: [
        entry(1, '08:00', 120, { indicatorId: 'bp_sys_mmhg', unit: 'mmHg' }),
        entry(2, '08:00', 121, { indicatorId: 'bp_sys_mmhg', unit: 'mmHg' }),
        entry(1, '08:00', 80, { indicatorId: 'bp_dia_mmhg', unit: 'mmHg' }),
        entry(2, '08:00', 81, { indicatorId: 'bp_dia_mmhg', unit: 'mmHg' }),
      ],
    })
    render(<History store={store} personId="demo_astronaut_1" data={bp} indicatorId="bp_dia_mmhg" />)
    expect(
      screen.getByRole('group', { name: 'Trend of Blood pressure' }),
    ).toBeInTheDocument()
    expect(document.querySelectorAll('.tc__line')).toHaveLength(2)
    expect(document.querySelectorAll('.tc__svg .tc__pt')).toHaveLength(4)
    // One text table per series.
    expect(screen.getAllByRole('table')).toHaveLength(2)
  })
})
