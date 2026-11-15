// The ids the reaction check writes. They belong to Phys (T-72): the two rows
// of config/data/indicators.csv that carry the units, the on-board method and
// the sources. Until both rows are in the file the step is hidden, so a missing
// row is never a crash.
export const REACTION_MEDIAN_ID = 'reaction_median_ms'
export const REACTION_LAPSES_ID = 'reaction_lapses'

// The neuro-behavioural condition of config/rules/conditions.csv that joins the
// two reaction signals with mood and sleep (T-73, Bio 2). Assumption until Bio 2
// writes the row: no condition is shown while the file has another id.
export const PSYCHOLOGICAL_CONDITION_ID = 'current_psychological_state'
