// The arithmetic of the eye check, with no camera and no model: from the six
// landmarks of an eye to the share of time closed and the blinks a minute.
// Eye aspect ratio: Soukupova and Cech 2016, "Real-time eye blink detection
// using facial landmarks", https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf

import {
  CLOSED_FRAMES_FOR_BLINK,
  MAX_CLOSED_FRAMES_FOR_BLINK,
  EAR_CLOSED_THRESHOLD,
  MIN_FACE_FRAMES,
} from './constants'

export interface Point {
  x: number
  y: number
}

// In the 68 point model the right eye is points 36 to 41 and the left eye 42
// to 47; each eye runs p1 (outer corner), p2, p3 (top), p4 (inner corner),
// p5, p6 (bottom).
const RIGHT_EYE_START = 36
const LEFT_EYE_START = 42
export const LANDMARK_COUNT = 68

const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

/** EAR = (|p2-p6| + |p3-p5|) / (2 |p1-p4|), from the six points of one eye. */
export function eyeAspectRatio(eye: readonly Point[]): number {
  const [p1, p2, p3, p4, p5, p6] = eye
  if (eye.length !== 6) return Number.NaN
  const width = distance(p1, p4)
  if (width === 0) return Number.NaN
  return (distance(p2, p6) + distance(p3, p5)) / (2 * width)
}

/**
 * The two eyes averaged, from the 68 landmarks of one face. Null when the points
 * are not a whole face.
 */
export function faceEar(points: readonly Point[] | null): number | null {
  if (points === null || points.length !== LANDMARK_COUNT) return null
  const right = eyeAspectRatio(
    points.slice(RIGHT_EYE_START, RIGHT_EYE_START + 6),
  )
  const left = eyeAspectRatio(points.slice(LEFT_EYE_START, LEFT_EYE_START + 6))
  const value = (right + left) / 2
  return Number.isFinite(value) ? value : null
}

/** Closed or open for one frame, by the threshold. */
export function isClosed(
  ear: number,
  threshold = EAR_CLOSED_THRESHOLD,
): boolean {
  return ear < threshold
}

/** One frame: the eye aspect ratio, or null when no face was found. */
export type EarFrame = number | null

/**
 * Blinks: each run of `minFrames` to `maxFrames` closed frames that returns to
 * open. A longer run is a long closure, not a blink (phys-07). A frame without
 * a face ends a run without counting it, and a run still closed at the end is
 * not a blink.
 */
export function countBlinks(
  frames: readonly EarFrame[],
  threshold = EAR_CLOSED_THRESHOLD,
  minFrames = CLOSED_FRAMES_FOR_BLINK,
  maxFrames = MAX_CLOSED_FRAMES_FOR_BLINK,
): number {
  let blinks = 0
  let run = 0
  for (const frame of frames) {
    if (frame === null) {
      run = 0
    } else if (isClosed(frame, threshold)) {
      run += 1
    } else {
      if (run >= minFrames && run <= maxFrames) blinks += 1
      run = 0
    }
  }
  return blinks
}

export type EyeAnalysis =
  | { enough: false; faceFrames: number; totalFrames: number }
  | {
      enough: true
      faceFrames: number
      totalFrames: number
      /** Closed frames over frames with a face, 0 to 100, one decimal kept. */
      closurePct: number
      blinks: number
      /** Blinks over the time with a face, per minute. */
      blinkRatePm: number
    }

/**
 * The two numbers of a run. `durationMs` is the real time the frames cover, so
 * a slow device still gives a rate a minute. With too few frames holding a face
 * the answer is "not enough", never a number.
 */
export function analyse(
  frames: readonly EarFrame[],
  durationMs: number,
  options: {
    threshold?: number
    minFrames?: number
    minFaceShare?: number
  } = {},
): EyeAnalysis {
  const threshold = options.threshold ?? EAR_CLOSED_THRESHOLD
  const minFaceShare = options.minFaceShare ?? MIN_FACE_FRAMES
  const faceFrames = frames.filter((frame) => frame !== null).length
  const totalFrames = frames.length
  if (
    totalFrames === 0 ||
    faceFrames === 0 ||
    durationMs <= 0 ||
    faceFrames / totalFrames < minFaceShare
  ) {
    return { enough: false, faceFrames, totalFrames }
  }
  const closed = frames.filter(
    (frame) => frame !== null && isClosed(frame, threshold),
  ).length
  const blinks = countBlinks(frames, threshold, options.minFrames)
  const faceMinutes = (durationMs * (faceFrames / totalFrames)) / 60_000
  return {
    enough: true,
    faceFrames,
    totalFrames,
    closurePct: (closed / faceFrames) * 100,
    blinks,
    blinkRatePm: blinks / faceMinutes,
  }
}
