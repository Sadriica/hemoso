import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { loadContent } from '../../content/load'
import type { Condition } from '../../domain/conditions'
import type { ConditionsClient } from '../../data/conditionsClient'
import type { Entry } from '../../domain/types'
import { strings } from '../../strings'
import PossibleConditions from './PossibleConditions'

// The panel with the team's own files: the names, the signals and the limits
// are the ones of config/, and the readings are the synthetic demo rows plus
// the ones a test adds on the day after.
const data = loadContent()
const PERSON = data.demoEntries[0].personId
const copy = strings.conditions
const lastDay = Math.max(...data.demoEntries.map((entry) => entry.missionDay))

const noServer: ConditionsClient = {
  isConfigured: () => false,
  fetchConditions: () => Promise.resolve(null),
}

// A reading on the day after the demo data, in the context that indicator's
// history uses, so it has a baseline.
function reading(indicatorId: string, value: number): Entry {
  const earlier = data.demoEntries.filter(
    (entry) => entry.indicatorId === indicatorId,
  )
  const last = earlier[earlier.length - 1]
  return { ...last, id: `test-${indicatorId}`, value, missionDay: lastDay + 1 }
}

function renderPanel(
  extra: Entry[] = [],
  props: Partial<Parameters<typeof PossibleConditions>[0]> = {},
) {
  return render(
    <PossibleConditions
      personId={PERSON}
      conditions={data.conditions}
      indicators={data.indicators}
      rules={data.rules}
      entries={[...data.demoEntries, ...extra]}
      client={noServer}
      {...props}
    />,
  )
}

// A fast heart rate with a high core temperature: both past a cited limit.
const feverish = [reading('hr_bpm', 130), reading('temp_core_c', 39.6)]

function rowOf(name: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 3, name })
  return heading.closest('li') as HTMLElement
}

