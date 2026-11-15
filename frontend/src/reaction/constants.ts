// Every number of the reaction check, in one file: the length, the wait before a
// stimulus, the cut-offs and the tone. They are Phys's numbers, from F-phys-06
// (docs/findings/phys-06-reaction-time-pvtb.md), which reproduces the 3-minute
// PVT-B of the ISS Reaction Self Test; the lapse threshold and the intervals come
// from Dev et al. 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC11614644/
// A change happens here and in that finding, never in the screen.

/** One check of the real length: 180_000 ms, three minutes of trials. */
export const REACTION_DURATION_MS = 180_000

/**
 * The demo length, 30_000 ms. It exists for the demo path and for the e2e
 * test, which cannot spend three minutes per run; the app reaches it with
 * `?reaction=demo` and nothing else uses it.
 */
export const REACTION_DEMO_DURATION_MS = 30_000

/** The random wait before a stimulus, in ms: uniform between these two. */
export const REACTION_WAIT_MIN_MS = 2000
export const REACTION_WAIT_MAX_MS = 5000

/**
 * A trial that takes this long or longer is a lapse, not a reaction time: the
 * PVT-B counts 355 ms, not the 500 ms of the 5-minute PVT.
 */
export const REACTION_LAPSE_CUTOFF_MS = 355

/**
 * How long a trial keeps listening after the stimulus, in ms. Past the lapse
 * cut-off the trial is already a lapse; the remaining time lets a person who
 * answered late finish their move instead of being cut off mid-gesture, and
 * then the trial closes on its own.
 */
export const REACTION_TRIAL_WINDOW_MS = 2000

/**
 * The fastest answer that counts, in ms. A body cannot react faster than this:
 * a shorter gap is a press held from the wait, so the trial is a false start,
 * not a very good reaction time.
 */
export const REACTION_MIN_VALID_MS = 100

/** The tone of the sound mode: one short oscillator, no audio file (REQ-28). */
export const REACTION_TONE_HZ = 1000
export const REACTION_TONE_MS = 150

// The demo run is shorter, and only the demo path and the e2e test ask for it:
// `?reaction=demo`. Nothing else in the app reads this parameter.
const DEMO_PARAM = 'reaction'

/** The length of one run: 3 minutes, or the demo length on the demo path. */
export function reactionLength(search: string): number {
  return new URLSearchParams(search).get(DEMO_PARAM) === 'demo'
    ? REACTION_DEMO_DURATION_MS
    : REACTION_DURATION_MS
}
