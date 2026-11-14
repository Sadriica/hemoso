import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IndicatorDetails from './IndicatorDetails'
import type { Indicator, IndicatorContent } from '../domain/types'

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement', 'gravity_fields', 'space_weather'],
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
})
