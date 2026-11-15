import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Indicator } from '../domain/types'
import { LocalEntryStore } from '../data/entryStore'
import ReactionCheck from './ReactionCheck'
import {
  REACTION_DEMO_DURATION_MS,
  REACTION_DURATION_MS,
  REACTION_MIN_VALID_MS,
  REACTION_WAIT_MIN_MS,
  reactionLength,
} from './constants'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from './ids'
import { reactionStrings } from './strings'

const indicator = (id: string, name: string, unit: string): Indicator => ({
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

describe('reactionLength', () => {
  it('is 3 minutes, and the demo length only on the demo path', () => {
    expect(reactionLength('')).toBe(REACTION_DURATION_MS)
    expect(reactionLength('?team=1')).toBe(REACTION_DURATION_MS)
    expect(reactionLength('?reaction=demo')).toBe(REACTION_DEMO_DURATION_MS)
  })
})

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

  function draw(
    store: LocalEntryStore,
    { serverConfigured = false, search = '?reaction=demo' } = {},
  ) {
    return render(
      <ReactionCheck
        store={store}
        personId="demo_astronaut_1"
        indicators={indicators}
        entries={[]}
        serverConfigured={serverConfigured}
        clock={clock}
        search={search}
      />,
    )
  }

  const area = () => screen.getByRole('group', { name: reactionStrings.areaLabel })

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
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.skip }))
    expect(container).toBeEmptyDOMElement()
    expect(store.list()).toEqual([])
  })

  it('starts light, and an answer before the stimulus is a false start', () => {
    const store = memoryStore()
    draw(store)
    expect(screen.getByRole('radio', { name: reactionStrings.light })).toBeChecked()
    expect(screen.getByText(reactionStrings.demoLength)).toBeVisible()

    now = 0
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')
    expect(screen.getByText(reactionStrings.trial(1))).toBeVisible()
    // The time left is in the label of the bar, not only in its length.
    expect(screen.getByRole('progressbar', { name: reactionStrings.timeLeft })).toHaveAttribute(
      'aria-valuetext',
      reactionStrings.hasLeft(REACTION_DEMO_DURATION_MS / 1000),
    )

    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText(reactionStrings.tooEarly)).toBeVisible()
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')
    expect(store.list()).toEqual([])
  })

  it('counts an answer under 100 ms as a false start too', () => {
    draw(memoryStore())
    now = 0
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    advance(REACTION_WAIT_MIN_MS)
    expect(area()).toHaveAttribute('data-reaction-state', 'stimulus')
    advance(REACTION_MIN_VALID_MS - 50)
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText(reactionStrings.tooEarly)).toBeVisible()
    expect(screen.getByText(reactionStrings.trial(1))).toBeVisible()
  })

  it('ends at the demo length, shows the result, and saves nothing', () => {
    const store = memoryStore()
    draw(store)
    now = 0
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))

    // One answer on time.
    advance(REACTION_WAIT_MIN_MS)
    advance(300)
    fireEvent.keyDown(window, { key: ' ' })

    // One answer past the cut-off: a lapse.
    advance(REACTION_WAIT_MIN_MS)
    advance(600)
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText(reactionStrings.trial(3))).toBeVisible()

    // The rest of the demo length: each stimulus after the shortest wait, each
    // answer 300 ms later. The last one lands after the deadline and closes the
    // run, so a trial in progress is not cut off.
    for (let trial = 0; trial < 11; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(300)
      fireEvent.keyDown(window, { key: ' ' })
    }
    expect(screen.queryByRole('group', { name: reactionStrings.areaLabel })).toBeNull()

    expect(screen.getByText(reactionStrings.result(300, 1))).toBeVisible()
    expect(screen.getByText(reactionStrings.falseStarts(0))).toBeVisible()
    // A demo run is a demonstration of the screen, not a check the crew took:
    // the result says so and the store stays as it was (T-76).
    expect(screen.getByText(reactionStrings.demoNotSaved)).toBeVisible()
    expect(screen.queryByText(reactionStrings.saved(2, false))).toBeNull()
    expect(store.list()).toEqual([])
    expect(store.pending()).toEqual([])
  })

  it('takes a tap on the test area, and shows the sound cue too', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(screen.getByRole('radio', { name: reactionStrings.sound }))
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    // jsdom has no Web Audio: the screen says so and the ring is the cue.
    expect(screen.getByText(reactionStrings.noTone)).toBeVisible()

    advance(REACTION_WAIT_MIN_MS)
    expect(area().querySelector('.reaction__ring')).not.toBeNull()
    expect(screen.getByText(reactionStrings.cue.sound)).toBeVisible()
    expect(screen.getByText(reactionStrings.now)).toBeVisible()

    advance(250)
    fireEvent.click(area())
    expect(screen.getByText(reactionStrings.trial(2))).toBeVisible()
  })

  it('stops with Escape and throws the run away', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    advance(REACTION_WAIT_MIN_MS)
    advance(250)
    fireEvent.keyDown(window, { key: ' ' })

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText(reactionStrings.stopped)).toBeVisible()
    expect(store.list()).toEqual([])
  })

  it('offers another run after the result', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.again }))
    expect(screen.getByRole('button', { name: reactionStrings.start })).toBeVisible()
    expect(screen.getByText(reactionStrings.demoLength)).toBeVisible()
  })

  it('runs the real length without the demo parameter, and saves the two entries', () => {
    const store = memoryStore()
    draw(store, { search: '' })
    expect(screen.queryByText(reactionStrings.demoLength)).toBeNull()
    now = 0
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    expect(
      screen.getByRole('progressbar', { name: reactionStrings.timeLeft }),
    ).toHaveAttribute('aria-valuemax', String(REACTION_DURATION_MS))

    // The shortest wait and an answer on time, until the 3 minutes run out.
    for (let trial = 0; trial < 100; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(300)
      fireEvent.keyDown(window, { key: ' ' })
    }
    expect(screen.queryByRole('group', { name: reactionStrings.areaLabel })).toBeNull()

    expect(screen.getByText(reactionStrings.result(300, 0))).toBeVisible()
    expect(screen.getByText(reactionStrings.saved(2, false))).toBeVisible()

    // Two entries, both waiting for the outbox: nothing here needs a server.
    const saved = store.list()
    expect(saved.map((entry) => entry.indicatorId)).toEqual([
      REACTION_MEDIAN_ID,
      REACTION_LAPSES_ID,
    ])
    expect(saved.map((entry) => entry.value)).toEqual([300, 0])
    expect(saved.map((entry) => entry.unit)).toEqual(['ms', 'lapses'])
    for (const entry of saved) {
      expect(entry.personId).toBe('demo_astronaut_1')
      expect(entry.missionDay).toBe(1)
      // The reading is stamped when the 3 minutes are up, 14:30 plus 3 minutes.
      expect(entry.time).toBe('14:33')
      expect(entry.context).toBe('rest')
    }
    expect(store.pending()).toHaveLength(2)
  })
})
