import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Indicator } from '../domain/types'
import { LocalEntryStore } from '../data/entryStore'
import ReactionCheck from './ReactionCheck'
import {
  REACTION_TRIALS,
  REACTION_WAIT_MIN_MS,
} from './constants'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from './ids'
import { reactionStrings } from './strings'

const indicator = (
  id: string,
  name: string,
  unit: string,
): Indicator => ({
  id,
  name,
  unit,
  direction: 'both',
  measuredOnBoard: 'reaction check',
  hazards: [],
  minSpread: 1,
  sources: [],
})

const indicators = [
  indicator(REACTION_MEDIAN_ID, 'Median reaction time', 'ms'),
  indicator(REACTION_LAPSES_ID, 'Lapses', 'lapses'),
]

// A store in memory: the same class the app uses, so the test sees the entries
// and the outbox the screens see (REQ-28).
function memoryStore(): LocalEntryStore {
  let raw: string | null = null
  return new LocalEntryStore({
    storage: {
      getItem: () => raw,
      setItem: (_key, value) => {
        raw = value
      },
    },
  })
}

describe('ReactionCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // A fixed wall clock: the mission day and the reading context of the two
    // saved entries come from it.
    vi.setSystemTime(new Date(2026, 10, 14, 14, 30))
    // The shortest wait every time, so a test advances a known number of ms.
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // The measurement clock: performance.now() in the app, a number the test
  // raises next to the fake timers here.
  let now = 0
  const clock = () => now
  function advance(ms: number) {
    now += ms
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  function draw(store: LocalEntryStore, serverConfigured = false) {
    return render(
      <ReactionCheck
        store={store}
        personId="demo_astronaut_1"
        indicators={indicators}
        entries={[]}
        serverConfigured={serverConfigured}
        clock={clock}
      />,
    )
  }

  const area = () =>
    screen.getByRole('group', { name: reactionStrings.areaLabel })

  it('is not there while Phys has not added the two indicators', () => {
    const store = memoryStore()
    const { container } = render(
      <ReactionCheck
        store={store}
        personId="demo_astronaut_1"
        indicators={[indicator(REACTION_MEDIAN_ID, 'Median reaction time', 'ms')]}
        entries={[]}
        clock={clock}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('is skipped in one action, and nothing is saved', () => {
    const store = memoryStore()
    const { container } = draw(store)
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.skip }),
    )
    expect(container).toBeEmptyDOMElement()
    expect(store.list()).toEqual([])
  })

  it('starts light, counts a false start and saves the median and the lapses', () => {
    const store = memoryStore()
    draw(store)
    expect(
      screen.getByRole('radio', { name: reactionStrings.light }),
    ).toBeChecked()

    now = 0
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.start }),
    )
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')
    expect(screen.getByText(reactionStrings.trial(1, REACTION_TRIALS))).toBeVisible()

    // Space before the stimulus: a false start, and the same trial goes on.
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText(reactionStrings.tooEarly)).toBeVisible()
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')

    advance(REACTION_WAIT_MIN_MS)
    expect(area()).toHaveAttribute('data-reaction-state', 'stimulus')
    expect(
      area().querySelector('.reaction__light'),
    ).not.toBeNull()
    expect(screen.getByText(reactionStrings.now)).toBeVisible()

    advance(100)
    fireEvent.keyDown(window, { key: ' ' })
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')

    // One trial late enough to be a lapse, then the rest on time.
    advance(REACTION_WAIT_MIN_MS)
    advance(600)
    fireEvent.keyDown(window, { key: ' ' })

    for (let trial = 2; trial < REACTION_TRIALS; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(300)
      fireEvent.keyDown(window, { key: ' ' })
    }

    expect(
      screen.getByText(reactionStrings.result(300, 1)),
    ).toBeVisible()
    expect(
      screen.getByText(reactionStrings.falseStarts(1)),
    ).toBeVisible()
    expect(
      screen.getByText(reactionStrings.saved(2, false)),
    ).toBeVisible()

    // Two entries, both waiting for the outbox: nothing here needs a server.
    const saved = store.list()
    expect(saved.map((entry) => entry.indicatorId)).toEqual([
      REACTION_MEDIAN_ID,
      REACTION_LAPSES_ID,
    ])
    expect(saved.map((entry) => entry.value)).toEqual([300, 1])
    expect(saved.map((entry) => entry.unit)).toEqual(['ms', 'lapses'])
    for (const entry of saved) {
      expect(entry.personId).toBe('demo_astronaut_1')
      expect(entry.missionDay).toBe(1)
      expect(entry.time).toBe('14:30')
      expect(entry.context).toBe('rest')
    }
    expect(store.pending()).toHaveLength(2)
  })

  it('answers a tap on the test area too, and announces the sound cue', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(screen.getByRole('radio', { name: reactionStrings.sound }))
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.start }),
    )
    // jsdom has no Web Audio: the screen says so and the ring is the cue.
    expect(screen.getByText(reactionStrings.noTone)).toBeVisible()

    advance(REACTION_WAIT_MIN_MS)
    expect(area().querySelector('.reaction__ring')).not.toBeNull()
    expect(screen.getByText(reactionStrings.cue.sound)).toBeVisible()

    advance(250)
    fireEvent.click(area())
    advance(REACTION_WAIT_MIN_MS)
    advance(250)
    fireEvent.click(area())
    expect(screen.getByText(reactionStrings.trial(3, REACTION_TRIALS))).toBeVisible()
  })

  it('stops with Escape and saves nothing when no trial was answered', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.start }),
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText(reactionStrings.stoppedNothing)).toBeVisible()
    expect(store.list()).toEqual([])
  })

  it('offers another run after the result', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.start }),
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(
      screen.getByRole('button', { name: reactionStrings.again }),
    )
    expect(
      screen.getByRole('button', { name: reactionStrings.start }),
    ).toBeVisible()
  })
})
