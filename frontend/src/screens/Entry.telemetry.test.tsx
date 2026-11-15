import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LocalEntryStore } from '../data/entryStore'
import type {
  AttentionRule,
  Entry as EntryRecord,
  Indicator,
} from '../domain/types'
import { strings } from '../strings'
import Entry from './Entry'

// The report as a telemetry console: each panel draws a live figure from its
// readout, a small history from the person's own earlier readings, and the
// state of the last reading in words. Presentation only: what is saved is
// covered by Entry.test.tsx.

const heartRate: Indicator = {
  id: 'hr_bpm',
  name: 'Heart rate',
  unit: 'bpm',
  direction: 'both',
  measuredOnBoard: 'example',
  hazards: [],
  minSpread: 4,
  sources: ['Assumption'],
}

const rules: AttentionRule[] = [
  {
    indicatorId: 'hr_bpm',
    side: 'above',
    threshold: 100,
    attentionLevel: 'consult',
    notify: 'cmo',
    sources: [{ title: 'https://example.org', url: 'https://example.org' }],
  },
]

function reading(missionDay: number, value: number): EntryRecord {
  return {
    id: `cadet:hr_bpm:${missionDay}`,
    personId: 'cadet',
    indicatorId: 'hr_bpm',
    value,
    unit: 'bpm',
    missionDay,
    time: '13:30',
    context: 'rest',
  }
}

const history = [reading(1, 70), reading(2, 72), reading(3, 68), reading(4, 74), reading(5, 71)]

function renderConsole(entries: EntryRecord[] = history, withRules = true) {
  const store = new LocalEntryStore({ seedEntries: entries })
  return render(
    <Entry
      store={store}
      personId="cadet"
      indicators={[heartRate]}
      entries={entries}
      rules={withRules ? rules : undefined}
    />,
  )
}

function panel(): HTMLElement {
  return screen.getByLabelText('Heart rate').closest('li') as HTMLElement
}

describe('Entry as a telemetry console', () => {
  it('names the console and numbers each panel', () => {
    renderConsole()
    expect(screen.getByText(strings.entry.console)).toBeInTheDocument()
    expect(panel().querySelector('.rep-row__channel')).toHaveTextContent('01')
  })

  it('draws the figure from the last reading, then from what is typed', async () => {
    const user = userEvent.setup()
    renderConsole()
    const sweep = (): HTMLElement =>
      panel().querySelector('.tele-sweep') as HTMLElement
    // 71 bpm, the last reading: two beats take about 1.69 s.
    expect(sweep().style.getPropertyValue('--tele-beat')).toBe('1.69s')
    await user.type(screen.getByLabelText('Heart rate'), '120')
    expect(sweep().style.getPropertyValue('--tele-beat')).toBe('1.00s')
  })

  it('keeps the figure hidden from assistive technology and the field labelled', () => {
    renderConsole()
    expect(panel().querySelector('.tele')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByLabelText('Heart rate')).toHaveAccessibleDescription(/bpm/)
  })

  it('says why a panel with no earlier reading has no trend', () => {
    renderConsole([])
    expect(
      within(panel()).getByText(strings.entry.noHistory),
    ).toBeInTheDocument()
  })

  it('says the small history in words: how many, the lowest and the highest', () => {
    renderConsole()
    expect(
      within(panel()).getByText(strings.entry.history(null, 5, 68, 74, 'bpm')),
    ).toBeInTheDocument()
  })

  it('marks a typed value on the history as not saved yet', async () => {
    const user = userEvent.setup()
    renderConsole()
    expect(panel().querySelector('.tele-spark__pending')).toBeNull()
    await user.type(screen.getByLabelText('Heart rate'), '90')
    expect(panel().querySelector('.tele-spark__pending')).not.toBeNull()
  })

  it('shows the state of the last reading in words, with its icon', () => {
    renderConsole()
    const state = panel().querySelector('.rep-row__state') as HTMLElement
    expect(state).toHaveTextContent(strings.entry.lastState)
    expect(state).toHaveTextContent(strings.badge.inRange)
    expect(state.querySelector('svg')).not.toBeNull()
  })

  it('says needs review when the last reading crossed a cited limit', () => {
    renderConsole([...history, reading(6, 130)])
    expect(panel().querySelector('.rep-row__state')).toHaveTextContent(
      strings.badge.needsReviewLevel('consult'),
    )
  })

  it('shows no state without the attention rules, and no history without readings', () => {
    renderConsole([], false)
    expect(panel().querySelector('.rep-row__state')).toBeNull()
    expect(panel().querySelector('.rep-row__trend')).toBeNull()
    // The figure waits, idle.
    expect(panel().querySelector('.tele')).not.toHaveClass('tele--live')
  })
})
