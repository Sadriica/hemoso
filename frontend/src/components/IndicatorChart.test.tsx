import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IndicatorChart from './IndicatorChart'
import type { HistoryComparison } from '../domain/entries'
import type { AttentionRule, Entry } from '../domain/types'

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

const rule: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'above',
  threshold: 100,
  attentionLevel: 'example_level',
  notify: 'crew',
  sources: ['Assumption'],
}

// The screen renders the sentence with this id; here a plain paragraph stands in
// for it, so the test checks the wiring and not the wording.
const SUMMARY_ID = 'summary'
const SUMMARY = 'Latest: 42 example_unit on Day 3 09:00.'

function renderChart({
  entries = [entry(1, '08:00', 10), entry(2, '08:00', 20), entry(3, '09:00', 42)],
  rules = [],
  comparison = null,
}: {
  entries?: Entry[]
  rules?: AttentionRule[]
  comparison?: HistoryComparison | null
} = {}) {
  const { container } = render(
    <>
      <p id={SUMMARY_ID}>{SUMMARY}</p>
      <IndicatorChart
        entries={entries}
        unit="example_unit"
        rules={rules}
        comparison={comparison}
        labelledBy={SUMMARY_ID}
      />
    </>,
  )
  return container
}

function points(container: HTMLElement): SVGCircleElement[] {
  return Array.from(container.querySelectorAll<SVGCircleElement>('circle'))
}

function dayLabels(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<SVGTextElement>('.chart__tick--day'),
  ).map((node) => node.textContent ?? '')
}

// jsdom lays nothing out, so the width the chart measures from its box is set
// by hand for the narrow cases.
function withClientWidth(width: number, run: () => void): void {
  const prototype = HTMLElement.prototype as unknown as {
    clientWidth?: number
  }
  const original = Object.getOwnPropertyDescriptor(prototype, 'clientWidth')
  Object.defineProperty(prototype, 'clientWidth', {
    configurable: true,
    value: width,
  })
  try {
    run()
  } finally {
    if (original === undefined) delete prototype.clientWidth
    else Object.defineProperty(prototype, 'clientWidth', original)
  }
}

