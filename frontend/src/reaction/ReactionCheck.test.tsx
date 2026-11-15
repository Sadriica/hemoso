import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Indicator } from '../domain/types'
import { LocalEntryStore } from '../data/entryStore'
import ReactionCheck from './ReactionCheck'
import {
  REACTION_DEMO_DURATION_MS,
  REACTION_DURATION_MS,
  REACTION_MIN_SAVE_TRIALS,
  REACTION_MIN_VALID_MS,
  REACTION_NONTARGET_MS,
  REACTION_SIZES,
  REACTION_TRIAL_WINDOW_MS,
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
  it('is 50 seconds, and the demo length only on the demo path', () => {
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
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 14, 14, 30)))
    // The shortest wait every time, so a test advances a known number of ms.
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // The frame that draws a light is stamped by its own test; elsewhere the
    // frame callback never runs, so the timer's stamp is the one measured.
    vi.stubGlobal('requestAnimationFrame', () => 0)
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
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
    { serverConfigured = false, search = '?reaction=demo', colourTargets = false } = {},
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
        colourTargets={colourTargets}
      />,
    )
  }

  const area = () => screen.getByRole('group', { name: reactionStrings.areaLabel })
  // The three figures of the result, as one string: "Median300 msLapses1Errors0".
  const figures = () =>
    document.querySelector('[data-reaction-result]')?.textContent ?? ''
  const START = () =>
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
  // One answered trial: the shortest wait, then an answer 300 ms later.
  function answerTrials(count: number, latency = 300) {
    for (let trial = 0; trial < count; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(latency)
      fireEvent.keyDown(window, { key: ' ' })
    }
  }

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

    expect(figures()).toBe('Median300 msLapses1')
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
    // jsdom has no Web Audio: the screen says so.
    expect(screen.getByText(reactionStrings.noTone)).toBeVisible()

    // The stage is the same before and after the tone starts: no figure, no
    // text change, and no live region that would announce the tone.
    const before = area().innerHTML
    advance(REACTION_WAIT_MIN_MS)
    expect(area()).toHaveAttribute('data-reaction-state', 'stimulus')
    expect(area().innerHTML).toBe(before)
    expect(area().querySelector('.reaction__stimulus')).toBeNull()
    expect(area().querySelector('[role="status"], [aria-live]')).toBeNull()
    expect(screen.getByText(reactionStrings.listen)).toBeVisible()

    advance(250)
    fireEvent.click(area())
    expect(screen.getByText(reactionStrings.trial(2))).toBeVisible()
  })

  it('stops with Escape and saves nothing under the minimum of valid trials', () => {
    const store = memoryStore()
    draw(store, { search: '' })
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS - 1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText(reactionStrings.tooFew)).toBeVisible()
    expect(store.list()).toEqual([])
  })

  it('stops with Escape and keeps the median and the lapses of 3 valid trials', () => {
    const store = memoryStore()
    draw(store, { search: '' })
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).toBe('Median300 msLapses0')
    expect(screen.getByText(reactionStrings.saved(2, false))).toBeVisible()
    expect(store.list().map((entry) => entry.value)).toEqual([300, 0])
    expect(store.pending()).toHaveLength(2)
  })

  it('keeps what was answered when the screen is left, once, also under StrictMode', () => {
    const store = memoryStore()
    const { unmount } = render(
      <StrictMode>
        <ReactionCheck
          store={store}
          personId="demo_astronaut_1"
          indicators={indicators}
          entries={[]}
          clock={clock}
          search=""
        />
      </StrictMode>,
    )
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS)
    expect(store.list()).toEqual([])
    unmount()
    expect(store.list().map((entry) => entry.indicatorId)).toEqual([
      REACTION_MEDIAN_ID,
      REACTION_LAPSES_ID,
    ])
  })

  it('writes nothing twice: a run stopped and then left is saved once', () => {
    const store = memoryStore()
    const { unmount } = draw(store, { search: '' })
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS)
    fireEvent.keyDown(window, { key: 'Escape' })
    unmount()
    expect(store.list()).toHaveLength(2)
  })

  it('leaving a run with fewer than the minimum saves nothing', () => {
    const store = memoryStore()
    const { unmount } = draw(store, { search: '' })
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS - 1)
    unmount()
    expect(store.list()).toEqual([])
  })

  it('saves nothing from a demo run, stopped or left', () => {
    const store = memoryStore()
    const first = draw(store)
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS + 2)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText(reactionStrings.demoNotSaved)).toBeVisible()
    first.unmount()

    const second = draw(store)
    START()
    answerTrials(REACTION_MIN_SAVE_TRIALS + 2)
    second.unmount()
    expect(store.list()).toEqual([])
    expect(store.pending()).toEqual([])
  })

  it('counts an answer to a non-green light as an error, outside the median', () => {
    const store = memoryStore()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    draw(store, { search: '', colourTargets: true })
    START()
    // The first stimulus of a run is the white circle, a target.
    advance(REACTION_WAIT_MIN_MS)
    expect(screen.getByRole('img', { name: reactionStrings.kind.white })).toBeVisible()
    advance(300)
    fireEvent.keyDown(window, { key: ' ' })

    // The next draw is a non-green shape (the wait was armed with the shortest
    // draw; the shape is picked when it fires).
    random.mockReturnValue(0.95)
    advance(REACTION_WAIT_MIN_MS)
    random.mockReturnValue(0)
    expect(area()).toHaveAttribute('data-reaction-target', 'false')
    // A non-target is the same lamp in another colour, without the green ring.
    expect(screen.getByRole('img', { name: reactionStrings.kind.blue })).toHaveClass(
      'reaction__lamp--blue',
    )
    advance(200)
    fireEvent.keyDown(window, { key: ' ' })
    expect(screen.getByText(reactionStrings.wrong)).toBeVisible()
    // Not a trial: the trial number did not move.
    expect(screen.getByText(reactionStrings.trial(2))).toBeVisible()

    // A non-green that nobody answers clears by itself: no lapse, no trial.
    random.mockReturnValue(0.95)
    advance(REACTION_WAIT_MIN_MS)
    random.mockReturnValue(0)
    expect(area()).toHaveAttribute('data-reaction-target', 'false')
    advance(REACTION_NONTARGET_MS)
    expect(area()).toHaveAttribute('data-reaction-state', 'waiting')
    expect(screen.getByText(reactionStrings.trial(2))).toBeVisible()

    answerTrials(REACTION_MIN_SAVE_TRIALS - 1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).toBe('Median300 msLapses0Errors1')
    // Errors are shown, not stored: only the two indicators are written.
    expect(store.list().map((entry) => entry.value)).toEqual([300, 0])
  })

  it('without colour targets every light is a target, with no errors figure', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const store = memoryStore()
    draw(store, { search: '' })
    expect(screen.getByText(reactionStrings.introLight)).toBeVisible()
    START()
    expect(screen.getByText(reactionStrings.ruleLight)).toBeVisible()
    answerTrials(1)
    // The same white lamp in another size, still a target.
    random.mockReturnValue(0.99)
    advance(REACTION_WAIT_MIN_MS)
    random.mockReturnValue(0)
    expect(area()).toHaveAttribute('data-reaction-target', 'true')
    const lamp = screen.getByRole('img', { name: reactionStrings.lamp })
    expect(lamp).toHaveClass('reaction__lamp--white')
    expect(REACTION_SIZES).toContain(1)
    advance(200)
    fireEvent.keyDown(window, { key: ' ' })
    // The answer is a reaction, not an error.
    expect(screen.getByText(reactionStrings.trial(3))).toBeVisible()
    answerTrials(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).not.toContain(reactionStrings.errorsLabel)
    expect(figures()).toContain('Median')
    expect(store.list().map((entry) => entry.value)).toEqual([300, 0])
  })

  it('draws the green target as a lamp with a ring and a label', () => {
    draw(memoryStore(), { search: '', colourTargets: true })
    START()
    answerTrials(1)
    advance(REACTION_WAIT_MIN_MS)
    const green = screen.getByRole('img', { name: reactionStrings.kind.green })
    expect(green).toHaveClass('reaction__lamp--green')
    expect(area()).toHaveAttribute('data-reaction-target', 'true')
    // The instruction names the colour, and stays on screen.
    expect(screen.getByText(reactionStrings.ruleLightColour)).toBeVisible()
    expect(reactionStrings.introLightColour).toContain('only the green light')
  })

  it('times a light from the frame that draws it, not from the timer', () => {
    let frame: FrameRequestCallback | null = null
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frame = callback
      return 1
    })
    const store = memoryStore()
    draw(store, { search: '' })
    now = 0
    START()
    advance(REACTION_WAIT_MIN_MS)
    expect(frame).not.toBeNull()
    // The lamp reaches the screen 40 ms after the timer fired.
    now += 40
    act(() => frame?.(now))
    // 380 ms after the timer, 340 ms after the lamp was drawn: under 355 ms.
    advance(340)
    fireEvent.keyDown(window, { key: ' ' })
    vi.stubGlobal('requestAnimationFrame', () => 0)
    answerTrials(REACTION_MIN_SAVE_TRIALS - 1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).toBe('Median300 msLapses0')
  })

  it('keeps a late answer in the median and still counts it as a lapse', () => {
    draw(memoryStore(), { search: '' })
    START()
    answerTrials(1, 300)
    answerTrials(1, 500)
    answerTrials(1, 700)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).toBe('Median500 msLapses2')
  })

  it('never says "none" when every trial timed out', () => {
    draw(memoryStore(), { search: '' })
    START()
    for (let trial = 0; trial < 3; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(REACTION_TRIAL_WINDOW_MS)
    }
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(figures()).toContain('No answers')
    expect(screen.getByText(reactionStrings.noAnswers)).toBeVisible()
    expect(figures().toLowerCase()).not.toContain('none')
  })

  it('offers another run after the result', () => {
    const store = memoryStore()
    draw(store)
    fireEvent.click(screen.getByRole('button', { name: reactionStrings.start }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText(reactionStrings.tooFew)).toBeVisible()
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

    // The shortest wait and an answer on time, until the 50 seconds run out.
    for (let trial = 0; trial < 100; trial += 1) {
      advance(REACTION_WAIT_MIN_MS)
      advance(300)
      fireEvent.keyDown(window, { key: ' ' })
    }
    expect(screen.queryByRole('group', { name: reactionStrings.areaLabel })).toBeNull()

    expect(figures()).toBe('Median300 msLapses0')
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
      // The reading is stamped when the 50 seconds are up: 14:30 plus 50 s.
      expect(entry.time).toBe('14:30')
      expect(entry.context).toBe('rest')
    }
    expect(store.pending()).toHaveLength(2)
  })
})
