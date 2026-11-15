import { describe, expect, it } from 'vitest'
import { REACTION_RESPONSE_WINDOW_MS, REACTION_WAIT_MAX_MS } from './constants'
import {
  initialReactionState,
  median,
  randomWait,
  reactionReducer,
  summarize,
  type ReactionState,
} from './timing'

// The timing logic with a fake clock: every moment is a number a test passes
// in, so these tests are instant and the arithmetic is exact.
function start(modality: 'light' | 'sound' = 'light', total = 3): ReactionState {
  return reactionReducer(initialReactionState(), {
    type: 'start',
    modality,
    total,
  })
}

// One finished trial: the stimulus at `at`, the answer `latency` ms later.
function trial(
  state: ReactionState,
  at: number,
  latency: number,
  type: 'answer' | 'timeout' = 'answer',
): ReactionState {
  const stimulus = reactionReducer(state, { type: 'stimulus', at })
  return reactionReducer(stimulus, { type, at: at + latency })
}

describe('median', () => {
  it('is null with no value', () => {
    expect(median([])).toBeNull()
  })

  it('is the middle value of an odd count', () => {
    expect(median([400, 300, 500])).toBe(400)
    expect(median([312])).toBe(312)
  })

  it('is the mean of the two middle values of an even count, in whole ms', () => {
    expect(median([400, 300])).toBe(350)
    expect(median([300, 200, 100, 400])).toBe(250)
    expect(median([300.4, 300.8])).toBe(301)
  })

  it('does not touch the array it is given', () => {
    const values = [400, 100, 300]
    median(values)
    expect(values).toEqual([400, 100, 300])
  })
})

describe('reactionReducer', () => {
  it('starts a run with a fresh pre-stimulus wait', () => {
    const state = start('sound')
    expect(state.phase).toBe('waiting')
    expect(state.modality).toBe('sound')
    expect(state.done).toBe(0)
    expect(state.waitToken).toBe(1)
  })

  it('counts a reaction from the stimulus to the answer', () => {
    const state = trial(start(), 2000, 312)
    expect(state.reactions).toEqual([312])
    expect(state.lapses).toBe(0)
    expect(state.done).toBe(1)
    expect(state.tooEarly).toBe(false)
  })

  it('counts an answer before the stimulus as a false start, not as a trial', () => {
    const state = reactionReducer(start(), { type: 'answer', at: 900 })
    expect(state.falseStarts).toBe(1)
    expect(state.done).toBe(0)
    expect(state.phase).toBe('waiting')
    expect(state.tooEarly).toBe(true)
    // The wait starts again, so the component arms a new one.
    expect(state.waitToken).toBe(2)
  })

  it('clears the "too early" message when the next stimulus appears', () => {
    const early = reactionReducer(start(), { type: 'answer', at: 900 })
    const state = reactionReducer(early, { type: 'stimulus', at: 2400 })
    expect(state.phase).toBe('stimulus')
    expect(state.tooEarly).toBe(false)
  })

  it('counts an answer after the cut-off as a lapse', () => {
    const state = trial(start(), 2000, 501)
    expect(state.lapses).toBe(1)
    expect(state.reactions).toEqual([])
    expect(state.done).toBe(1)
  })

  it('keeps waiting for an answer until the end of the window', () => {
    const stimulus = reactionReducer(start(), { type: 'stimulus', at: 2000 })
    const early = reactionReducer(stimulus, {
      type: 'timeout',
      at: 2000 + REACTION_RESPONSE_WINDOW_MS - 1,
    })
    expect(early.phase).toBe('stimulus')

    const state = reactionReducer(early, {
      type: 'timeout',
      at: 2000 + REACTION_RESPONSE_WINDOW_MS,
    })
    expect(state.lapses).toBe(1)
    expect(state.done).toBe(1)
    expect(state.phase).toBe('waiting')
  })

  it('counts every early answer as a false start', () => {
    const state = reactionReducer(start(), { type: 'answer', at: 500 })
    const again = reactionReducer(state, { type: 'answer', at: 600 })
    expect(again.falseStarts).toBe(2)
    expect(again.done).toBe(0)
  })

  it('ignores a second stimulus timer that fires after the wait was restarted', () => {
    const stimulus = reactionReducer(start(), { type: 'stimulus', at: 2000 })
    const late = reactionReducer(stimulus, { type: 'stimulus', at: 2100 })
    expect(late.stimulusAt).toBe(2000)
  })

  it('finishes after the last trial and keeps nothing armed', () => {
    let state = start('light', 2)
    state = trial(state, 2000, 300)
    expect(state.phase).toBe('waiting')
    state = trial(state, 6000, 300)
    expect(state.phase).toBe('finished')
    expect(summarize(state)).toEqual({
      medianMs: 300,
      lapses: 0,
      falseStarts: 0,
      trials: 2,
    })
  })

  it('stops mid-run and keeps what was measured', () => {
    const one = trial(start('light', 5), 2000, 280)
    const stopped = reactionReducer(one, { type: 'stop' })
    expect(stopped.phase).toBe('finished')
    expect(stopped.stopped).toBe(true)
    expect(stopped.reactions).toEqual([280])
    expect(summarize(stopped).trials).toBe(1)
  })

  it('ignores stop and stimulus outside a run', () => {
    const idle = initialReactionState()
    expect(reactionReducer(idle, { type: 'stop' })).toBe(idle)
    expect(reactionReducer(idle, { type: 'stimulus', at: 1 })).toBe(idle)
  })

  it('resets to the chosen modality, keeping the length', () => {
    const state = reactionReducer(start('sound', 5), {
      type: 'reset',
      modality: 'light',
    })
    expect(state.phase).toBe('idle')
    expect(state.total).toBe(5)
    expect(state.modality).toBe('light')
  })
})

describe('summarize', () => {
  it('reports a median reaction, the lapses and the early answers', () => {
    let state = start('light', 10)
    state = trial(state, 2000, 250)
    state = trial(state, 6000, 400)
    state = trial(state, 10000, 900)
    state = reactionReducer(state, { type: 'answer', at: 12000 })
    expect(summarize(state)).toEqual({
      medianMs: 325,
      lapses: 1,
      falseStarts: 1,
      trials: 3,
    })
  })

  it('has no median when nobody answered in time', () => {
    let state = start('light', 2)
    state = trial(state, 2000, REACTION_RESPONSE_WINDOW_MS, 'timeout')
    state = trial(state, 8000, REACTION_RESPONSE_WINDOW_MS, 'timeout')
    expect(summarize(state)).toEqual({
      medianMs: null,
      lapses: 2,
      falseStarts: 0,
      trials: 2,
    })
  })
})

describe('randomWait', () => {
  it('stays inside the range, whatever the random number is', () => {
    expect(randomWait(() => 0)).toBe(2000)
    expect(randomWait(() => 1)).toBe(REACTION_WAIT_MAX_MS)
    const middle = randomWait(() => 0.5)
    expect(middle).toBeGreaterThan(2000)
    expect(middle).toBeLessThan(REACTION_WAIT_MAX_MS)
  })
})