describe('IndicatorChart', () => {
  it('draws one point per reading', () => {
    const container = renderChart({
      entries: [
        entry(1, '08:00', 10),
        entry(1, '20:00', 12),
        entry(2, '08:00', 14),
        entry(3, '08:00', 16),
      ],
    })
    expect(points(container)).toHaveLength(4)
  })

  it('draws the earlier median as a dashed line', () => {
    const comparison: HistoryComparison = {
      latest: entry(3, '09:00', 42),
      earlierCount: 2,
      earlierMedian: 15,
      difference: 27,
    }
    const container = renderChart({ comparison })
    const medians = container.querySelectorAll('.chart__median')
    expect(medians).toHaveLength(1)
    expect(medians[0].getAttribute('stroke-dasharray')).toBe('6 4')
  })

  it('draws no median line with fewer than two readings', () => {
    const container = renderChart({ entries: [entry(1, '08:00', 10)] })
    expect(container.querySelectorAll('.chart__median')).toHaveLength(0)
  })

  it('draws every attention threshold with its level name as text', () => {
    const container = renderChart({
      rules: [
        rule,
        {
          ...rule,
          side: 'below',
          threshold: 5,
          attentionLevel: 'low_level',
          notify: 'cmo',
        },
      ],
    })
    expect(container.querySelectorAll('.chart__threshold')).toHaveLength(2)
    expect(screen.getByText('example_level')).toBeInTheDocument()
    expect(screen.getByText('low_level')).toBeInTheDocument()
  })

  it('puts each label at the right end, above an above line and below a below line', () => {
    const container = renderChart({
      rules: [
        rule,
        { ...rule, side: 'below', threshold: 5, attentionLevel: 'low_level' },
      ],
    })
    const labels = [...container.querySelectorAll('.chart__threshold-label')]
    const lines = [...container.querySelectorAll('.chart__threshold')]
    const byText = (text: string): number =>
      labels.findIndex((label) => label.textContent === text)
    for (const label of labels) {
      expect(label.getAttribute('text-anchor')).toBe('end')
    }
    const lineY = (text: string): number => {
      const g = labels[byText(text)].parentElement
      return Number(g?.querySelector('.chart__threshold')?.getAttribute('y1'))
    }
    const labelY = (text: string): number =>
      Number(labels[byText(text)].getAttribute('y'))
    expect(labelY('example_level')).toBeLessThan(lineY('example_level'))
    expect(labelY('low_level')).toBeGreaterThan(lineY('low_level'))
    expect(lines).toHaveLength(2)
  })

  it('draws no threshold line for an indicator without attention rules', () => {
    const container = renderChart({ rules: [] })
    expect(container.querySelectorAll('.chart__threshold')).toHaveLength(0)
    expect(container.querySelectorAll('.chart__threshold-label')).toHaveLength(0)
  })

  it('takes the summary sentence as its accessible name', () => {
    renderChart()
    expect(screen.getByRole('img', { name: SUMMARY })).toBeInTheDocument()
  })

  it('takes the values it draws from the readings and the rules', () => {
    const container = renderChart({
      entries: [entry(1, '08:00', 10), entry(2, '08:00', 20)],
      rules: [{ ...rule, threshold: 30 }],
    })
    const texts = Array.from(
      container.querySelectorAll<SVGTextElement>('.chart__tick'),
    ).map((node) => node.textContent)
    expect(texts).toContain('30')
    expect(texts).toContain('10')
    expect(texts).toContain('20')
    // The unit of the readings, once, unchanged.
    expect(screen.getByText('example_unit')).toBeInTheDocument()
  })

  it('keeps one decimal on the axis when the readings carry one', () => {
    const container = renderChart({
      entries: [entry(1, '08:00', 36.4), entry(2, '08:00', 36.7)],
      rules: [{ ...rule, threshold: 37.5 }],
    })
    const texts = Array.from(
      container.querySelectorAll<SVGTextElement>('.chart__tick'),
    ).map((node) => node.textContent ?? '')
    expect(texts).toContain('37.5')
    // The ticks are round numbers of half a degree, but they keep the one
    // decimal the readings carry instead of reading 36 and 38.
    expect(texts.filter((text) => /^\d+\.\d$/.test(text)).length).toBeGreaterThan(
      2,
    )
  })

  it('scales with its box instead of a fixed pixel width', () => {
    const container = renderChart()
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 480 250')
    expect(svg?.hasAttribute('width')).toBe(false)
    expect(svg?.getAttribute('aria-labelledby')).toBe(SUMMARY_ID)
  })

  it('draws one unit per pixel of its box, so the axis text never shrinks', () => {
    withClientWidth(280, () => {
      const svg = renderChart().querySelector('svg')
      expect(svg?.getAttribute('viewBox')).toBe('0 0 280 250')
    })
  })

  it('shows the mission days of the readings on the day axis', () => {
    const container = renderChart({
      entries: [entry(1, '08:00', 10), entry(4, '08:00', 12)],
    })
    expect(dayLabels(container)).toEqual(['1', '4'])
  })

  it('keeps every other day label in a narrow box', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      entry(day, '08:00', 60 + day),
    )
    withClientWidth(280, () => {
      const container = renderChart({ entries: days })
      // Seven days on a 192 px plot: the labels would touch each other, so the
      // axis keeps every other day and always the last reading's day.
      expect(dayLabels(container)).toEqual(['1', '3', '5', '7'])
    })
  })

  it('labels every day when the box is wide', () => {
    const days = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      entry(day, '08:00', 60 + day),
    )
    expect(dayLabels(renderChart({ entries: days }))).toHaveLength(7)
  })

  it('draws nothing for an empty list', () => {
    const container = renderChart({ entries: [] })
    expect(container.querySelector('svg')).toBeNull()
  })
})
