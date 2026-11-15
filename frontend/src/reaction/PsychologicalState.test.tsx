import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Indicator } from '../domain/types'
import type { Condition, ConditionsClient } from './conditionsClient'
import { PSYCHOLOGICAL_CONDITION_ID } from './ids'
import PsychologicalState from './PsychologicalState'
import { stateStrings } from './strings'

const indicators: Indicator[] = [
  {
    id: 'reaction_median_ms',
    name: 'Median reaction time',
    unit: 'ms',
    direction: 'higher',
    measuredOnBoard: 'reaction check',
    hazards: [],
    minSpread: 1,
    sources: [],
  },
  {
    id: 'sleep_h',
    name: 'Sleep duration',
    unit: 'h',
    direction: 'lower',
    measuredOnBoard: 'sleep log',
    hazards: [],
    minSpread: 0.5,
    sources: [],
  },
]

const condition: Condition = {
  id: PSYCHOLOGICAL_CONDITION_ID,
  name: 'How the day went',
  score: 0.5,
  label: 'possible',
  signals: [
    {
      indicatorId: 'reaction_median_ms',
      side: 'above',
      contribution: 1,
      value: 480,
    },
    { indicatorId: 'sleep_h', side: 'below', contribution: null, value: null },
  ],
  source: 'Assumption',
}

function fakeClient(
  conditions: Condition[] | null,
  configured = true,
): ConditionsClient & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    isConfigured: () => configured,
    fetchConditions: (personId: string) => {
      calls.push(personId)
      return Promise.resolve(conditions)
    },
  }
}

describe('PsychologicalState', () => {
  it('shows the condition as an evidence score with its signals', async () => {
    const client = fakeClient([condition])
    render(
      <PsychologicalState
        personId="demo_astronaut_1"
        indicators={indicators}
        client={client}
      />,
    )

    expect(
      await screen.findByRole('heading', { name: stateStrings.heading }),
    ).toBeVisible()
    expect(screen.getByText('How the day went')).toBeVisible()
    expect(screen.getByText(stateStrings.label.possible)).toBeVisible()
    // The signal that points at it is named in plain words; the one without a
    // reading is said to be missing, never counted as a zero.
    expect(
      screen.getByText(stateStrings.pointing(['Median reaction time'])),
    ).toBeVisible()
    expect(screen.getByText(stateStrings.missing(['Sleep duration']))).toBeVisible()
    // No percentage and no claim: the score is a number of 0 to 1, and the
    // flight surgeon confirms.
    expect(screen.getByText(stateStrings.evidence(0.5))).toBeVisible()
    expect(screen.getByText(stateStrings.confirms)).toBeVisible()
    expect(screen.queryByText(/%/)).toBeNull()
    expect(client.calls).toEqual(['demo_astronaut_1'])
  })

  it('shows nothing while the route does not answer 200', async () => {
    const { container } = render(
      <PsychologicalState
        personId="demo_astronaut_1"
        indicators={indicators}
        client={fakeClient(null)}
      />,
    )
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('shows nothing when the file has no neuro-behavioural condition yet', async () => {
    const other: Condition = {
      ...condition,
      id: 'orthostatic_intolerance',
      name: 'Orthostatic intolerance',
    }
    const { container } = render(
      <PsychologicalState
        personId="demo_astronaut_1"
        indicators={indicators}
        client={fakeClient([other])}
      />,
    )
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('asks nothing without a server', () => {
    const client = fakeClient([condition], false)
    const { container } = render(
      <PsychologicalState
        personId="demo_astronaut_1"
        indicators={indicators}
        client={client}
      />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(client.calls).toEqual([])
  })

  it('says no data with fewer than two usable signals, without a score', async () => {
    const noData: Condition = {
      ...condition,
      score: null,
      label: 'no_data',
      signals: [
        {
          indicatorId: 'reaction_median_ms',
          side: 'above',
          contribution: null,
          value: null,
        },
      ],
    }
    render(
      <PsychologicalState
        personId="demo_astronaut_1"
        indicators={indicators}
        client={fakeClient([noData])}
      />,
    )
    expect(await screen.findByText(stateStrings.label.no_data)).toBeVisible()
    expect(screen.queryByText(/^Evidence/)).toBeNull()
  })
})
