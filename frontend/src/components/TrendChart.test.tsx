import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import TrendChart, { type TrendSeriesInput } from './TrendChart'
import { readoutText } from './trendText'
import type { Status } from '../domain/state'
import type { AttentionRule, Entry } from '../domain/types'

function entry(day: number, time: string, value: number, extra: Partial<Entry> = {}): Entry {
  return {
    id: `${extra.indicatorId ?? 'x'}:${day}:${time}`,
    personId: 'p',
    indicatorId: 'x',
    value,
    unit: 'bpm',
    missionDay: day,
    time,
    context: 'rest',
    ...extra,
  }
}

const inRange: Status = { state: 'in_range', level: null, notify: null, sources: [] }
const outside: Status = { state: 'outside_range', level: null, notify: null, sources: [] }
const review: Status = {
  state: 'needs_review',
  level: 'consult',
  notify: 'cmo',
  sources: [],
}
const noData: Status = { state: 'no_data', level: null, notify: null, sources: [] }

const cited: AttentionRule = {
  indicatorId: 'x',
  side: 'above',
  threshold: 100,
  attentionLevel: 'consult',
  notify: 'cmo',
  sources: [{ title: 'NASA', url: 'https://example.org' }],
}
const assumed: AttentionRule = {
  ...cited,
  threshold: 90,
  attentionLevel: 'watch',
  sources: ['Assumption'],
}

function single(extra: Partial<TrendSeriesInput> = {}): TrendSeriesInput {
  return {
    key: 'x',
    label: null,
    unit: 'bpm',
    rules: [cited, assumed],
    band: { median: 60, spread: 2, low: 54, high: 66 },
    points: [
      { entry: entry(1, '08:00', 58), status: noData },
      { entry: entry(2, '08:00', 61), status: inRange },
      { entry: entry(3, '08:00', 75), status: outside },
      { entry: entry(4, '09:30', 105), status: review },
    ],
    ...extra,
  }
}

function renderChart(series: TrendSeriesInput[] = [single()]) {
  return render(
    <>
      <p id="sum">Summary.</p>
      <TrendChart series={series} name="Heart rate" labelledBy="sum" drawKey="k" />
    </>,
  )
}

const main = (): HTMLElement =>
  document.querySelector('.tc__readout-main') as HTMLElement
const live = (): HTMLElement =>
  document.querySelector('[aria-live="polite"]') as HTMLElement
const group = () => screen.getByRole('group', { name: 'Trend of Heart rate' })

