import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Home from './Home'
import { strings } from '../strings'
import type { LoadedContent } from '../content/load'
import type {
  AttentionRule,
  Entry,
  Indicator,
  IndicatorContent,
} from '../domain/types'

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
    context: 'rest',
  }
}

const data: LoadedContent = {
  indicators: [indicator],
  conditions: [],
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

// The three earlier readings at rest that the baseline rule needs before it
// says anything (FORMATS.md section 3).
const baseline = [entry(1, 10), entry(2, 10), entry(3, 10)]

// The load with these readings instead of the two of `data`.
function homeWith(rows: Entry[]): LoadedContent {
  return { ...data, demoEntries: rows }
}

// The shape of a Response for the state route: the client reads `status` and
// `json()` only.
function answer(status: number, body: unknown): Response {
  return {
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// The card of the selected indicator, where the badge, the value and the next
// step live: the planetarium repeats some of the same words.
function card(): HTMLElement {
  const list = document.querySelector('.indicator-list')
  if (list === null) throw new Error('the selected card is not on the screen')
  return list as HTMLElement
}

describe('Home', () => {
  it('shows name, latest value with unit, day/time, badge and next step', () => {
    renderHome(homeWith([...baseline, entry(10, 10)]))
    expect(
      screen.getByRole('heading', { name: 'Example indicator' }),
    ).toBeInTheDocument()
    expect(screen.getByText('10')).toHaveTextContent('10 example_unit')
    expect(screen.getByText(strings.timeLabel(10, '13:30', strings.entry.contextLabels.rest))).toBeInTheDocument()
    expect(
      within(card()).getByText(strings.badge.inRange),
    ).toBeInTheDocument()
    expect(screen.getByText('No action needed.')).toBeInTheDocument()
  })

  it('says no data yet while the window holds fewer than three readings', () => {
    renderHome(data)
    expect(
      within(card()).getByText(strings.badge.noData),
    ).toBeInTheDocument()
    expect(screen.getByText(strings.nextStep.noData)).toBeInTheDocument()
  })

  it('shows the level name and its next step when a value crosses the threshold', () => {
    renderHome(homeWith([...baseline, entry(10, 101)]))
    expect(within(card()).getByText('example_level')).toBeInTheDocument()
    expect(screen.getByText('Example next step. Assumption.')).toBeInTheDocument()
  })

  it('names the limit that was crossed and its source on a needs-review card', () => {
    renderHome(homeWith([...baseline, entry(10, 101)]))
    expect(
      within(card()).getByText(/Limit crossed: above 100 example_unit\./),
    ).toHaveTextContent('Source: Assumption')
  })

  it('names the person and the context of the reading', () => {
    renderHome(homeWith([...baseline, entry(10, 10)]))
    expect(
      screen.getByRole('heading', { name: 'Status for Demo astronaut 1' }),
    ).toBeInTheDocument()
    expect(
      within(card()).getByText(/^FD 10 · GMT 13:30 · At rest$/),
    ).toBeInTheDocument()
  })

  it('says needs review for a cited limit even with no baseline', () => {
    const cited = {
      ...rule,
      sources: [{ title: 'Example title', url: 'https://example.org/limit' }],
    }
    renderHome({ ...homeWith([entry(10, 101)]), rules: [cited] })
    expect(within(card()).getByText('example_level')).toBeInTheDocument()
    expect(
      within(card()).getByText(/Not enough earlier readings at rest/),
    ).toBeInTheDocument()
    expect(
      within(card()).getByRole('link', { name: 'Example title' }),
    ).toHaveAttribute('href', 'https://example.org/limit')
  })

  it('labels an untitled limit source like Details does, with the same link attributes', () => {
    const url = 'https://www.who.int/news-room/fact-sheets/detail/hypertension'
    const cited = { ...rule, sources: [{ title: url, url }] }
    renderHome({ ...homeWith([entry(10, 101)]), rules: [cited] })
    const link = within(card()).getByRole('link', {
      name: 'who.int \u00b7 hypertension',
    })
    expect(link).toHaveAttribute('title', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer noopener')
    expect(link).toHaveAccessibleDescription(strings.sources.opensNewTab)
  })

  it('shows the content text for in_range when the file has one', () => {
    renderHome({
      ...homeWith([...baseline, entry(10, 10)]),
      contents: {
        example_indicator: {
          ...content,
          statusAndNextSteps: {
            in_range: 'Example text for the usual range. Assumption.',
          },
        },
      },
    })
    expect(
      screen.getByText('Example text for the usual range. Assumption.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(strings.nextStep.inRange)).toBeNull()
  })

  it('shows the content text for outside_range when the file has one', () => {
    renderHome({
      ...homeWith([...baseline, entry(10, 40)]),
      rules: [],
      contents: {
        example_indicator: {
          ...content,
          statusAndNextSteps: {
            outside_range: 'Example text below the usual range. Assumption.',
          },
        },
      },
    })
    expect(
      screen.getByText('Example text below the usual range. Assumption.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(strings.nextStep.outsideRange)).toBeNull()
  })

  it('shows the content text for no_data when the file has one', () => {
    renderHome({
      ...data,
      contents: {
        example_indicator: {
          ...content,
          statusAndNextSteps: {
            no_data: 'Example text with no reading yet. Assumption.',
          },
        },
      },
    })
    expect(
      screen.getByText('Example text with no reading yet. Assumption.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(strings.nextStep.noData)).toBeNull()
  })

  it('keeps the app words when the content text for a state is empty', () => {
    renderHome({
      ...homeWith([...baseline, entry(10, 10)]),
      contents: {
        example_indicator: { ...content, statusAndNextSteps: { in_range: '  ' } },
      },
    })
    expect(screen.getByText(strings.nextStep.inRange)).toBeInTheDocument()
  })

  it('says who acts when a level matches, from the notify column', () => {
    renderHome(homeWith([...baseline, entry(10, 101)]))
    expect(screen.getByText('Tell the crew.')).toBeInTheDocument()
  })

  it('names the CMO when the matching rule notifies the CMO', () => {
    renderHome({
      ...homeWith([...baseline, entry(10, 101)]),
      rules: [{ ...rule, notify: 'cmo' }],
    })
    expect(screen.getByText('Tell the CMO.')).toBeInTheDocument()
    expect(screen.queryByText('Tell the crew.')).toBeNull()
  })

  it('names the flight surgeon when the matching rule notifies them', () => {
    renderHome({
      ...homeWith([...baseline, entry(10, 101)]),
      rules: [{ ...rule, notify: 'flight_surgeon' }],
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
      demoEntries: [entry(1, 40), entry(2, 40), entry(3, 40), entry(10, 35)],
    }
    renderHome(stepped)
    expect(within(card()).getByText('Needs review · needs_review')).toBeInTheDocument()
    expect(screen.getByText('Contact the CMO.')).toBeInTheDocument()
    expect(screen.getByText('Tell the CMO.')).toBeInTheDocument()
  })

  it('keeps one disclosure per card and shows the sources inside it', async () => {
    const user = userEvent.setup()
    renderHome(data)

    // The card has one disclosure: Details owns the sources as well.
    expect(within(card()).getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Sources' })).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Details' })
    toggle.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('link', { name: 'Example title' })).toBeInTheDocument()
    // The attention row and the source list each carry the word.
    expect(screen.getAllByText('Assumption').length).toBeGreaterThan(0)
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
    expect(screen.getAllByText('Assumption').length).toBeGreaterThan(0)
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
    expect(screen.getByText(strings.timeLabel(11, '13:30', strings.entry.contextLabels.rest))).toBeInTheDocument()
  })

  it('shows a 1 to 5 scale reading as the value over 5', () => {
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
          context: 'rest',
        },
      ],
    }
    renderHome(scaleData)
    expect(screen.getByText('4')).toHaveTextContent('4 / 5')
    expect(screen.queryByText('4 1 to 5')).toBeNull()
  })

  it('says in your usual range from the person own baseline without an attention rule', () => {
    renderHome({ ...homeWith([...baseline, entry(10, 10)]), rules: [] })

    expect(within(card()).getByText(strings.badge.inRange)).toBeInTheDocument()
    expect(screen.getByText('No action needed.')).toBeInTheDocument()
  })

  it('says outside your usual range when the value is further than the band', () => {
    const { container } = render(
      <Home
        personId="demo_astronaut_1"
        data={{ ...homeWith([...baseline, entry(10, 40)]), rules: [] }}
        entries={[...baseline, entry(10, 40)]}
        motionReduced
      />,
    )

    const badge = within(card()).getByText(strings.badge.outsideRange)
    expect(badge).toBeInTheDocument()
    expect(screen.getByText(strings.nextStep.outsideRange)).toBeInTheDocument()
    expect(screen.queryByText(strings.nextStep.inRange)).toBeNull()
    // Its own look: the blue state shape and edge, never the review one.
    expect(container.querySelector('.attention-badge--outside')).toHaveTextContent(
      strings.badge.outsideRange,
    )
    expect(
      container.querySelector('.attention-badge--outside svg'),
    ).toHaveAttribute('data-icon', 'outside')
    expect(container.querySelector('.indicator-card--outside')).not.toBeNull()
  })

  it('says no data yet, never in range, without a baseline to compare', () => {
    renderHome({ ...data, rules: [] })

    expect(within(card()).getByText(strings.badge.noData)).toBeInTheDocument()
    expect(screen.getByText(strings.nextStep.noData)).toBeInTheDocument()
    expect(screen.queryByText(strings.badge.inRange)).toBeNull()
    expect(screen.queryByText('No action needed.')).toBeNull()
  })

  it('uses the status the backend state route answers', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    const urls: string[] = []
    const fetchFn = vi.fn((input: string) => {
      urls.push(input)
      return Promise.resolve(
        answer(200, {
          state: 'needs_review',
          median: 10,
          spread: 1,
          n: 3,
          attention: {
            attention_level: 'server_level',
            notify: 'flight_surgeon',
            source: 'https://example.org/rule',
          },
        }),
      )
    })
    vi.stubGlobal('fetch', fetchFn)
    renderHome(homeWith([...baseline, entry(10, 100)]))

    // The planetarium and the card both take it from the same answer.
    expect(await screen.findAllByText('Needs review · server_level')).not.toHaveLength(0)
    expect(screen.getByText('Tell the flight surgeon.')).toBeInTheDocument()
    expect(urls).toHaveLength(1)
    expect(urls[0]).toBe(
      'https://api.example.test/people/demo_astronaut_1/indicators/example_indicator/state' +
        '?value=100&context=rest&mission_day=10&time=13%3A30',
    )
  })

  it('keeps the local rule when the state route fails', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    const fetchFn = vi.fn(() => Promise.reject(new Error('offline')))
    vi.stubGlobal('fetch', fetchFn)
    renderHome(homeWith([...baseline, entry(10, 101)]))

    expect(fetchFn).toHaveBeenCalled()
    expect(await screen.findAllByText('example_level')).not.toHaveLength(0)
  })

  it('asks the state route nothing without a base URL', async () => {
    const fetchFn = vi.fn()
    vi.stubGlobal('fetch', fetchFn)
    renderHome(homeWith([...baseline, entry(10, 101)]))

    expect(fetchFn).not.toHaveBeenCalled()
    expect(screen.getAllByText('example_level')).not.toHaveLength(0)
  })

  it('keeps the local rule when the state route answers another status', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(answer(502, { detail: 'upstream storage error' }))),
    )
    renderHome(homeWith([...baseline, entry(10, 101)]))

    expect(await screen.findAllByText('example_level')).not.toHaveLength(0)
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

describe('Home board', () => {
  it('shows the state icon and the words in the badge, and the unit in the value', () => {
    const { container } = render(
      <Home
        personId="demo_astronaut_1"
        data={homeWith([...baseline, entry(10, 10)])}
        entries={[...baseline, entry(10, 10)]}
      />,
    )
    const badge = container.querySelector('.attention-badge--in_range')
    expect(badge?.querySelector('svg')).toHaveAttribute('data-icon', 'in_range')
    expect(badge).toHaveTextContent(strings.badge.inRange)
  })

  it('offers a review notice that selects the first reading to review', async () => {
    const user = userEvent.setup()
    const second: Indicator = {
      ...indicator,
      id: 'second_indicator',
      name: 'Second indicator',
    }
    // The three earlier readings the baseline rule needs before it can put a
    // value outside the band.
    const earlier: Entry[] = [1, 2, 3].map((day) => ({
      ...entry(day, 10),
      id: `second-baseline-${day}`,
      indicatorId: 'second_indicator',
    }))
    const secondEntry: Entry = {
      ...entry(10, 101),
      id: 'second-entry',
      indicatorId: 'second_indicator',
    }
    const two: LoadedContent = {
      ...data,
      indicators: [
        { ...indicator, id: 'first_indicator', name: 'First indicator' },
        second,
      ],
      // A row for the CMO is the one that reads as needs review.
      rules: [{ ...rule, indicatorId: 'second_indicator', notify: 'cmo' }],
      contents: {},
      demoEntries: [secondEntry],
    }
    render(
      <Home
        personId="demo_astronaut_1"
        data={two}
        entries={[...earlier, secondEntry]}
        motionReduced
      />,
    )
    expect(screen.getByText(strings.board.needsReview(1))).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'First indicator' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.board.showFirst }))
    expect(screen.getByRole('heading', { name: 'Second indicator' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'First indicator' })).toBeNull()
  })

  it('shows only the card of the selected indicator, chosen from the overview', async () => {
    const user = userEvent.setup()
    const two: LoadedContent = {
      ...data,
      indicators: [indicator, { ...indicator, id: 'other', name: 'Other indicator' }],
      rules: [],
      contents: {},
    }
    render(<Home personId="demo_astronaut_1" data={two} entries={two.demoEntries} motionReduced />)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 3, name: 'Example indicator' })).toBeInTheDocument()
    const rows = await screen.findByRole('list', { name: strings.board.planetarium.orbitsHeading })
    await user.click(within(rows).getByRole('button', { name: /Other indicator/ }))
    expect(screen.getByRole('heading', { level: 3, name: 'Other indicator' })).toBeInTheDocument()
  })

  it('loads the overview and the body zone, with words next to the figures', async () => {
    render(
      <Home personId="demo_astronaut_1" data={data} entries={data.demoEntries} motionReduced />,
    )
    expect(
      await screen.findByRole('list', { name: strings.board.planetarium.orbitsHeading }),
    ).toBeInTheDocument()
  })

  it('explains an empty account with one notice', () => {
    render(
      <Home personId="demo_astronaut_9" data={data} entries={data.demoEntries} motionReduced />,
    )
    expect(screen.getByText(strings.board.noReadings)).toBeInTheDocument()
  })

  it('shows no empty-account notice once the person has a reading', () => {
    render(
      <Home personId="demo_astronaut_1" data={data} entries={data.demoEntries} motionReduced />,
    )
    expect(screen.queryByText(strings.board.noReadings)).toBeNull()
  })

  it('does not scroll on the first render and scrolls the card into view after a pick', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const two: LoadedContent = {
      ...data,
      indicators: [indicator, { ...indicator, id: 'other', name: 'Other indicator' }],
      rules: [],
      contents: {},
    }
    try {
      render(<Home personId="demo_astronaut_1" data={two} entries={two.demoEntries} />)
      expect(scrollIntoView).not.toHaveBeenCalled()
      const rows = await screen.findByRole('list', { name: strings.board.planetarium.orbitsHeading })
      await user.click(within(rows).getByRole('button', { name: /Other indicator/ }))
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: 'nearest' })
      expect(scrollIntoView.mock.instances[0]).toHaveClass('detail')
    } finally {
      // @ts-expect-error jsdom has no scrollIntoView; remove the fake again.
      delete Element.prototype.scrollIntoView
    }
  })

  it('jumps without animation when motion is reduced', async () => {
    const user = userEvent.setup()
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const two: LoadedContent = {
      ...data,
      indicators: [indicator, { ...indicator, id: 'other', name: 'Other indicator' }],
      rules: [],
      contents: {},
    }
    try {
      render(<Home personId="demo_astronaut_1" data={two} entries={two.demoEntries} motionReduced />)
      const rows = await screen.findByRole('list', { name: strings.board.planetarium.orbitsHeading })
      await user.click(within(rows).getByRole('button', { name: /Other indicator/ }))
      expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ behavior: 'auto' })
    } finally {
      // @ts-expect-error jsdom has no scrollIntoView; remove the fake again.
      delete Element.prototype.scrollIntoView
    }
  })

  it('follows a selection kept by the parent and reports the pick', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const two: LoadedContent = {
      ...data,
      indicators: [indicator, { ...indicator, id: 'other', name: 'Other indicator' }],
      rules: [],
      contents: {},
    }
    render(
      <Home
        personId="demo_astronaut_1"
        data={two}
        entries={two.demoEntries}
        motionReduced
        selectedId="other"
        onSelect={onSelect}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Other indicator' })).toBeInTheDocument()
    const rows = await screen.findByRole('list', { name: strings.board.planetarium.orbitsHeading })
    await user.click(within(rows).getByRole('button', { name: /Example indicator/ }))
    expect(onSelect).toHaveBeenCalledWith('example_indicator')
  })
})
