import {
  REACTION_COLOUR_TARGETS,
  REACTION_DURATION_MS,
  REACTION_LAPSE_CUTOFF_MS,
  REACTION_MIN_GAP_MS,
  REACTION_MIN_VALID_MS,
  REACTION_NONTARGET_MS,
  REACTION_NONTARGET_SHARE,
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

/**
 * What a stimulus is. Every light is the same round lamp. Without colour
 * targets it is always `white` and every light is a target. With colour
 * targets the first one is `white`; after it, only `green` is a target and the
 * lamp in the other colours is not (team decision, Sun 01:50, next to
 * F-phys-06). The sound mode only has `tone`.
 */
export type StimulusKind = 'white' | 'green' | 'orange' | 'yellow' | 'blue' | 'tone'

/** The light stimuli that are not targets: the same lamp in other colours. */
export const NON_TARGET_KINDS: StimulusKind[] = ['orange', 'yellow', 'blue']

/** Whether an answer to this stimulus is a reaction (true) or an error (false). */
export function isTarget(
  kind: StimulusKind,
  colourTargets: boolean = REACTION_COLOUR_TARGETS,
): boolean {
  // Without colour targets every stimulus is a target; only the size varies.
  return !colourTargets || !NON_TARGET_KINDS.includes(kind)
}

/** One tone of the sound mode: pitch, loudness and length vary per trial. */
export interface ToneParams {
  hz: number
  gain: number
  ms: number
}

export interface ReactionState {
  modality: ReactionModality
  phase: ReactionPhase
  /** The length of the run in ms: the 50 seconds, or the demo length. */
  durationMs: number
  /** Clock times of the start and of the end, in the clock the caller passes. */
  startedAt: number | null
  endsAt: number | null
  /** Trials closed, by a reaction or by a lapse. A false start closes none. */
  done: number
  /** Clock time of the stimulus showing now. */
  stimulusAt: number | null
  /**
   * Every valid answer so far, in ms, the late ones (lapses) included. A trial
   * that timed out with no answer has no time and is only a lapse.
   */
  reactions: number[]
  lapses: number
  falseStarts: number
  /** Answers to a stimulus that was not a target. Shown, never stored. */
  errors: number
  /** Stimuli shown so far in this run; the first light one is white. */
  shown: number
  /** Whether only green is a target (set when the check is made). */
  colourTargets: boolean
  /** The scale of the light showing now (1 is the full size). */
  size: number
  /** The stimulus showing now, and the tone of it in the sound mode. */
  kind: StimulusKind | null
  tone: ToneParams | null
  /** The last answer was to a non-target: the screen says so, quietly. */
  wrong: boolean
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
  | {
      type: 'stimulus'
      at: number
      kind?: StimulusKind
      tone?: ToneParams
      size?: number
    }
  | { type: 'answer'; at: number }
  // The light has been drawn: the time of the frame that shows it replaces the
  // time the timer fired, so the screen delay is not counted as reaction time.
  | { type: 'painted'; at: number }
  | { type: 'timeout'; at: number }
  | { type: 'tick'; at: number }
  | { type: 'stop' }
  | { type: 'reset'; modality: ReactionModality; durationMs?: number }

export function initialReactionState(
  modality: ReactionModality = 'light',
  durationMs: number = REACTION_DURATION_MS,
  colourTargets: boolean = REACTION_COLOUR_TARGETS,
): ReactionState {
  return {
    colourTargets,
    size: 1,
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
    errors: 0,
    shown: 0,
    kind: null,
    tone: null,
    wrong: false,
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
        errors: 0,
        shown: 0,
        kind: null,
        tone: null,
        wrong: false,
        tooEarly: false,
        waitToken: state.waitToken + 1,
        stopped: false,
      }
    case 'stimulus':
      // A stimulus only exists inside a pre-stimulus wait: the component's
      // timer may fire once more after a false start, and that one is ignored.
      if (state.phase !== 'waiting') return state
      return {
        ...state,
        phase: 'stimulus',
        stimulusAt: event.at,
        kind: event.kind ?? (state.modality === 'sound' ? 'tone' : 'green'),
        tone: event.tone ?? null,
        size: event.size ?? 1,
        shown: state.shown + 1,
        tooEarly: false,
        wrong: false,
      }
    case 'answer':
      return answered(state, event.at)
    case 'painted':
      if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
      if (event.at <= state.stimulusAt) return state
      return { ...state, stimulusAt: event.at }
    case 'timeout':
      if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
      // A non-target clears after a fixed short time. Not answering it is
      // right: no lapse, and no trial is closed.
      if (state.kind !== null && !isTarget(state.kind, state.colourTargets)) {
        if (event.at < state.stimulusAt + REACTION_NONTARGET_MS) return state
        return cleared(state, event.at)
      }
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
      return {
        ...state,
        phase: 'finished',
        stimulusAt: null,
        kind: null,
        tooEarly: false,
      }
    case 'stop':
      if (state.phase !== 'waiting' && state.phase !== 'stimulus') return state
      return {
        ...state,
        phase: 'finished',
        stimulusAt: null,
        kind: null,
        tooEarly: false,
        wrong: false,
        stopped: true,
      }
    case 'reset':
      return initialReactionState(
        event.modality,
        event.durationMs ?? state.durationMs,
        state.colourTargets,
      )
  }
}

function answered(state: ReactionState, at: number): ReactionState {
  if (state.phase === 'waiting') return falseStart(state)
  if (state.phase !== 'stimulus' || state.stimulusAt === null) return state
  const latency = Math.max(0, at - state.stimulusAt)
  // Too fast to be a reaction: the press was already on its way.
  if (latency < REACTION_MIN_VALID_MS) return falseStart(state)
  // A non-target answered: an error. It is not a reaction time and not a lapse.
  if (state.kind !== null && !isTarget(state.kind, state.colourTargets)) {
    return { ...cleared(state, at), errors: state.errors + 1, wrong: true }
  }
  // Every answer of 100 ms or more is a valid response, a late one included:
  // it counts as a lapse and it also stays in the list the median reads.
  const reactions = [...state.reactions, latency]
  if (latency >= REACTION_LAPSE_CUTOFF_MS) {
    return closed(state, at, state.lapses + 1, reactions)
  }
  return closed(state, at, state.lapses, reactions)
}

// Too early. The trial is not closed: the wait starts again (waitToken) and the
// false start is counted, so the length of the run is the same.
function falseStart(state: ReactionState): ReactionState {
  return {
    ...state,
    phase: 'waiting',
    stimulusAt: null,
    kind: null,
    falseStarts: state.falseStarts + 1,
    tooEarly: true,
    wrong: false,
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
    kind: null,
    tooEarly: false,
    wrong: false,
    waitToken: over ? state.waitToken : state.waitToken + 1,
  }
}

// A non-target is over (it cleared, or it was answered): the wait starts again.
// No trial is counted, so the length of the run is the same.
function cleared(state: ReactionState, at: number): ReactionState {
  const over = state.endsAt !== null && at >= state.endsAt
  return {
    ...state,
    phase: over ? 'finished' : 'waiting',
    stimulusAt: null,
    kind: null,
    tooEarly: false,
    wrong: false,
    waitToken: over ? state.waitToken : state.waitToken + 1,
  }
}

export interface ReactionSummary {
  /**
   * The median of every valid answer, late ones included, rounded to whole
   * ms; null when nobody answered (every trial timed out).
   */
  medianMs: number | null
  lapses: number
  falseStarts: number
  /** Answers to a non-target; shown in the result, never stored. */
  errors: number
  /** Trials that closed, by an answer or by a lapse with no answer. */
  trials: number
}

export function summarize(state: ReactionState): ReactionSummary {
  return {
    medianMs: median(state.reactions),
    lapses: state.lapses,
    falseStarts: state.falseStarts,
    errors: state.errors,
    trials: state.done,
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
  const wait = REACTION_WAIT_MIN_MS + Math.round(random() * span)
  // Never closer than the gap that keeps the flashing under 3 per second.
  return Math.max(REACTION_MIN_GAP_MS, wait)
}

/**
 * The next light stimulus. The first of a run is white, a target. After it,
 * the share of non-targets is REACTION_NONTARGET_SHARE: a draw in the top of
 * the range picks the lamp in one of the other colours, any other draw is green.
 */
export function pickLightKind(
  shown: number,
  random: () => number = Math.random,
  colourTargets: boolean = REACTION_COLOUR_TARGETS,
): StimulusKind {
  // Every light is a target and the same white lamp; only its size changes.
  if (!colourTargets) return 'white'
  if (shown === 0) return 'white'
  if (random() < 1 - REACTION_NONTARGET_SHARE) return 'green'
  const index = Math.min(
    NON_TARGET_KINDS.length - 1,
    Math.floor(random() * NON_TARGET_KINDS.length),
  )
  return NON_TARGET_KINDS[index]
}

/** One tone: pitch and length uniform in their ranges, loudness from a few steps. */
export function randomTone(random: () => number = Math.random): ToneParams {
  const hz =
    REACTION_TONE_HZ_MIN +
    Math.round(random() * (REACTION_TONE_HZ_MAX - REACTION_TONE_HZ_MIN))
  const ms =
    REACTION_TONE_MS_MIN +
    Math.round(random() * (REACTION_TONE_MS_MAX - REACTION_TONE_MS_MIN))
  const step = Math.min(
    REACTION_TONE_GAINS.length - 1,
    Math.floor(random() * REACTION_TONE_GAINS.length),
  )
  return { hz, ms, gain: REACTION_TONE_GAINS[step] }
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

/** The size of the next light when colour targets are off: one of a few scales. */
export function randomSize(random: () => number = Math.random): number {
  const index = Math.min(
    REACTION_SIZES.length - 1,
    Math.floor(random() * REACTION_SIZES.length),
  )
  return REACTION_SIZES[index]
}