describe('TrendChart', () => {
  it('draws one mark per reading, with a shape per state', () => {
    const { container } = renderChart()
    const marks = [...container.querySelectorAll('.tc__svg .tc__pt')]
    expect(marks.map((m) => m.getAttribute('data-state'))).toEqual([
      'no_data',
      'in_range',
      'outside',
      'review',
    ])
    // The four states use four different element or shape signatures.
    const shapes = marks.map((m) => {
      const mark = m.querySelector('.tc__mark')
      return `${mark?.tagName}:${mark?.getAttribute('points') ?? ''}`
    })
    // no_data and in_range share a circle element; the class tells them apart.
    expect(new Set(shapes).size).toBe(3)
    expect(marks[0].querySelector('.tc__mark--no_data')).not.toBeNull()
    expect(marks[1].querySelector('.tc__mark--in_range')).not.toBeNull()
  })

  it('draws the usual band and only the thresholds with a link', () => {
    const { container } = renderChart()
    expect(container.querySelectorAll('.tc__band rect')).toHaveLength(1)
    const labels = [...container.querySelectorAll('.tc__threshold-label')].map(
      (node) => node.textContent,
    )
    expect(labels).toEqual(['consult'])
  })

  it('says so when the band has no baseline yet', () => {
    const { container } = renderChart([single({ band: null })])
    expect(container.querySelectorAll('.tc__band')).toHaveLength(0)
    expect(screen.getByText(/needs 3 earlier readings/)).toBeInTheDocument()
  })

  it('shows a reading in the readout on a tap, outside the plot', async () => {
    const user = userEvent.setup()
    const { container } = renderChart()
    // Nothing selected: the newest reading, named as such.
    expect(screen.getByText('Newest reading')).toBeInTheDocument()
    expect(screen.getByText(/105 bpm · FD 4 · GMT 09:30/)).toBeInTheDocument()
    const target = container.querySelector('[data-entry="x:3:08:00"]')
    expect(target).not.toBeNull()
    await user.click(target as Element)
    expect(
      screen.getByText('75 bpm · FD 3 · GMT 08:00 · At rest · Outside your usual range'),
    ).toBeInTheDocument()
    expect(container.querySelector('.tc__readout')?.closest('svg')).toBeNull()
  })

  it('moves along the readings with the arrow keys', async () => {
    const user = userEvent.setup()
    renderChart()
    await user.tab()
    expect(group()).toHaveFocus()
    // First key lands on the newest reading.
    await user.keyboard('{ArrowLeft}')
    expect(main()).toHaveTextContent(/105 bpm · FD 4 · GMT 09:30/)
    await user.keyboard('{ArrowLeft}')
    expect(main()).toHaveTextContent(/75 bpm · FD 3/)
    await user.keyboard('{Home}')
    expect(main()).toHaveTextContent(/58 bpm · FD 1/)
    await user.keyboard('{ArrowLeft}')
    expect(main()).toHaveTextContent(/58 bpm · FD 1/)
    await user.keyboard('{End}')
    expect(main()).toHaveTextContent(/105 bpm · FD 4/)
    await user.keyboard('{ArrowRight}')
    expect(main()).toHaveTextContent(/105 bpm · FD 4/)
    await user.keyboard('{Escape}')
    expect(screen.getByText('Newest reading')).toBeInTheDocument()
  })

  it('reads the state in words, with the level of a crossed row', async () => {
    const user = userEvent.setup()
    renderChart()
    await user.tab()
    await user.keyboard('{End}')
    expect(screen.getByText(/Needs review · consult$/)).toBeInTheDocument()
    expect(screen.getByText('Reading 4 of 4')).toBeInTheDocument()
  })

  it('lists the marks in a legend with words', () => {
    renderChart()
    const legend = screen.getByRole('list', { name: 'Marks' })
    expect(legend.textContent).toContain('In your usual range')
    expect(legend.textContent).toContain('Outside your usual range')
    expect(legend.textContent).toContain('Needs review')
    expect(legend.textContent).toContain('No data yet')
  })

  it('names the chart and says how to move', () => {
    renderChart()
    expect(group().getAttribute('aria-describedby')).toContain('sum')
    expect(screen.getByText(/Arrow keys move between readings/)).toBeInTheDocument()
  })

  it('draws two series with different shapes and switches with up and down', async () => {
    const user = userEvent.setup()
    const sys = single({
      key: 'bp_sys_mmhg',
      label: 'Systolic',
      unit: 'mmHg',
      rules: [],
      points: [
        { entry: entry(1, '08:00', 120, { indicatorId: 'bp_sys_mmhg', unit: 'mmHg' }), status: inRange },
        { entry: entry(2, '08:00', 122, { indicatorId: 'bp_sys_mmhg', unit: 'mmHg' }), status: inRange },
      ],
    })
    const dia = single({
      key: 'bp_dia_mmhg',
      label: 'Diastolic',
      unit: 'mmHg',
      rules: [],
      points: [
        { entry: entry(1, '08:00', 80, { indicatorId: 'bp_dia_mmhg', unit: 'mmHg' }), status: inRange },
        { entry: entry(2, '08:00', 81, { indicatorId: 'bp_dia_mmhg', unit: 'mmHg' }), status: inRange },
      ],
    })
    const { container } = renderChart([sys, dia])
    const sysMark = container.querySelector('[data-series="bp_sys_mmhg"] .tc__mark')
    const diaMark = container.querySelector('[data-series="bp_dia_mmhg"] .tc__mark')
    expect(sysMark?.tagName).toBe('circle')
    expect(diaMark?.tagName).toBe('rect')
    expect(container.querySelectorAll('.tc__line')).toHaveLength(2)
    await user.tab()
    await user.keyboard('{End}')
    expect(main()).toHaveTextContent(/^Systolic: 122 mmHg/)
    await user.keyboard('{ArrowDown}')
    expect(main()).toHaveTextContent(/^Diastolic: 81 mmHg/)
    await user.keyboard('{ArrowUp}')
    expect(main()).toHaveTextContent(/^Systolic: 122 mmHg/)
  })

  it('pauses its motion while the tab is hidden', () => {
    const { container } = renderChart()
    expect(container.querySelector('.tc')).not.toHaveClass('tc--hidden')
    const original = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(container.querySelector('.tc')).toHaveClass('tc--hidden')
    if (original) Object.defineProperty(document, 'visibilityState', original)
    else Reflect.deleteProperty(document, 'visibilityState')
  })
})

