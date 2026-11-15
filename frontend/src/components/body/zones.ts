export type BodySystem =
  | 'cardiovascular'
  | 'thermoregulation'
  | 'sleep'
  | 'neuro'
  | 'metabolic'

/** Stable zone ids, one per system. Later layers (muscles, bones) add their own groups. */
export const BODY_ZONES: readonly BodySystem[] = [
  'cardiovascular',
  'thermoregulation',
  'sleep',
  'neuro',
  'metabolic',
]
