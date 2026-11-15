// The ids the eye check writes: two rows of config/data/indicators.csv. Until
// both rows are in the file the step is hidden, so a missing row is never a
// crash.
export const EYE_CLOSURE_ID = 'eye_closure_pct'
export const BLINK_RATE_ID = 'blink_rate_pm'

// The two ids as one list: the check writes them, and no screen asks the crew to
// type them by hand (screens/entryDraft.ts skips them).
export const EYE_INDICATOR_IDS = [EYE_CLOSURE_ID, BLINK_RATE_ID]

/** True for the two indicators the check measures instead of the crew typing them. */
export function isEyeIndicator(indicatorId: string): boolean {
  return EYE_INDICATOR_IDS.includes(indicatorId)
}
