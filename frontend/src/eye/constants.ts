// Every number and the switch of the eye check, in one file. The check measures
// only how much the eyes are closed and how often they blink, on the device,
// from the camera. It never reads mood, stress, emotion or mental state.
// Every number below comes from docs/findings/phys-07-eye-closure-check.md
// ("What the app runs"); most are Assumptions there. A change happens here and
// in that finding, never in the screen.

/**
 * The single switch. While false nothing of the eye check renders and no route,
 * text or indicator of the app changes.
 */
export const EYE_CHECK_ENABLED = true

/** Length of one check, in ms: 60 s, a team choice (phys-07, Assumption). */
export const CHECK_MS = 60_000

/**
 * An eye aspect ratio below this is a closed eye: the baseline threshold of
 * Soukupova and Cech 2016 (t = 0.2), not validated here (phys-07, Assumption).
 */
export const EAR_CLOSED_THRESHOLD = 0.2

/**
 * A run of at least this many closed frames that returns to open is one blink:
 * 2 frames at SAMPLE_INTERVAL_MS is about 100 ms, the short end of a blink
 * (100 to 400 ms, Soukupova and Cech 2016; the frame count is an Assumption).
 */
export const CLOSED_FRAMES_FOR_BLINK = 2

/**
 * A closed run longer than this is not a blink (a blink lasts at most about
 * 400 ms): it still counts in the closure share. 8 frames at SAMPLE_INTERVAL_MS
 * is 400 ms (phys-07, Assumption).
 */
export const MAX_CLOSED_FRAMES_FOR_BLINK = 8

/** The least time between two frames sent to the detector, in ms (phys-07). */
export const SAMPLE_INTERVAL_MS = 50

/**
 * The share of frames that must hold a face. With less (under 30 of the 60 s),
 * nothing is shown or saved: the person was not in front of the camera
 * (phys-07, Assumption).
 */
export const MIN_FACE_FRAMES = 0.5

/** The detector input size in px (the tiny detector's smaller one, as for sign-in). */
export const DETECTOR_INPUT_SIZE = 224

/** The detector score under which a face is not counted (as for sign-in). */
export const DETECTOR_SCORE = 0.5
