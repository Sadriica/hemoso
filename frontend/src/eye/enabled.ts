// Whether the eye check shows, and the two test-only switches. The only way in
// production is EYE_CHECK_ENABLED. The `?eye=` parameter and the stand-in rows
// work only in a build made with VITE_EYE_E2E=1, which the e2e run sets; in any
// other build the comparison is false at build time and the code is dropped.

import type { Indicator } from '../domain/types'
import { CHECK_MS, EYE_CHECK_ENABLED } from './constants'
import { BLINK_RATE_ID, EYE_CLOSURE_ID } from './ids'

const TEST_BUILD = import.meta.env.VITE_EYE_E2E === '1'

function testParam(search: string): string | null {
  return TEST_BUILD ? new URLSearchParams(search).get('eye') : null
}

/** The flag, or `?eye=1` in a test build. */
export function eyeEnabled(search: string): boolean {
  return EYE_CHECK_ENABLED || testParam(search) !== null
}

/** The length of one run: CHECK_MS, or 6 seconds for `?eye=demo` in a test build. */
export function eyeLength(search: string): number {
  return testParam(search) === 'demo' ? 6000 : CHECK_MS
}

/** Both ids present in the loaded indicators: the check has nowhere to save without them. */
export function hasEyeIndicators(indicators: readonly Indicator[]): boolean {
  return [EYE_CLOSURE_ID, BLINK_RATE_ID].every((id) =>
    indicators.some((item) => item.id === id),
  )
}

const standIn = (id: string, name: string, unit: string): Indicator => ({
  id,
  name,
  unit,
  direction: 'both',
  measuredOnBoard: 'eye check',
  hazards: [],
  minSpread: 1,
  sources: [],
})

/**
 * In a test build with `?eye=` only: the two rows the real file does not hold
 * yet, so the e2e can run. Everywhere else the list is returned as it is.
 */
export function withTestIndicators(
  indicators: Indicator[],
  search: string,
): Indicator[] {
  if (testParam(search) === null || hasEyeIndicators(indicators)) return indicators
  return [
    ...indicators,
    standIn(EYE_CLOSURE_ID, 'Eye closure', '%'),
    standIn(BLINK_RATE_ID, 'Blink rate', 'per min'),
  ]
}

/** The scripted detector of the e2e run: a function on `window`, in a test build only. */
export function testDetector():
  | ((video: HTMLVideoElement) => Promise<{ x: number; y: number }[] | null>)
  | null {
  if (!TEST_BUILD) return null
  const hook = (window as unknown as { __hemosoEyeDetect?: unknown })
    .__hemosoEyeDetect
  return typeof hook === 'function'
    ? (hook as (video: HTMLVideoElement) => Promise<{ x: number; y: number }[] | null>)
    : null
}
