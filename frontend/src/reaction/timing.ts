import {
  REACTION_DURATION_MS,
  REACTION_LAPSE_CUTOFF_MS,
  REACTION_MIN_VALID_MS,
  REACTION_TRIAL_WINDOW_MS,
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
 * - `finished`: the time ran out, or the person stopped the check.
 */
export type ReactionPhase = 'idle' | 'waiting' | 'stimulus' | 'finished'

export interface ReactionState {
  modality: ReactionModality
  phase: ReactionPhase
  /** The length of the run in ms: the 3 minutes, or the demo length. */
  durationMs: number
  /** Clock times of the start and of the end, in the clock the caller passes. */
  startedAt: number | null
  endsAt: number | null
  /** Trials closed, by a reaction or by a lapse. A false start closes none. */
  done: number
  /** Clock time of the stimulus showing now. */
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
  /** The check ended because the person stopped it, not because time ran out. */
  stopped: boolean
}

export type ReactionEvent =
  | { type: 'start'; modality: ReactionModality; at: number; durationMs?: number }
  | { type: 'stimulus'; at: number }
  | { type: 'answer'; at: number }
  | { type: 'timeout'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'stop' }
  | { type: 'reset'; modality: ReactionModality; durationMs?: number }

export function initialReactionState(
  modality: ReactionModality = 'light',
  durationMs: number = REACTION_DURATION_MS,
): ReactionState {
  return {
    modality,
    phase: 'idle',
    durationMs,
    startedAt: null,
    endsAt: null,
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
        durationMs: event.durationMs ?? state.durationMs,
        phase: 'waiting',
        startedAt: event.at,
        endsAt: event.at + (event.durationMs ?? state.durationMs),
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
      if (state.phase !== 'waiting') return state
      return { ...state, phase: 'stimulus', stimulusAt: event.at, tooEarly: false }
    case 'answer':
      return answered(state, event.at)
    case 'timeout':
      if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
      // Only the end of the response window closes the trial, and it closes it
      // as a lapse: nobody answered.
      if (event.at < state.stimulusAt + REACTION_TRIAL_WINDOW_MS) return state
      return closed(state, event.at, state.lapses + 1)
    case 'tick':
      // The clock of the length of the run: the component arms one timer for it.
      // A stimulus already showing is not cut off: the trial in progress closes
      // as a reaction or as a lapse, and that close ends the run.
      if (state.phase !== 'waiting') return state
      if (state.endsAt === null || event.at < state.endsAt) return state
      return { ...state, phase: 'finished', stimulusAt: null, tooEarly: false }
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
      return initialReactionState(
        event.modality,
        event.durationMs ?? state.durationMs,
      )
  }
}

function answered(state: ReactionState, at: number): ReactionState {
  if (state.phase === 'waiting') return falseStart(state)
  if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
  const latency = Math.max(0, at - state.stimulusAt)
  // Too fast to be a reaction: the press was already on its way.
  if (latency < REACTION_MIN_VALID_MS) return falseStart(state)
  if (latency >= REACTION_LAPSE_CUTOFF_MS) return closed(state, at, state.lapses + 1)
  return closed(state, at, state.lapses, [...state.reactions, latency])
}

// Too early. The trial is not closed: the wait starts again (waitToken) and the
// false start is counted, so the length of the run is the same.
function falseStart(state: ReactionState): ReactionState {
  return {
    ...state,
    phase: 'waiting',
    stimulusAt: null,
    falseStarts: state.falseStarts + 1,
    tooEarly: true,
    waitToken: state.waitToken + 1,
  }
}

function closed(
  state: ReactionState,
  at: number,
  lapses: number,
  reactions: number[] = state.reactions,
): ReactionState {
  const done = state.done + 1
  const over = state.endsAt !== null && at >= state.endsAt
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

/** How much of the run is left at `at`, in ms, never below zero. */
export function remainingMs(state: ReactionState, at: number): number {
  if (state.endsAt === null) return 0
  return Math.max(0, state.endsAt - at)
}

/** How much of the run has passed at `at`, in ms, never above the length. */
export function elapsedMs(state: ReactionState, at: number): number {
  if (state.startedAt === null) return 0
  const elapsed = at - state.startedAt
  return Math.min(state.durationMs, Math.max(0, elapsed))
}
