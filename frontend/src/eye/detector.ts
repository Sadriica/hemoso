// The detector the screen uses, behind one lazy door: the model code and
// face-api are fetched only when a person presses Start.

import type { Point } from './ear'
import { testDetector } from './enabled'

export type EyeDetector = (video: HTMLVideoElement) => Promise<Point[] | null>

export async function loadDetector(): Promise<EyeDetector> {
  const scripted = testDetector()
  if (scripted !== null) return scripted
  const engine = await import('./engine')
  await engine.loadEyeModels()
  return engine.landmarksFrom
}
