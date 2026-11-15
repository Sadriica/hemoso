import { describe, expect, it } from 'vitest'
import {
  REACTION_DURATION_MS,
  REACTION_LAPSE_CUTOFF_MS,
  REACTION_MIN_GAP_MS,
  REACTION_MIN_VALID_MS,
  REACTION_NONTARGET_MS,
  REACTION_NONTARGET_SHARE,
  REACTION_COLOUR_TARGETS,
  REACTION_SIZES,
  REACTION_TONE_GAINS,
  REACTION_TONE_HZ_MAX,
  REACTION_TONE_HZ_MIN,
  REACTION_TONE_MS_MAX,
  REACTION_TONE_MS_MIN,
  REACTION_TRIAL_WINDOW_MS,
  REACTION_WAIT_MAX_MS,
  REACTION_WAIT_MIN_MS,
} from './constants'
import {
  elapsedMs,
  initialReactionState,
  isTarget,
  median,
  NON_TARGET_KINDS,
  pickLightKind,
  PLAIN_KINDS,
  randomSize,
  randomTone,
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
function start(
  modality: 'light' | 'sound' = 'light',
  at = 0,
  colourTargets = true,
): ReactionState {
  const idle = initialReactionState(modality, LENGTH, colourTargets)
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
      errors: 0,
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
      errors: 0,
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
      errors: 0,
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

describe('the 90-second run', () => {
  it('is 90 seconds, a shortened PVT-B', () => {
    expect(REACTION_DURATION_MS).toBe(90_000)
  })
})

describe('the minimum gap between two stimuli', () => {
  it('is at least 334 ms, so nothing flashes more than 3 times a second', () => {
    expect(REACTION_MIN_GAP_MS).toBeGreaterThanOrEqual(334)
    expect(REACTION_WAIT_MIN_MS).toBeGreaterThanOrEqual(REACTION_MIN_GAP_MS)
  })

  it('is never gone under by the scheduler, whatever the draw', () => {
    for (let step = 0; step <= 100; step += 1) {
      expect(randomWait(() => step / 100)).toBeGreaterThanOrEqual(REACTION_MIN_GAP_MS)
    }
    // Even a draw below the range cannot bring the wait under the gap.
    expect(randomWait(() => -5)).toBeGreaterThanOrEqual(REACTION_MIN_GAP_MS)
  })
})

describe('colour targets off', () => {
  it('is the default until Phys confirms the method', () => {
    expect(REACTION_COLOUR_TARGETS).toBe(false)
  })

  it('makes every light a target, with a shape that changes', () => {
    for (const kind of PLAIN_KINDS) expect(isTarget(kind, false)).toBe(true)
    const kinds = new Set([0, 0.3, 0.6, 0.99].map((draw) => pickLightKind(0, () => draw, false)))
    expect(kinds.size).toBeGreaterThan(1)
    for (const kind of kinds) expect(PLAIN_KINDS).toContain(kind)
    // Never a white-first rule, never a non-target, whatever the draw.
    expect(pickLightKind(3, () => 0.95, false)).not.toBe('green')
  })

  it('counts an answer to any light as a reaction, never an error', () => {
    let state = start('light', 0, false)
    state = reactionReducer(state, { type: 'stimulus', at: 2000, kind: 'square', size: 0.65 })
    expect(state.size).toBe(0.65)
    state = reactionReducer(state, { type: 'answer', at: 2250 })
    expect(state.reactions).toEqual([250])
    expect(state.errors).toBe(0)
  })

  it('picks sizes from the set', () => {
    for (let step = 0; step <= 100; step += 1) {
      expect(REACTION_SIZES).toContain(randomSize(() => step / 100))
    }
    expect(new Set([0, 0.5, 0.99].map((draw) => randomSize(() => draw))).size).toBe(3)
  })

  it('keeps the 355 ms lapse cut-off', () => {
    expect(REACTION_LAPSE_CUTOFF_MS).toBe(355)
  })
})

describe('light stimuli with colour targets', () => {
  it('shows a white target first, then green or a non-target by the share', () => {
    expect(pickLightKind(0, () => 0.99, true)).toBe('white')
    expect(pickLightKind(1, () => 0, true)).toBe('green')
    expect(pickLightKind(5, () => 1 - REACTION_NONTARGET_SHARE - 0.01, true)).toBe('green')
    const seen = new Set([0.7, 0.8, 0.9, 0.999].map((draw) => pickLightKind(2, () => draw, true)))
    for (const kind of seen) expect(NON_TARGET_KINDS).toContain(kind)
  })

  it('has targets only for white, green and the tone', () => {
    expect(isTarget('white', true)).toBe(true)
    expect(isTarget('green', true)).toBe(true)
    expect(isTarget('tone', true)).toBe(true)
    for (const kind of NON_TARGET_KINDS) expect(isTarget(kind, true)).toBe(false)
  })

  it('counts an answer to a non-target as an error, not as a reaction or a lapse', () => {
    let state = start()
    state = reactionReducer(state, { type: 'stimulus', at: 2000, kind: 'square' })
    state = reactionReducer(state, { type: 'answer', at: 2300 })
    expect(state.errors).toBe(1)
    expect(state.reactions).toEqual([])
    expect(state.lapses).toBe(0)
    expect(state.done).toBe(0)
    expect(state.phase).toBe('waiting')
    expect(summarize(state)).toMatchObject({ errors: 1, trials: 0, medianMs: null })
  })

  it('clears an unanswered non-target with no lapse, only after its time', () => {
    let state = start()
    state = reactionReducer(state, { type: 'stimulus', at: 2000, kind: 'triangle' })
    const early = reactionReducer(state, { type: 'timeout', at: 2000 + REACTION_NONTARGET_MS - 1 })
    expect(early.phase).toBe('stimulus')
    const cleared = reactionReducer(state, { type: 'timeout', at: 2000 + REACTION_NONTARGET_MS })
    expect(cleared.phase).toBe('waiting')
    expect(cleared.lapses).toBe(0)
    expect(cleared.errors).toBe(0)
    expect(cleared.done).toBe(0)
  })

  it('times green and white as before: 355 ms is a lapse, under 100 ms a false start', () => {
    for (const kind of ['white', 'green'] as const) {
      let state = start()
      state = reactionReducer(state, { type: 'stimulus', at: 2000, kind })
      expect(reactionReducer(state, { type: 'answer', at: 2000 + REACTION_LAPSE_CUTOFF_MS }).lapses).toBe(1)
      expect(reactionReducer(state, { type: 'answer', at: 2000 + REACTION_MIN_VALID_MS - 1 }).falseStarts).toBe(1)
      expect(reactionReducer(state, { type: 'answer', at: 2250 }).reactions).toEqual([250])
    }
  })
})

describe('tones', () => {
  it('stay inside the ranges for any draw', () => {
    for (let step = 0; step <= 100; step += 1) {
      const tone = randomTone(() => step / 100)
      expect(tone.hz).toBeGreaterThanOrEqual(REACTION_TONE_HZ_MIN)
      expect(tone.hz).toBeLessThanOrEqual(REACTION_TONE_HZ_MAX)
      expect(tone.ms).toBeGreaterThanOrEqual(REACTION_TONE_MS_MIN)
      expect(tone.ms).toBeLessThanOrEqual(REACTION_TONE_MS_MAX)
      expect(REACTION_TONE_GAINS).toContain(tone.gain)
    }
  })

  it('are never louder than the single tone of before (0.25), and use the ranges asked for', () => {
    expect(Math.max(...REACTION_TONE_GAINS)).toBeLessThanOrEqual(0.25)
    expect([REACTION_TONE_HZ_MIN, REACTION_TONE_HZ_MAX]).toEqual([600, 1400])
    expect([REACTION_TONE_MS_MIN, REACTION_TONE_MS_MAX]).toEqual([80, 200])
  })
})