describe('readoutText', () => {
  it('writes value, Flight Day, GMT time, context and state', () => {
    const text = readoutText(
      { label: 'Systolic' },
      { entry: entry(12, '08:30', 118, { unit: 'mmHg', context: 'on_waking' }), status: inRange },
    )
    expect(text).toBe(
      'Systolic: 118 mmHg · FD 12 · GMT 08:30 · Post-sleep · on waking · In your usual range',
    )
  })
})

describe('TrendChart announcements', () => {
  it('announces a reading only once it is picked, not the newest one at rest', async () => {
    const user = userEvent.setup()
    renderChart()
    expect(live()).toHaveTextContent('')
    expect(document.querySelector('.tc__readout')).toHaveAttribute('aria-hidden', 'true')
    await user.tab()
    await user.keyboard('{End}')
    expect(live()).toHaveTextContent(/105 bpm · FD 4 · GMT 09:30 · At rest · Needs review · consult\. Reading 4 of 4/)
    await user.keyboard('{Escape}')
    expect(live()).toHaveTextContent('')
  })
})

describe('TrendChart threshold labels', () => {
  it('uses the short series name when there is one', () => {
    const rule = { ...cited, attentionLevel: 'urgent' }
    const { container } = renderChart([
      single({ label: 'Systolic', shortLabel: 'Sys', rules: [rule] }),
    ])
    expect(container.querySelector('.tc__threshold-label')?.textContent).toBe('Sys: urgent')
  })
})

describe('TrendChart axes', () => {
  it('draws the 1 to 5 scale as 1 to 5 and keeps every Flight Day label inside the plot', () => {
    const points = [
      { entry: entry(1, '21:10', 4, { unit: '1 to 5' }), status: inRange },
      { entry: entry(2, '21:10', 2, { unit: '1 to 5' }), status: inRange },
      { entry: entry(3, '21:10', 3, { unit: '1 to 5' }), status: inRange },
    ]
    const { container } = renderChart([
      single({ unit: '1 to 5', rules: [], points, band: { median: 3, spread: 0.5, low: 1.5, high: 4.5 } }),
    ])
    const ticks = [...container.querySelectorAll('.tc__tick')].map((n) => n.textContent)
    expect(ticks).toEqual(expect.arrayContaining(['1', '2', '3', '4', '5']))
    expect(ticks).not.toContain('0')
    expect(ticks).not.toContain('10')
    const first = container.querySelector('.tc__axis ~ g text.tc__tick[text-anchor="middle"]')
    expect(first?.textContent).toBe('1')
    expect(Number(first?.getAttribute('x'))).toBeGreaterThan(50)
  })
})
