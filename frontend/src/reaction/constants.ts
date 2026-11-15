// Every number of the reaction check, in one file: the length, the wait before a
// stimulus, the cut-offs and the tone. They are Phys's numbers, from F-phys-06
// (docs/findings/phys-06-reaction-time-pvtb.md), which reproduces the 3-minute
// PVT-B of the ISS Reaction Self Test; the lapse threshold and the intervals come
// from Dev et al. 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC11614644/
// The run is shortened to 50 seconds and the stimuli vary (team decision,
// Sun 01:50, next to F-phys-06). A change happens here and in that finding,
// never in the screen.

/**
 * One check of the real length: 50_000 ms (50 s, rounded from 49.5 s, 55 % of
 * the earlier 90 s; team lead decision, Sun 11:45). A shortened form of the
 * 3-minute PVT-B of F-phys-06 (team decision, Sun 01:50), so the median and the lapses
 * come from fewer trials than the instrument the threshold was built for.
 */
export const REACTION_DURATION_MS = 50_000

/**
 * The fewest valid trials (a reaction or a lapse) a run needs before it is
 * saved. Stopping or leaving a run keeps what was answered only from this
 * many on; with fewer, nothing is saved (team decision, Sun 01:50).
 */
export const REACTION_MIN_SAVE_TRIALS = 3

/**
 * The demo length, 30_000 ms. It exists for the demo path and for the e2e
 * test, which cannot spend 50 seconds per run; the app reaches it with
 * `?reaction=demo` and nothing else uses it. A run of this length shows the
 * result and saves nothing: 30 seconds is a demonstration of the screen, not a
 * check the crew took, so it must not reach the mission record (T-76).
 */
export const REACTION_DEMO_DURATION_MS = 30_000

/** The random wait before a stimulus, in ms: uniform between these two. */
export const REACTION_WAIT_MIN_MS = 2000
export const REACTION_WAIT_MAX_MS = 5000

/**
 * An answer that takes this long or longer is a lapse: the PVT-B counts 355 ms,
 * not the 500 ms of the 5-minute PVT (F-phys-06). Assumption for the go/no-go
 * form until Phys sets a cut-off (phys-06 covers the simple PVT-B).
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

/**
 * The tones of the sound mode: one short oscillator, no audio file (REQ-28).
 * Each trial varies pitch, loudness and length (team decision, Sun 01:50).
 * The loudest gain step is the gain the single tone had before (0.25).
 */
export const REACTION_TONE_HZ_MIN = 600
export const REACTION_TONE_HZ_MAX = 1400
export const REACTION_TONE_MS_MIN = 80
export const REACTION_TONE_MS_MAX = 200
export const REACTION_TONE_GAINS = [0.08, 0.16, 0.25]

/**
 * Whether the light mode has colours with only green as the target. ON (team
 * lead decision, Sun 11:45): with a plain "answer every light", a crew member
 * who repeats the check every day learns to predict it, and a go/no-go with
 * distractors keeps it fair. The first light of a run is a white warm-up
 * target; after it only the green lamp is a target and the orange, yellow and
 * blue lamps are not. Answering a distractor is an error: it is shown in the
 * result and never saved. A go/no-go is a choice task, which is slower than the
 * simple PVT-B, so the lapse cut-off below is an assumption for this form.
 * Off: every light is the same white lamp and a target, only its size changes,
 * no errors are counted.
 */
export const REACTION_COLOUR_TARGETS = true

/** The sizes the white lamp takes when colour targets are off: a scale of its box. */
export const REACTION_SIZES = [0.65, 0.82, 1]

/**
 * The share of light stimuli after the first (colour targets on only) that are not green, and how long
 * one stays on screen before it clears (team decision, Sun 01:50).
 */
export const REACTION_NONTARGET_SHARE = 0.3
export const REACTION_NONTARGET_MS = 1000

/**
 * The least time between two stimuli, in ms: 334 ms keeps the flashing under
 * 3 per second (WCAG 2.3.1). The 2 to 5 s wait of F-phys-06 is already above
 * it; this is the floor the scheduler never goes under.
 */
export const REACTION_MIN_GAP_MS = 334

// The demo run is shorter, and only the demo path and the e2e test ask for it:
// `?reaction=demo`. Nothing else in the app reads this parameter.
const DEMO_PARAM = 'reaction'

/** The length of one run: 50 seconds, or the demo length on the demo path. */
export function reactionLength(search: string): number {
  return new URLSearchParams(search).get(DEMO_PARAM) === 'demo'
    ? REACTION_DEMO_DURATION_MS
    : REACTION_DURATION_MS
}
