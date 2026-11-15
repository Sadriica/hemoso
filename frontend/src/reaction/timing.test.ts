import { describe, expect, it } from 'vitest'
import {
  REACTION_LAPSE_CUTOFF_MS,
  REACTION_MIN_VALID_MS,
  REACTION_TRIAL_WINDOW_MS,
  REACTION_WAIT_MAX_MS,
  REACTION_WAIT_MIN_MS,
} from './constants'
import {
  elapsedMs,
  initialReactionState,
  median,
  randomWait,
  reactionReducer,
  remainingMs,
  summarize,
  type ReactionState,
} from './timing'

// The timing logic with a fake clock: every moment is a number a test passes
// in, so these tests are instant and the arithmetic is exact.

const LENGTH = 30_000

// A run of a known length, started at `at`.
function start(modality: 'light' | 'sound' = 'light', at = 0): ReactionState {
  const idle = initialReactionState(modality, LENGTH)
  return reactionReducer(idle, {
    type: 'start',
    modality,
    at,
    durationMs: LENGTH,
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
  it('starts a run with a fresh pre-stimulus wait and a deadline', () => {
    const state = start('sound', 5000)
    expect(state.phase).toBe('waiting')
    expect(state.modality).toBe('sound')
    expect(state.done).toBe(0)
    expect(state.startedAt).toBe(5000)
    expect(state.endsAt).toBe(5000 + LENGTH)
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
    expect(state.stimulusAt).toBeNull()
    // The wait starts again, so the component arms a new one.
    expect(state.waitToken).toBe(2)
  })

  it('counts an answer under the minimum as a false start, not as a fast reaction', () => {
    const stimulus = reactionReducer(start(), { type: 'stimulus', at: 2000 })
    const state = reactionReducer(stimulus, {
      type: 'answer',
      at: 2000 + REACTION_MIN_VALID_MS - 1,
    })
    expect(state.falseStarts).toBe(1)
    expect(state.done).toBe(0)
    expect(state.reactions).toEqual([])
    expect(state.phase).toBe('waiting')
    expect(state.tooEarly).toBe(true)
    expect(state.waitToken).toBe(2)
  })

  it('takes an answer at the minimum as a valid trial', () => {
    const state = trial(start(), 2000, REACTION_MIN_VALID_MS)
    expect(state.reactions).toEqual([REACTION_MIN_VALID_MS])
    expect(state.falseStarts).toBe(0)
  })

  it('clears the "too early" message when the next stimulus appears', () => {
    const early = reactionReducer(start(), { type: 'answer', at: 900 })
    const state = reactionReducer(early, { type: 'stimulus', at: 2400 })
    expect(state.phase).toBe('stimulus')
    expect(state.tooEarly).toBe(false)
  })

  it('counts an answer of the cut-off or more as a lapse', () => {
    const atCut = trial(start(), 2000, REACTION_LAPSE_CUTOFF_MS)
    expect(atCut.lapses).toBe(1)
    expect(atCut.reactions).toEqual([])
    expect(atCut.done).toBe(1)

    const under = trial(start(), 2000, REACTION_LAPSE_CUTOFF_MS - 1)
    expect(under.lapses).toBe(0)
    expect(under.reactions).toEqual([REACTION_LAPSE_CUTOFF_MS - 1])
  })

  it('keeps waiting for an answer until the end of the window', () => {
    const stimulus = reactionReducer(start(), { type: 'stimulus', at: 2000 })
    const early = reactionReducer(stimulus, {
      type: 'timeout',
      at: 2000 + REACTION_TRIAL_WINDOW_MS - 1,
    })
    expect(early.phase).toBe('stimulus')

    const state = reactionReducer(early, {
      type: 'timeout',
      at: 2000 + REACTION_TRIAL_WINDOW_MS,
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

  it('ends when the length is over, keeping the trials already measured', () => {
    let state = start()
    state = trial(state, 2000, 300)
    state = reactionReducer(state, { type: 'tick', at: LENGTH - 1 })
    expect(state.phase).toBe('waiting')

    state = reactionReducer(state, { type: 'tick', at: LENGTH })
    expect(state.phase).toBe('finished')
    expect(state.stopped).toBe(false)
    expect(state.stimulusAt).toBeNull()
    expect(summarize(state)).toEqual({
      medianMs: 300,
      lapses: 0,
      falseStarts: 0,
      trials: 1,
    })
  })

  it('lets a trial in progress finish before it ends', () => {
    const stimulus = reactionReducer(start(), { type: 'stimulus', at: LENGTH - 500 })
    // The length runs out while the stimulus shows: it is not cut off.
    const stillOn = reactionReducer(stimulus, { type: 'tick', at: LENGTH })
    expect(stillOn.phase).toBe('stimulus')
    expect(stillOn.stimulusAt).toBe(LENGTH - 500)

    const state = reactionReducer(stillOn, { type: 'answer', at: LENGTH + 100 })
    expect(state.phase).toBe('finished')
    expect(state.done).toBe(1)
    expect(state.reactions).toEqual([])
    expect(state.lapses).toBe(1)
  })

  it('ends when the answer lands after the length, keeping that trial', () => {
    const state = trial(start(), LENGTH - 300, 300)
    expect(state.phase).toBe('finished')
    expect(state.reactions).toEqual([300])
  })

  it('stops mid-run and keeps what was measured', () => {
    const one = trial(start(), 2000, 280)
    const stopped = reactionReducer(one, { type: 'stop' })
    expect(stopped.phase).toBe('finished')
    expect(stopped.stopped).toBe(true)
    expect(stopped.reactions).toEqual([280])
    expect(summarize(stopped).trials).toBe(1)
  })

  it('ignores stop, tick and stimulus outside a run', () => {
    const idle = initialReactionState()
    expect(reactionReducer(idle, { type: 'stop' })).toBe(idle)
    expect(reactionReducer(idle, { type: 'stimulus', at: 1 })).toBe(idle)
    expect(reactionReducer(idle, { type: 'tick', at: 1 })).toBe(idle)
  })

  it('resets to the chosen modality, keeping the length', () => {
    const state = reactionReducer(start('sound'), {
      type: 'reset',
      modality: 'light',
    })
    expect(state.phase).toBe('idle')
    expect(state.durationMs).toBe(LENGTH)
    expect(state.modality).toBe('light')
    expect(state.endsAt).toBeNull()
  })
})

describe('summarize', () => {
  it('reports the median of the valid trials, the lapses and the early answers', () => {
    let state = start()
    state = trial(state, 2000, 250)
    state = trial(state, 6000, 300)
    state = trial(state, 10000, REACTION_LAPSE_CUTOFF_MS)
    state = reactionReducer(state, { type: 'answer', at: 12000 })
    expect(summarize(state)).toEqual({
      medianMs: 275,
      lapses: 1,
      falseStarts: 1,
      trials: 3,
    })
  })

  it('has no median when nobody answered in time', () => {
    let state = start()
    state = trial(state, 2000, REACTION_TRIAL_WINDOW_MS, 'timeout')
    state = trial(state, 8000, REACTION_TRIAL_WINDOW_MS, 'timeout')
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
    expect(randomWait(() => 0)).toBe(REACTION_WAIT_MIN_MS)
    expect(randomWait(() => 1)).toBe(REACTION_WAIT_MAX_MS)
    expect(randomWait(() => 0.5)).toBe(3500)
  })

  it('follows the random source it is given', () => {
    expect(randomWait(() => 0.25)).toBe(2750)
    expect(randomWait(() => 0.75)).toBe(4250)
  })
})

describe('remainingMs and elapsedMs', () => {
  it('measure the run against its length, never outside it', () => {
    const state = start('light', 1000)
    expect(remainingMs(state, 1000)).toBe(LENGTH)
    expect(remainingMs(state, 1000 + LENGTH / 2)).toBe(LENGTH / 2)
    expect(remainingMs(state, 1000 + LENGTH + 500)).toBe(0)
    expect(elapsedMs(state, 1000)).toBe(0)
    expect(elapsedMs(state, 1000 + LENGTH / 2)).toBe(LENGTH / 2)
    expect(elapsedMs(state, 1000 + LENGTH + 500)).toBe(LENGTH)
  })

  it('are zero before the run starts', () => {
    const idle = initialReactionState()
    expect(remainingMs(idle, 500)).toBe(0)
    expect(elapsedMs(idle, 500)).toBe(0)
  })
})
