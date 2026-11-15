/**
 * Drawing bounds only. They map a value onto the size of a figure (needle
 * angle, fill height, moon height, mouth curve). They are NOT clinical
 * ranges: no zone, no "normal" band, no colour change by value. A value
 * outside a bound is drawn at the bound.
 */
export const SCALES: Record<string, { min: number; max: number }> = {
  bp_sys_mmhg: { min: 80, max: 200 },
  bp_dia_mmhg: { min: 40, max: 130 },
  temp_core_c: { min: 30, max: 42 },
  sleep_h: { min: 0, max: 12 },
  mood_1_5: { min: 1, max: 5 },
  // A reaction time and a count of lapses: drawing bounds only, not a range.
  reaction_median_ms: { min: 0, max: 600 },
  reaction_lapses: { min: 0, max: 5 },
  glucose_mgdl: { min: 40, max: 300 },
  // Drawing bounds of the daily self-rating, the water drunk and the body
  // mass: where a mark sits on a figure, never a range that means something.
  appetite_1_5: { min: 1, max: 5 },
  fluid_intake_ml: { min: 0, max: 4000 },
  body_mass_kg: { min: 40, max: 140 },
}

/** Value as 0 to 1 on the drawing scale of `id`, clamped at the bounds. */
export function fraction(id: string, value: number): number {
  const s = SCALES[id]
  if (!s || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, (value - s.min) / (s.max - s.min)))
}
