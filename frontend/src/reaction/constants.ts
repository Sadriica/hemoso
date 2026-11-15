// How long the reaction check runs and how it is scored. These are Phys's
// numbers (T-72: the method, the test length and the cut-off, with sources);
// until that finding lands they are placeholders marked below, so the screen
// works and the change happens in this one file.
//
// Assumption until Phys T-72.

/** Trials in one check. A trial is one stimulus and the answer to it. */
export const REACTION_TRIALS = 20

/** The random wait before a stimulus, in ms: never the same twice. */
export const REACTION_WAIT_MIN_MS = 2000
export const REACTION_WAIT_MAX_MS = 7000

/** An answer slower than this is a lapse, not a reaction time, in ms. */
export const REACTION_LAPSE_CUTOFF_MS = 500

/**
 * How long the trial keeps listening for an answer after the stimulus, in ms.
 * The lapse is already counted at the cut-off; the extra time lets a person who
 * answered late finish their trial instead of being cut off mid-move.
 */
export const REACTION_RESPONSE_WINDOW_MS = 1500

/** The tone of the sound mode: one short oscillator, no audio file (REQ-28). */
export const REACTION_TONE_HZ = 880
export const REACTION_TONE_MS = 150
