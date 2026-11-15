/** Body systems that have an indicator today (names match `--system-*` tokens). */
export type BodySystemId = 'cardiovascular' | 'thermoregulation' | 'sleep' | 'neuro' | 'metabolic' | 'musculoskeletal';
/** The five state shapes of DESIGN.md 2.2. */
export type StatusKind = 'in_range' | 'outside' | 'review' | 'no_data' | 'warning';

/** Pixel sizes: inline with text, on a card, and as a hero figure. */
export const ICON_SIZES = { inline: 16, card: 24, hero: 40 } as const;

const SYSTEMS: Record<string, BodySystemId> = {
  hr_bpm: 'cardiovascular',
  bp_sys_mmhg: 'cardiovascular',
  bp_dia_mmhg: 'cardiovascular',
  temp_core_c: 'thermoregulation',
  sleep_h: 'sleep',
  mood_1_5: 'neuro',
  // The reaction check (T-71) writes these two; Phys adds the rows in T-72.
  reaction_median_ms: 'neuro',
  reaction_lapses: 'neuro',
  glucose_mgdl: 'metabolic',
  // Added on Sun 15 Nov, with the system their row of indicators.csv names.
  appetite_1_5: 'metabolic',
  fluid_intake_ml: 'metabolic',
  body_mass_kg: 'musculoskeletal',
};

/** Body system of an indicator id, or null when the id is unknown. */
export function systemOf(indicatorId: string): BodySystemId | null {
  return Object.hasOwn(SYSTEMS, indicatorId) ? SYSTEMS[indicatorId] : null;
}

/** CSS colour (a design token) for a body system. */
export function systemColor(system: BodySystemId): string {
  return `var(--system-${system})`;
}

