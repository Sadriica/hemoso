// Recorded-style landmark fixtures for the tests: a 68 point face whose two eyes
// have a chosen eye aspect ratio. Eye width is 30, so a height h gives
// EAR = 2h / (2 * 30) = h / 30.
import type { Point } from './ear'

function eye(startX: number, openness: number): Point[] {
  const h = openness * 30
  return [
    { x: startX, y: 50 },
    { x: startX + 10, y: 50 - h / 2 },
    { x: startX + 20, y: 50 - h / 2 },
    { x: startX + 30, y: 50 },
    { x: startX + 20, y: 50 + h / 2 },
    { x: startX + 10, y: 50 + h / 2 },
  ]
}

/** All 68 points; only the two eyes (36 to 47) carry the given ratio. */
export function faceWithEar(ear: number): Point[] {
  const points: Point[] = Array.from({ length: 68 }, (_, index) => ({
    x: index,
    y: 100,
  }))
  points.splice(36, 6, ...eye(20, ear))
  points.splice(42, 6, ...eye(80, ear))
  return points
}

export const OPEN_EAR = 0.3
export const CLOSED_EAR = 0.08
export const OPEN_FACE = faceWithEar(OPEN_EAR)
export const CLOSED_FACE = faceWithEar(CLOSED_EAR)
