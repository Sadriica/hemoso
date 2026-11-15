import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IndicatorDetails from './IndicatorDetails'
import type { AttentionRule, Indicator, IndicatorContent } from '../domain/types'

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement', 'gravity_fields', 'space_weather'],
  minSpread: 1,
  sources: ['Assumption'],
}

const content: IndicatorContent = {
  indicatorId: 'example_indicator',
  name: 'Example indicator',
  whyItMatters: 'Example reason. Assumption.',
  howSpaceflightAffectsIt: 'Example effect. Assumption.',
  measurementSteps: ['Example step one.', 'Example step two.'],
  statusAndNextSteps: { example_level: 'Example next step. Assumption.' },
  howToPrevent: 'Example guidance. Assumption.',
  sources: ['Assumption'],
}

const sources = [{ title: 'Example title', url: 'https://example.org' }]

describe('IndicatorDetails', () => {
  it('shows the facts of indicators.csv first', () => {
    render(
      <IndicatorDetails indicator={indicator} content={content} sources={sources} />,
    )
    expect(screen.getByText('Measured on board:').parentElement).toHaveTextContent(
      'Measured on board: example measurement method',
    )
    expect(screen.getByText('Hazards:').parentElement).toHaveTextContent(
      'Hazards: Isolation and confinement, Gravity fields',
    )
    // The ids of the file never reach the screen, and neither does an id the
    // five known hazards do not cover.
    expect(screen.queryByText(/gravity_fields/)).toBeNull()
    expect(screen.queryByText(/space_weather/)).toBeNull()
  })

  it('shows each section of the content file with its text', () => {
    render(
      <IndicatorDetails indicator={indicator} content={content} sources={sources} />,
    )
    for (const heading of [
      'Why it matters',
      'How spaceflight affects it',
      'Measurement steps',
      'How to prevent problems',
      'Sources',
    ]) {
      expect(
        screen.getByRole('heading', { level: 4, name: heading }),
      ).toBeInTheDocument()
    }
    expect(screen.getByText('Example reason. Assumption.')).toBeInTheDocument()
    expect(screen.getByText('Example effect. Assumption.')).toBeInTheDocument()
    expect(
      screen.getByText('Example guidance. Assumption.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Example title' }),
    ).toBeInTheDocument()
  })

  it('leaves out an empty section instead of a blank heading', () => {
    render(
      <IndicatorDetails
        indicator={indicator}
        content={{
          ...content,
          whyItMatters: '   ',
          measurementSteps: [],
          howToPrevent: '',
        }}
        sources={sources}
      />,
    )
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Why it matters' }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Measurement steps' }),
    ).toBeNull()
    expect(
      screen.queryByRole('heading', {
        level: 4,
        name: 'How to prevent problems',
      }),
    ).toBeNull()
    // The sections that do have text stay.
    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'How spaceflight affects it',
      }),
    ).toBeInTheDocument()
  })

  it('says the text will appear when there is no content file', () => {
    render(
      <IndicatorDetails indicator={indicator} content={undefined} sources={sources} />,
    )
    expect(
      screen.getByText(
        'Details will appear when the team adds the text for this indicator.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Why it matters' }),
    ).toBeNull()
    // The facts and the sources are still there.
    expect(screen.getByText('Measured on board:').parentElement).toHaveTextContent(
      'Measured on board: example measurement method',
    )
    expect(
      screen.getByRole('link', { name: 'Example title' }),
    ).toBeInTheDocument()
  })

  it('says when there are no sources', () => {
    render(
      <IndicatorDetails indicator={indicator} content={content} sources={[]} />,
    )
    expect(screen.getByText('No sources listed.')).toBeInTheDocument()
  })

  const rules: AttentionRule[] = [
    {
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 140,
      attentionLevel: 'consult',
      notify: 'cmo',
      sources: [
        { title: 'https://example.org/a', url: 'https://example.org/a' },
      ],
    },
    {
      indicatorId: 'example_indicator',
      side: 'above',
      threshold: 120,
      attentionLevel: 'watch',
      notify: 'crew',
      sources: ['Assumption'],
    },
    {
      indicatorId: 'example_indicator',
      side: 'below',
      threshold: 50,
      attentionLevel: 'urgent',
      notify: 'flight_surgeon',
      sources: ['Assumption'],
    },
  ]

  it('lists the attention rows, below first, each with its source', () => {
    render(
      <IndicatorDetails
        indicator={indicator}
        content={content}
        sources={sources}
        rules={rules}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 4, name: 'When it needs attention' }),
    ).toBeInTheDocument()
    const lines = screen
      .getAllByRole('listitem')
      .filter((li) => /^(Below|Above)/.test(li.textContent ?? ''))
    expect(lines.map((li) => li.textContent)).toEqual([
      expect.stringContaining(
        'Below 50 example_unit: urgent. Tell the flight surgeon.',
      ),
      expect.stringContaining('Above 120 example_unit: watch. Tell the crew.'),
      expect.stringContaining('Above 140 example_unit: consult. Tell the CMO.'),
    ])
    expect(screen.getAllByText('Assumption')).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: 'example.org · a' }),
    ).toHaveAttribute('href', 'https://example.org/a')
  })

  it('leaves out the attention section without rows', () => {
    render(
      <IndicatorDetails indicator={indicator} content={content} sources={sources} />,
    )
    expect(screen.queryByText('When it needs attention')).toBeNull()
  })
})
