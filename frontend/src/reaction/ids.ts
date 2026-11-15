// The ids the reaction check writes. They belong to Phys (T-72): the two rows
// of config/data/indicators.csv that carry the units, the on-board method and
// the sources. Until both rows are in the file the step is hidden, so a missing
// row is never a crash.
export const REACTION_MEDIAN_ID = 'reaction_median_ms'
export const REACTION_LAPSES_ID = 'reaction_lapses'

// The two ids as one list: the check writes them, and no screen asks the crew to
// type them by hand (screens/entryDraft.ts skips them).
export const REACTION_INDICATOR_IDS = [REACTION_MEDIAN_ID, REACTION_LAPSES_ID]

/** True for the two indicators the check measures instead of the crew typing them. */
export function isReactionIndicator(indicatorId: string): boolean {
  return REACTION_INDICATOR_IDS.includes(indicatorId)
}
