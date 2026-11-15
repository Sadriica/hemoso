// One run of the check, with no React: it asks the detector for a frame again
// and again until the time is up or the signal aborts, and returns the ratios.
// Nothing of a frame is kept except its eye aspect ratio.

import { SAMPLE_INTERVAL_MS } from './constants'
import type { EyeDetector } from './detector'
import { faceEar, type EarFrame } from './ear'

export interface RunOptions {
  video: HTMLVideoElement
  detect: EyeDetector
  durationMs: number
  signal: AbortSignal
  /** 0 to 1, after every frame. */
  onProgress?: (share: number) => void
  /** Milliseconds, like performance.now(); a test passes its own. */
  now?: () => number
  /** Waits ms; a test passes its own. */
  sleep?: (ms: number) => Promise<void>
}

export interface RunResult {
  frames: EarFrame[]
  /** The real time the frames cover, in ms. */
  elapsedMs: number
  aborted: boolean
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function runCheck({
  video,
  detect,
  durationMs,
  signal,
  onProgress,
  now = () => performance.now(),
  sleep = defaultSleep,
}: RunOptions): Promise<RunResult> {
  const frames: EarFrame[] = []
  const started = now()
  while (!signal.aborted && now() - started < durationMs) {
    const before = now()
    let points = null
    try {
      points = await detect(video)
    } catch {
      points = null
    }
    frames.push(faceEar(points))
    onProgress?.(Math.min(1, (now() - started) / durationMs))
    const spent = now() - before
    if (spent < SAMPLE_INTERVAL_MS) await sleep(SAMPLE_INTERVAL_MS - spent)
  }
  return { frames, elapsedMs: now() - started, aborted: signal.aborted }
}
