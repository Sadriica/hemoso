import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Home from './Home'
import type { LoadedContent } from '../content/load'
import type {
  AttentionRule,
  Entry,
  Indicator,
  IndicatorContent,
} from '../domain/types'

const indicator: Indicator = {
  id: 'example_indicator',
  name: 'Example indicator',
  unit: 'example_unit',
  direction: 'higher',
  measuredOnBoard: 'example measurement method',
  hazards: ['isolation_and_confinement'],
  sources: ['Assumption'],
}

const rule: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'above',
  threshold: 100,
  attentionLevel: 'example_level',
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
  sources: [{ title: 'Example title', url: 'https://example.org' }],
}

function entry(missionDay: number, value: number): Entry {
  return {
    id: `demo_astronaut_1:example_indicator:${missionDay}:13:30`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay,
    time: '13:30',
  }
}

const data: LoadedContent = {
  indicators: [indicator],
  rules: [rule],
  contents: { example_indicator: content },
  demoEntries: [entry(1, 1), entry(10, 10)],
  usingPlaceholders: false,
  problems: [],
}

describe('Home', () => {
  it('shows name, latest value with unit, day/time, badge and next step', () => {
    render(<Home personId="demo_astronaut_1" data={data} />)
    expect(screen.getByText('Example indicator')).toBeInTheDocument()
    expect(screen.getByText('10 example_unit')).toBeInTheDocument()
    expect(screen.getByText('Day 10 13:30')).toBeInTheDocument()
    expect(screen.getByText('In range')).toBeInTheDocument()
    expect(screen.getByText('No action needed.')).toBeInTheDocument()
  })

  it('shows the level name and its next step when a value crosses the threshold', () => {
    const attentionData: LoadedContent = {
      ...data,
      demoEntries: [entry(1, 1), entry(10, 101)],
    }
    render(<Home personId="demo_astronaut_1" data={attentionData} />)
    expect(screen.getByText('example_level')).toBeInTheDocument()
    expect(screen.getByText('Example next step. Assumption.')).toBeInTheDocument()
  })

  it('opens the sources disclosure by keyboard and shows links and Assumption', async () => {
    const user = userEvent.setup()
    render(<Home personId="demo_astronaut_1" data={data} />)
    const toggle = screen.getByRole('button', { name: 'Sources' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('link', { name: 'Example title' })).toBeInTheDocument()
    expect(screen.getByText('Assumption')).toBeInTheDocument()
  })

  it('shows a content problems disclosure when there are problems', async () => {
    const user = userEvent.setup()
    const withProblems: LoadedContent = {
      ...data,
      problems: ['Indicator example_indicator has no source or Assumption.'],
    }
    render(<Home personId="demo_astronaut_1" data={withProblems} />)
    const toggle = screen.getByRole('button', {
      name: 'Content problems (for the team)',
    })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByText('Indicator example_indicator has no source or Assumption.'),
    ).toBeInTheDocument()
  })
})
