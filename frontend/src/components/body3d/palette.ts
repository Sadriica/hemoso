// The colours of the 3D body, read from the design tokens (DESIGN.md 2) so the
// canvas and the CSS paintings agree. three.js cannot read a CSS variable, so
// the values come from src/theme/tokens.ts, the same file styles.css mirrors.

import type { StatusKind } from '../../icons/meta'
import { COLORS, type ColorTokens } from '../../theme/tokens'
import type { BodyRegionSystem } from './regions'

/** The colours for the theme the operating system asks for. */
export function themeColors(): ColorTokens {
  const light =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  return light ? COLORS.light : COLORS.dark
}

const STATUS_TOKENS: Record<StatusKind, keyof ColorTokens> = {
  in_range: 'status-in-range-text',
  outside: 'status-outside-text',
  review: 'status-review-text',
  no_data: 'status-no-data-text',
  warning: 'status-attention-text',
}

// Only the systems with an indicator have a colour (DESIGN.md 2.3). The others
// light in muted text until Eng 1 gives them one.
const SYSTEM_TOKENS: Partial<Record<BodyRegionSystem, keyof ColorTokens>> = {
  cardiovascular: 'system-cardiovascular',
  thermoregulation: 'system-thermoregulation',
  sleep: 'system-sleep',
  neuro_behavioural: 'system-neuro',
  metabolic: 'system-metabolic',
}

/** The colour of one state, for the regions a status view lights. */
export function statusColor(colors: ColorTokens, state: StatusKind): string {
  return colors[STATUS_TOKENS[state]]
}

/** The colour of one body system, or muted text when it has none yet. */
export function systemColor(colors: ColorTokens, system: BodyRegionSystem): string {
  const token = SYSTEM_TOKENS[system]
  return token === undefined ? colors['color-text-muted'] : colors[token]
}

// One marker shape and colour per kind of mark the astronaut can leave
// (Wambi: pain, swelling, bruise, cut, burn, sprain). Plain words only. Pain,
// the default, takes the text colour: it is the one dot that has to read on top
// of a glowing region.
export const MARKER_TOKENS = {
  pain: 'color-text',
  swelling: 'system-sleep',
  bruise: 'system-neuro',
  cut_or_scrape: 'system-cardiovascular',
  burn: 'system-thermoregulation',
  sprain_or_strain: 'system-metabolic',
} as const satisfies Record<string, keyof ColorTokens>