describe('PossibleConditions', () => {
  it('is not shown while conditions.csv has no row', () => {
    const { container } = renderPanel([], { conditions: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('names the panel, says who confirms once, and lists every condition', async () => {
    const user = userEvent.setup()
    renderPanel(feverish)
    expect(
      screen.getByRole('heading', { level: 2, name: copy.heading }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(copy.confirms)).toHaveLength(1)

    // The rows with not enough data wait behind one closed line with a count.
    const scored = screen.getAllByRole('heading', { level: 3 }).length
    const toggle = screen.getByRole('button', {
      name: copy.notEnough(data.conditions.length - scored),
    })
    await user.click(toggle)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(
      data.conditions.length,
    )
    for (const condition of data.conditions) {
      expect(
        screen.getByRole('heading', { level: 3, name: condition.name }),
      ).toBeInTheDocument()
    }
  })

  it('scores a condition on this device with no server, as a bar with words', () => {
    renderPanel(feverish)
    const fever = rowOf('Fever')
    expect(within(fever).getByText(copy.label.review)).toBeInTheDocument()
    expect(within(fever).getByText(copy.sentence.review)).toBeInTheDocument()
    expect(within(fever).getByText(copy.evidence('1'))).toBeInTheDocument()
    const meter = within(fever).getByRole('meter', {
      name: copy.meterName('Fever'),
    })
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '1')
    expect(meter).toHaveAttribute('aria-valuenow', '1')
    expect(meter).toHaveAttribute(
      'aria-valuetext',
      copy.evidenceSpoken('1', copy.label.review),
    )
  })

  it('writes each signal with its indicator and its side in words', () => {
    renderPanel(feverish)
    const fever = rowOf('Fever')
    const signals = within(fever).getByRole('list', {
      name: copy.signalsLabel('Fever'),
    })
    expect(
      within(signals).getByText(copy.signal.limit('Heart rate', 'above')),
    ).toBeInTheDocument()
    expect(
      within(signals).getByText(copy.signal.limit('Core temperature', 'above')),
    ).toBeInTheDocument()
  })

  it('shows the source of a row as a link, or the word Assumption', async () => {
    const user = userEvent.setup()
    renderPanel(feverish)
    const link = within(rowOf('Fever')).getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      data.conditions.find((item) => item.id === 'fever')?.source,
    )
    await user.click(screen.getByRole('button', { name: /Not enough data yet/ }))
    const assumed = data.conditions.find((item) => item.source === 'Assumption')
    if (assumed !== undefined) {
      expect(
        within(rowOf(assumed.name)).getByText(strings.sources.assumption),
      ).toBeInTheDocument()
    }
  })

  it('orders the rows: review, then possible, then low', () => {
    renderPanel(feverish)
    const steps = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => {
        const row = heading.closest('li') as HTMLElement
        return row.className.replace('condition condition--', '')
      })
    const rank = { review: 0, possible: 1, low: 2 } as Record<string, number>
    expect(steps.length).toBeGreaterThan(1)
    expect(steps).toEqual([...steps].sort((a, b) => rank[a] - rank[b]))
    expect(steps[0]).toBe('review')
  })

  it('opens the card of an indicator when its signal is tapped', async () => {
    const user = userEvent.setup()
    const onSelectIndicator = vi.fn()
    renderPanel(feverish, { onSelectIndicator })
    const text = copy.signal.limit('Core temperature', 'above')
    await user.click(
      within(rowOf('Fever')).getByRole('button', { name: copy.openCard(text) }),
    )
    expect(onSelectIndicator).toHaveBeenCalledWith('temp_core_c')
  })

  it('reaches every signal with the keyboard', async () => {
    const user = userEvent.setup()
    renderPanel(feverish, { onSelectIndicator: vi.fn() })
    await user.tab()
    expect(document.activeElement?.tagName).toMatch(/^(BUTTON|A)$/)
    expect(document.activeElement).toBeVisible()
  })

  it('never writes a percentage or a statement about the person', async () => {
    const user = userEvent.setup()
    const { container } = renderPanel(feverish, { onSelectIndicator: vi.fn() })
    await user.click(screen.getByRole('button', { name: /Not enough data yet/ }))
    // Everything a person can read or hear: the text and the accessible names.
    const labels = [...container.querySelectorAll('[aria-label], [aria-valuetext]')]
      .map(
        (element) =>
          `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('aria-valuetext') ?? ''}`,
      )
      .join(' ')
    const everything = `${container.textContent ?? ''} ${labels}`
    for (const forbidden of [
      /%/,
      /you have/i,
      /diagnos/i,
      /certain/i,
      /confirmed/i,
      /disease/i,
      /\bAI\b/,
      /probab/i,
    ]) {
      expect(everything).not.toMatch(forbidden)
    }
  })

  it('shows the answer of the server when it speaks about the same readings', async () => {
    const entries = [...data.demoEntries, ...feverish]
    // The same rows as this device computes, with one name the server changed.
    const { scoreConditions } = await import('../../domain/conditions')
    const local = scoreConditions(
      data.conditions,
      entries,
      data.indicators,
      data.rules,
    )
    const remote: Condition[] = local.map((item) =>
      item.id === 'fever' ? { ...item, name: 'Fever from the server' } : item,
    )
    const client: ConditionsClient = {
      isConfigured: () => true,
      fetchConditions: vi.fn().mockResolvedValue(remote),
    }
    renderPanel(feverish, { client })
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Fever from the server' }),
    ).toBeInTheDocument()
    expect(client.fetchConditions).toHaveBeenCalledWith(PERSON)
  })

  it('keeps the local score when the server has not seen the newest reading', async () => {
    const stale: Condition[] = data.conditions.map((item) => ({
      id: item.id,
      name: `${item.name} (old)`,
      score: null,
      label: 'no_data',
      signals: item.signals.map((signal) => ({
        indicatorId: signal.indicatorId,
        side: signal.side,
        contribution: null,
        value: null,
      })),
      source: item.source,
    }))
    const client: ConditionsClient = {
      isConfigured: () => true,
      fetchConditions: vi.fn().mockResolvedValue(stale),
    }
    renderPanel(feverish, { client })
    await waitFor(() => expect(client.fetchConditions).toHaveBeenCalled())
    expect(
      screen.getByRole('heading', { level: 3, name: 'Fever' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/\(old\)/)).toBeNull()
  })

  it('keeps the local score when the server does not answer', async () => {
    const client: ConditionsClient = {
      isConfigured: () => true,
      fetchConditions: vi.fn().mockResolvedValue(null),
    }
    renderPanel(feverish, { client })
    await waitFor(() => expect(client.fetchConditions).toHaveBeenCalled())
    expect(within(rowOf('Fever')).getByText(copy.label.review)).toBeInTheDocument()
  })
})

describe('PossibleConditions, symptoms', () => {
  const fatigue = data.symptoms.find((item) => item.id === 'fatigue')
  const vomiting = data.symptoms.find((item) => item.id === 'vomiting')
  const report = (symptomId: string) => ({
    personId: PERSON,
    symptomId,
    severity: 2 as const,
    missionDay: lastDay + 1,
    time: '10:00',
  })

  it('reads the symptom files of config/', () => {
    expect(fatigue?.shared).toBe(true)
    expect(vomiting?.redFlag).toBe(true)
  })

  it('shows "Call your CMO now" for a reported red flag, before any bar', () => {
    renderPanel([reading('glucose_mgdl', 200)], {
      symptoms: data.symptoms,
      symptomReports: [report('vomiting')],
    })
    const row = rowOf('Hyperglycaemia')
    expect(within(row).getByText(copy.sentence.urgent)).toBeInTheDocument()
    expect(within(row).queryByRole('meter')).toBeNull()
    // The signal is still listed, in plain words.
    expect(within(row).getByText(copy.symptom.reported('Vomiting'))).toBeInTheDocument()
  })

  it('puts an urgent row before every other row', () => {
    renderPanel(feverish, {
      symptoms: data.symptoms,
      symptomReports: [report('vomiting')],
    })
    const names = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(names[0]).toBe('Hyperglycaemia')
  })

  it('caps a symptom-only condition at Possible', () => {
    renderPanel([], {
      symptoms: data.symptoms,
      symptomReports: [report('thirst'), report('frequent_urination')],
    })
    const row = rowOf('Hyperglycaemia')
    expect(within(row).getByText(copy.label.possible)).toBeInTheDocument()
    expect(within(row).getByText(copy.evidence('0.5'))).toBeInTheDocument()
  })

  it('shows no percentage and keeps "your CMO or flight surgeon confirms"', () => {
    const { container } = renderPanel([], {
      symptoms: data.symptoms,
      symptomReports: [report('vomiting')],
    })
    expect(container.textContent).not.toMatch(/%/)
    expect(screen.getByText(copy.confirms)).toBeInTheDocument()
  })
})

