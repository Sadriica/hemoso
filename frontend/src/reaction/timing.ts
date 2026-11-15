import {
  REACTION_LAPSE_CUTOFF_MS,
  REACTION_RESPONSE_WINDOW_MS,
  REACTION_TRIALS,
  REACTION_WAIT_MAX_MS,
  REACTION_WAIT_MIN_MS,
} from './constants'

// The timing of the reaction check, as a reducer: every moment comes in with
// the event that carries it (`at`), so a test feeds a fake clock and no test
// waits for a real second. The component only owns the timers and the screen.

/** How the stimulus reaches the person: a shape that appears, or a tone. */
export type ReactionModality = 'light' | 'sound'

/**
 * Where a check stands.
 * - `idle`: not started; the person picks light or sound.
 * - `waiting`: the random wait before the stimulus; an answer now is a false
 *   start and the wait starts again.
 * - `stimulus`: the stimulus is showing; an answer is the reaction time.
 * - `finished`: every trial answered, or the person stopped the check.
 */
export type ReactionPhase = 'idle' | 'waiting' | 'stimulus' | 'finished'

export interface ReactionState {
  modality: ReactionModality
  phase: ReactionPhase
  total: number
  /** Trials closed, by a reaction or by a lapse. A false start closes none. */
  done: number
  /** Clock time of the stimulus showing now, in the clock the caller passes. */
  stimulusAt: number | null
  /** The reaction times measured so far, in ms. */
  reactions: number[]
  lapses: number
  falseStarts: number
  /** The person answered before the last stimulus: the screen says "Too early". */
  tooEarly: boolean
  /**
   * Counts pre-stimulus waits. The component arms one timer per token, so a
   * false start really restarts the wait instead of leaving the old one running.
   */
  waitToken: number
  /** The check ended because the person stopped it, not because it was over. */
  stopped: boolean
}

export type ReactionEvent =
  | { type: 'start'; modality: ReactionModality; total?: number }
  | { type: 'stimulus'; at: number }
  | { type: 'answer'; at: number }
  | { type: 'timeout'; at: number }
  | { type: 'stop' }
  | { type: 'reset'; modality: ReactionModality }

export function initialReactionState(
  modality: ReactionModality = 'light',
  total: number = REACTION_TRIALS,
): ReactionState {
  return {
    modality,
    phase: 'idle',
    total,
    done: 0,
    stimulusAt: null,
    reactions: [],
    lapses: 0,
    falseStarts: 0,
    tooEarly: false,
    waitToken: 0,
    stopped: false,
  }
}

export function reactionReducer(
  state: ReactionState,
  event: ReactionEvent,
): ReactionState {
  switch (event.type) {
    case 'start':
      if (state.phase !== 'idle') return state
      return {
        ...state,
        modality: event.modality,
        total: event.total ?? state.total,
        phase: 'waiting',
        done: 0,
        stimulusAt: null,
        reactions: [],
        lapses: 0,
        falseStarts: 0,
        tooEarly: false,
        waitToken: state.waitToken + 1,
        stopped: false,
      }
    case 'stimulus':
      // A stimulus only exists inside a pre-stimulus wait: the component's
      // timer may fire once more after a false start, and that one is ignored.
      if (state.phase !== 'waiting' || state.done >= state.total) return state
      return { ...state, phase: 'stimulus', stimulusAt: event.at, tooEarly: false }
    case 'answer':
      return answered(state, event.at)
    case 'timeout':
      if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
      // Only the end of the response window closes the trial as a lapse.
      if (event.at < state.stimulusAt + REACTION_RESPONSE_WINDOW_MS) return state
      return closed(state, state.lapses + 1)
    case 'stop':
      if (state.phase !== 'waiting' && state.phase !== 'stimulus') return state
      return {
        ...state,
        phase: 'finished',
        stimulusAt: null,
        tooEarly: false,
        stopped: true,
      }
    case 'reset':
      return initialReactionState(event.modality, state.total)
  }
}

function answered(state: ReactionState, at: number): ReactionState {
  if (state.phase === 'waiting') {
    // Too early. The trial is not closed: the wait starts again (waitToken) and
    // the false start is counted, so the number of trials stays the same.
    return {
      ...state,
      falseStarts: state.falseStarts + 1,
      tooEarly: true,
      waitToken: state.waitToken + 1,
    }
  }
  if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
  const latency = Math.max(0, at - state.stimulusAt)
  if (latency > REACTION_LAPSE_CUTOFF_MS) return closed(state, state.lapses + 1)
  return closed(state, state.lapses, [...state.reactions, latency])
}

function closed(
  state: ReactionState,
  lapses: number,
  reactions: number[] = state.reactions,
): ReactionState {
  const done = state.done + 1
  const over = done >= state.total
  return {
    ...state,
    done,
    lapses,
    reactions,
    phase: over ? 'finished' : 'waiting',
    stimulusAt: null,
    tooEarly: false,
    waitToken: over ? state.waitToken : state.waitToken + 1,
  }
}

export interface ReactionSummary {
  /** The median of the reaction times, rounded to whole ms; null with none. */
  medianMs: number | null
  lapses: number
  falseStarts: number
  /** Trials that closed: the reactions plus the lapses. */
  trials: number
}

export function summarize(state: ReactionState): ReactionSummary {
  return {
    medianMs: median(state.reactions),
    lapses: state.lapses,
    falseStarts: state.falseStarts,
    trials: state.reactions.length + state.lapses,
  }
}

/** The middle of the values, or the mean of the two middle ones, in whole ms. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const value =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle]
  return Math.round(value)
}

/** The random wait before one stimulus, in ms, inside the range of constants.ts. */
export function randomWait(random: () => number = Math.random): number {
  const span = REACTION_WAIT_MAX_MS - REACTION_WAIT_MIN_MS
  return REACTION_WAIT_MIN_MS + Math.round(random() * span)
}
