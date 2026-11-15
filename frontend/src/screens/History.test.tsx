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
  rules: [
    {
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 100,
      attentionLevel: 'example_level',
      notify: 'crew',
      sources: ['Assumption'],
    },
  ],
  contents: {},
  demoEntries: [],
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
    ).toEqual(['Day', 'Time', 'Value', 'Status'])
  })

  it('lists the readings newest first', () => {
    renderHistory(readings)
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows.map((row) => rowCells(row)[0])).toEqual(['10', '3', '1'])
    expect(rows.map((row) => rowCells(row)[1])).toEqual(['15:44', '09:00', '08:00'])
  })

  it('writes the status of each reading in words', () => {
    renderHistory([
      entry(1, '08:00', 50),
      entry(2, '08:00', 101),
      entry(3, '08:00', 60),
    ])
    const table = screen.getByRole('table')
    expect(within(table).getByText('example_level')).toBeInTheDocument()
    expect(within(table).getAllByText('In your usual range')).toHaveLength(2)
  })

  it('says no threshold yet for an indicator without attention rules', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(screen.getByText('No threshold yet')).toBeInTheDocument()
    expect(screen.queryByText('In your usual range')).toBeNull()
  })

  it('shows a 1 to 5 reading as the value over 5', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(rowCells(screen.getAllByRole('row')[1])[2]).toBe('4 / 5')
  })

  it('compares the latest reading with the earlier median', () => {
    renderHistory(readings)
    expect(
      screen.getByText(
        'Latest: 42 example_unit on Day 10 15:44. ' +
          'Your earlier median: 5 example_unit (2 entries). ' +
          'Difference: +37 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('writes a negative difference with its sign', () => {
    renderHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 12),
      entry(3, '08:00', 8),
    ])
    expect(
      screen.getByText(
        'Latest: 8 example_unit on Day 3 08:00. ' +
          'Your earlier median: 11 example_unit (2 entries). ' +
          'Difference: -3 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('says one entry instead of entries for a single earlier reading', () => {
    renderHistory([entry(1, '08:00', 10), entry(2, '08:00', 14)])
    expect(
      screen.getByText(
        'Latest: 14 example_unit on Day 2 08:00. ' +
          'Your earlier median: 10 example_unit (1 entry). ' +
          'Difference: +4 example_unit.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps one decimal in the sentence when the readings carry one', () => {
    renderHistory([
      entry(1, '08:00', 36.4),
      entry(2, '08:00', 36.7),
      entry(3, '08:00', 36.7),
    ])
    expect(
      screen.getByText(
        'Latest: 36.7 example_unit on Day 3 08:00. ' +
          'Your earlier median: 36.6 example_unit (2 entries). ' +
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
        /Your earlier median: 30 example_unit \(7 entries\)/,
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
    renderHistory([entry(1, '08:00', 10), entry(10, '15:44', 42)])

    expect(
      await screen.findByText(/Your earlier median: 10 example_unit/),
    ).toBeInTheDocument()
  })

  it('publishes the id of the summary sentence for the chart', () => {
    renderHistory(readings)
    const summary = screen.getByText(/^Latest:/)
    expect(summary.id).not.toBe('')
    expect(summary).toHaveAttribute('data-summary-id', summary.id)
  })

  it('names the chart with the summary sentence', () => {
    renderHistory(readings)
    const summary = screen.getByText(/^Latest:/)
    const chart = screen.getByRole('img')
    expect(chart).toHaveAttribute('aria-labelledby', summary.id)
    expect(chart).toHaveAccessibleName(summary.textContent ?? '')
  })

  it('names the chart with the not-enough sentence when there is one reading', () => {
    renderHistory([entry(1, '08:00', 10)])
    expect(
      screen.getByRole('img', {
        name: 'Not enough earlier entries to compare yet.',
      }),
    ).toBeInTheDocument()
  })

  it('shows the chart next to the table, with a point per reading', () => {
    renderHistory(readings)
    const chart = screen.getByRole('img')
    expect(chart.querySelectorAll('circle')).toHaveLength(readings.length)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('draws no threshold line for an indicator without attention rules', async () => {
    const user = userEvent.setup()
    renderHistory([
      { ...entry(1, '08:00', 4), indicatorId: 'sleep_quality_1_5', unit: '1 to 5' },
    ])
    await user.selectOptions(screen.getByLabelText('Indicator'), 'sleep_quality_1_5')
    expect(screen.getByRole('img').querySelectorAll('.chart__threshold')).toHaveLength(0)
  })

  it('shows no chart without entries', () => {
    renderHistory([])
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('says there is not enough with one entry', () => {
    renderHistory([entry(1, '08:00', 10)])
    expect(
      screen.getByText('Not enough earlier entries to compare yet.'),
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
      entry(2, '08:00', 12),
      entry(3, '08:00', 1000, { personId: 'demo_astronaut_2' }),
      entry(4, '08:00', 2000, { personId: 'demo_astronaut_2' }),
    ])
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.queryByText(/2000/)).toBeNull()
    expect(
      screen.getByText(
        'Latest: 12 example_unit on Day 2 08:00. ' +
          'Your earlier median: 10 example_unit (1 entry). ' +
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
      .map((row) => rowCells(row)[2])
    expect(valueCells).toEqual(['12 example_unit', '10 example_unit'])
  })

  it('shows a reading added after the first render', () => {
    const store = renderHistory([entry(1, '08:00', 10)])
    act(() => {
      store.add({
        personId: 'demo_astronaut_1',
        indicatorId: 'example_indicator',
        value: 20,
        unit: 'example_unit',
        missionDay: 2,
        time: '09:00',
        context: 'rest',
      })
    })
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText(/Your earlier median: 10 example_unit/)).toBeInTheDocument()
  })
})
