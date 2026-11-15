import type { MeasurementContext } from './types'

// The four values of the `context` column (FORMATS.md section 3), in the order
// the Entry screen offers them.
export const MEASUREMENT_CONTEXTS: readonly MeasurementContext[] = [
  'rest',
  'after_exercise',
  'on_waking',
  'before_sleep',
]

// The default for a reading whose file has no `context` column, and for entries
// saved before the app recorded a context.
export const DEFAULT_CONTEXT: MeasurementContext = 'rest'

export function isMeasurementContext(
  value: unknown,
): value is MeasurementContext {
  return (
    typeof value === 'string' &&
    (MEASUREMENT_CONTEXTS as readonly string[]).includes(value)
  )
}

// The context that fits the local clock (REQ-09, "Routine prompts"): a reading
// taken before 10:00 is on waking, from 21:00 it is before sleep, and the rest
// of the day it is at rest. `time` is HH:MM, the same clock the Entry form
// already fills in. The person can always pick another one.
export function contextForTime(time: string): MeasurementContext {
  const hour = Number(time.slice(0, 2))
  if (hour < 10) return 'on_waking'
  if (hour >= 21) return 'before_sleep'
  return DEFAULT_CONTEXT
}
