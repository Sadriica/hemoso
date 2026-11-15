import { render, screen, within } from '@testing-library/react'
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
  notify: 'crew',
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

function renderHome(content: LoadedContent) {
  render(
    <Home
      personId="demo_astronaut_1"
      data={content}
      entries={content.demoEntries}
    />,
  )
}

describe('Home', () => {
  it('shows name, latest value with unit, day/time, badge and next step', () => {
    renderHome(data)
    expect(
      screen.getByRole('heading', { name: 'Example indicator' }),
    ).toBeInTheDocument()
    expect(screen.getByText('10')).toHaveTextContent('10 example_unit')
    expect(screen.getByText('Day 10 13:30')).toBeInTheDocument()
    expect(screen.getByText('In range')).toBeInTheDocument()
    expect(screen.getByText('No action needed.')).toBeInTheDocument()
  })

  it('shows the level name and its next step when a value crosses the threshold', () => {
    const attentionData: LoadedContent = {
      ...data,
      demoEntries: [entry(1, 1), entry(10, 101)],
    }
    renderHome(attentionData)
    expect(screen.getByText('example_level')).toBeInTheDocument()
    expect(screen.getByText('Example next step. Assumption.')).toBeInTheDocument()
  })

  it('says who acts when a level matches, from the notify column', () => {
    const crossing: LoadedContent = {
      ...data,
      demoEntries: [entry(10, 101)],
    }
    renderHome(crossing)
    expect(screen.getByText('Tell the crew.')).toBeInTheDocument()
  })

  it('names the CMO when the matching rule notifies the CMO', () => {
    renderHome({
      ...data,
      rules: [{ ...rule, notify: 'cmo' }],
      demoEntries: [entry(10, 101)],
    })
    expect(screen.getByText('Tell the CMO.')).toBeInTheDocument()
    expect(screen.queryByText('Tell the crew.')).toBeNull()
  })

  it('names the flight surgeon when the matching rule notifies them', () => {
    renderHome({
      ...data,
      rules: [{ ...rule, notify: 'flight_surgeon' }],
      demoEntries: [entry(10, 101)],
    })
    expect(screen.getByText('Tell the flight surgeon.')).toBeInTheDocument()
  })

  it('does not say who acts when no level matches', () => {
    renderHome(data)
    expect(screen.queryByText(/^Tell the /)).toBeNull()
  })

  it('shows the most severe step of a stepped indicator', () => {
    // The worked example of FORMATS.md section 3, value 35 crossing both rows.
    const stepped: LoadedContent = {
      ...data,
      rules: [
        { ...rule, side: 'below', threshold: 37.5, attentionLevel: 'watch' },
        {
          ...rule,
          side: 'below',
          threshold: 36,
          attentionLevel: 'needs_review',
          notify: 'cmo',
        },
      ],
      contents: {
        example_indicator: {
          ...content,
          statusAndNextSteps: {
            watch: 'Rest and measure again.',
            needs_review: 'Contact the CMO.',
          },
        },
      },
      demoEntries: [entry(10, 35)],
    }
    renderHome(stepped)
    expect(screen.getByText('needs_review')).toBeInTheDocument()
    expect(screen.getByText('Contact the CMO.')).toBeInTheDocument()
    expect(screen.getByText('Tell the CMO.')).toBeInTheDocument()
  })

  it('keeps one disclosure per card and shows the sources inside it', async () => {
    const user = userEvent.setup()
    renderHome(data)

    // The card has one disclosure: Details owns the sources as well.
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Sources' })).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('link', { name: 'Example title' })).toBeInTheDocument()
    expect(screen.getByText('Assumption')).toBeInTheDocument()
  })

  it('opens Details by keyboard and shows the content sections', async () => {
    const user = userEvent.setup()
    renderHome(data)
    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('heading', { level: 4, name: 'Why it matters' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'How spaceflight affects it',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 4, name: 'How to prevent problems' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Example reason. Assumption.')).toBeInTheDocument()
    expect(screen.getByText('Example effect. Assumption.')).toBeInTheDocument()
    expect(
      screen.getByText('Example guidance. Assumption.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Measurement steps').tagName.toLowerCase(),
    ).toBe('h4')
  })

  it('shows the measurement steps as a numbered list', async () => {
    const user = userEvent.setup()
    renderHome(data)
    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')

    const section = screen.getByRole('heading', {
      level: 4,
      name: 'Measurement steps',
    }).parentElement
    expect(section).not.toBeNull()
    const list = within(section as HTMLElement).getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(
      within(section as HTMLElement)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Example step one.', 'Example step two.'])
  })

  it('closes Details again by keyboard', async () => {
    const user = userEvent.setup()
    renderHome(data)
    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Why it matters' }),
    ).toBeNull()
  })

  it('shows the facts of indicators.csv when the content file is missing', async () => {
    const user = userEvent.setup()
    renderHome({ ...data, contents: {} })
    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')

    expect(
      screen.getByText(
        'Details will appear when the team adds the text for this indicator.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Measured on board:').parentElement,
    ).toHaveTextContent('Measured on board: example measurement method')
    expect(screen.getByText('Hazards:').parentElement).toHaveTextContent(
      'Hazards: Isolation and confinement',
    )
    expect(screen.queryByText(/isolation_and_confinement/)).toBeNull()
    expect(screen.getByText('Assumption')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 4, name: 'Why it matters' }),
    ).toBeNull()
  })

  it('writes the hazards as plain names and never as ids', async () => {
    const user = userEvent.setup()
    renderHome({
      ...data,
      indicators: [
        { ...indicator, hazards: ['gravity_fields', 'space_weather'] },
      ],
    })
    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByText('Hazards:').parentElement).toHaveTextContent(
      'Hazards: Gravity fields',
    )
    expect(screen.queryByText(/gravity_fields/)).toBeNull()
    expect(screen.queryByText(/space_weather/)).toBeNull()
  })

  it('shows a content problems disclosure when there are problems', async () => {
    const user = userEvent.setup()
    const withProblems: LoadedContent = {
      ...data,
      problems: ['Indicator example_indicator has no source or Assumption.'],
    }
    renderHome(withProblems)
    const toggle = screen.getByRole('button', {
      name: 'Content problems (for the team)',
    })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByText('Indicator example_indicator has no source or Assumption.'),
    ).toBeInTheDocument()
  })

  it('shows the entries it is given instead of the demo rows', () => {
    const saved: Entry = { ...entry(11, 42), id: 'saved-entry' }
    render(<Home personId="demo_astronaut_1" data={data} entries={[saved]} />)
    expect(screen.getByText('42')).toHaveTextContent('42 example_unit')
    expect(screen.getByText('Day 11 13:30')).toBeInTheDocument()
  })

  it('shows a 1 to 5 scale reading as the value over 5', () => {
    const scale: Indicator = {
      id: 'sleep_quality_1_5',
      name: 'Sleep quality',
      unit: '1 to 5',
      direction: 'lower',
      measuredOnBoard: 'Questionnaire after waking',
      hazards: ['isolation_and_confinement'],
      sources: ['Assumption'],
    }
    const scaleData: LoadedContent = {
      ...data,
      indicators: [scale],
      rules: [],
      contents: {},
      demoEntries: [
        {
          id: 'scale-entry',
          personId: 'demo_astronaut_1',
          indicatorId: 'sleep_quality_1_5',
          value: 4,
          unit: '1 to 5',
          missionDay: 10,
          time: '08:00',
        },
      ],
    }
    renderHome(scaleData)
    expect(screen.getByText('4')).toHaveTextContent('4 / 5')
    expect(screen.queryByText('4 1 to 5')).toBeNull()
  })

  it('never says in range when the indicator has no attention rule', () => {
    const noRules: LoadedContent = { ...data, rules: [] }
    renderHome(noRules)

    expect(screen.getByText('No threshold yet')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No attention rule for this indicator yet. Check with your CMO if you are unsure.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('In range')).toBeNull()
    expect(screen.queryByText('No action needed.')).toBeNull()
  })

  it('names the content still missing instead of the generic notice', () => {
    const waiting: LoadedContent = {
      ...data,
      rules: [],
      contents: {},
      usingPlaceholders: true,
    }
    renderHome(waiting)
    expect(
      screen.getByText('Waiting for: attention rules, indicator texts.'),
    ).toBeInTheDocument()
  })

  it('names only the texts when the attention rules are there', () => {
    const textsMissing: LoadedContent = {
      ...data,
      contents: {},
      usingPlaceholders: true,
    }
    renderHome(textsMissing)
    expect(screen.getByText('Waiting for: indicator texts.')).toBeInTheDocument()
  })

  it('keeps the generic notice while every file is still an example', () => {
    renderHome({ ...data, usingPlaceholders: true })
    expect(
      screen.getByText(
        'Showing example content until the team adds config files.',
      ),
    ).toBeInTheDocument()
  })
})
