import { describe, expect, it } from 'vitest'
import {
  analyse,
  countBlinks,
  eyeAspectRatio,
  faceEar,
  isClosed,
  type EarFrame,
} from './ear'
import {
  CLOSED_FACE,
  CLOSED_EAR,
  OPEN_EAR,
  OPEN_FACE,
  faceWithEar,
} from './fixtures'
import {
  CLOSED_FRAMES_FOR_BLINK,
  EAR_CLOSED_THRESHOLD,
  SAMPLE_INTERVAL_MS,
  MAX_CLOSED_FRAMES_FOR_BLINK,
} from './constants'

const open = (n: number): EarFrame[] => Array<EarFrame>(n).fill(OPEN_EAR)
const closed = (n: number): EarFrame[] => Array<EarFrame>(n).fill(CLOSED_EAR)
const none = (n: number): EarFrame[] => Array<EarFrame>(n).fill(null)

describe('eyeAspectRatio', () => {
  it('follows the formula of Soukupova and Cech', () => {
    const eye = [
      { x: 0, y: 0 },
      { x: 10, y: -6 },
      { x: 20, y: -6 },
      { x: 30, y: 0 },
      { x: 20, y: 6 },
      { x: 10, y: 6 },
    ]
    expect(eyeAspectRatio(eye)).toBeCloseTo(0.4)
  })

  it('is not a number for a wrong count or a flat width', () => {
    expect(eyeAspectRatio([])).toBeNaN()
    expect(eyeAspectRatio(Array(6).fill({ x: 1, y: 1 }))).toBeNaN()
  })
})

describe('faceEar', () => {
  it('averages both eyes of the 68 landmarks', () => {
    expect(faceEar(OPEN_FACE)).toBeCloseTo(OPEN_EAR)
    expect(faceEar(CLOSED_FACE)).toBeCloseTo(CLOSED_EAR)
    const half = faceWithEar(0.3)
    // Close only the right eye: the mean sits between the two.
    half.splice(36, 6, ...faceWithEar(0.1).slice(36, 42))
    expect(faceEar(half)).toBeCloseTo(0.2)
  })

  it('is null with no face or an incomplete one', () => {
    expect(faceEar(null)).toBeNull()
    expect(faceEar(OPEN_FACE.slice(0, 40))).toBeNull()
  })
})

describe('isClosed', () => {
  it('compares with the threshold', () => {
    expect(isClosed(OPEN_EAR)).toBe(false)
    expect(isClosed(CLOSED_EAR)).toBe(true)
    expect(isClosed(EAR_CLOSED_THRESHOLD)).toBe(false)
  })
})

describe('countBlinks', () => {
  it('counts one blink: closed for enough frames, then open', () => {
    expect(
      countBlinks([...open(5), ...closed(CLOSED_FRAMES_FOR_BLINK), ...open(5)]),
    ).toBe(1)
  })

  it('does not count one closed frame, a noise spike', () => {
    expect(countBlinks([...open(5), ...closed(1), ...open(5)])).toBe(0)
  })

  it('does not count a long closure as a blink (phys-07: a blink lasts at most 400 ms)', () => {
    expect(
      countBlinks([
        ...open(5),
        ...closed(MAX_CLOSED_FRAMES_FOR_BLINK + 1),
        ...open(5),
      ]),
    ).toBe(0)
    expect(
      countBlinks([
        ...open(5),
        ...closed(MAX_CLOSED_FRAMES_FOR_BLINK),
        ...open(5),
      ]),
    ).toBe(1)
  })

  it('does not count a run still closed at the end', () => {
    expect(countBlinks([...open(5), ...closed(10)])).toBe(0)
  })

  it('does not count a run broken by a missing face', () => {
    expect(
      countBlinks([...open(2), ...closed(3), ...none(2), ...open(2)]),
    ).toBe(0)
  })

  it('counts every blink', () => {
    const frames = [
      ...open(3),
      ...closed(3),
      ...open(3),
      ...closed(4),
      ...open(3),
    ]
    expect(countBlinks(frames)).toBe(2)
  })
})

describe('analyse', () => {
  it('gives the closure share and the rate for open eyes with one blink', () => {
    const frames = [...open(96), ...closed(4), ...open(100)]
    // 200 frames over 20 s: one blink in a third of a minute.
    const result = analyse(frames, 20_000)
    expect(result.enough).toBe(true)
    if (!result.enough) return
    expect(result.closurePct).toBeCloseTo(2)
    expect(result.blinks).toBe(1)
    expect(result.blinkRatePm).toBeCloseTo(3)
  })

  it('reads eyes held open as 0 % and no blinks', () => {
    const result = analyse(open(100), 10_000)
    expect(result.enough && result.closurePct).toBe(0)
    expect(result.enough && result.blinks).toBe(0)
  })

  it('reads eyes held closed as 100 % and no blinks', () => {
    const result = analyse(closed(100), 10_000)
    expect(result.enough && result.closurePct).toBe(100)
    expect(result.enough && result.blinks).toBe(0)
  })

  it('takes the closure share over the frames with a face only', () => {
    const frames = [...open(40), ...closed(10), ...none(10)]
    const result = analyse(frames, 60 * SAMPLE_INTERVAL_MS)
    expect(result.enough && result.closurePct).toBeCloseTo(20)
  })

  it('says "not enough" with no face, or with too few frames holding one', () => {
    expect(analyse(none(100), 10_000).enough).toBe(false)
    expect(analyse([...open(30), ...none(70)], 10_000).enough).toBe(false)
    expect(analyse([], 10_000).enough).toBe(false)
    expect(analyse(open(10), 0).enough).toBe(false)
  })
})
