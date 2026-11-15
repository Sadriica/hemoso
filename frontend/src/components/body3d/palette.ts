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

/**
 * The colours the figure is painted with, the same in both themes.
 *
 * A lit region glows by adding light on top of the body, and added light can
 * only brighten. The dark text tokens of the light theme (for example
 * status-attention-text #6B3A06) therefore vanished on a mid-grey body: every
 * state colour was between 1.2:1 and 2.4:1 against it. So the figure takes the
 * bright tokens of the dark set on a dark body, whichever theme the page is in.
 * The stage behind it is a themed CSS surface, so the figure still reads there.
 *
 * Body base is `color-border` of the dark set (#3A4A5E). Contrast of each glow
 * against it:
 *   in range #5FD49A 4.9, attention #F5C542 5.6, review #FF8A70 3.9,
 *   no data / muted #A9B3C1 4.3, accent #8EC5FF 5.0 (selected places),
 *   text #F2F1E9 8.0 (pain dot);
 *   systems: cardiovascular #FF7A70 3.6, thermoregulation #F5A524 4.4,
 *   sleep #9AA5FF 4.0, neuro #C39BFF 4.1, metabolic #3ED1C0 4.8.
 * All are at least 3:1; palette.test.ts keeps it so.
 */
export function sceneColors(): ColorTokens {
  return COLORS.dark
}

/** The token of the body base, in the set `sceneColors` returns. */
export const BODY_BASE_TOKEN = 'color-border' as const satisfies keyof ColorTokens

function channel(value: number): number {
  const unit = value / 255
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16)
  const green = parseInt(hex.slice(3, 5), 16)
  const blue = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
}

/** WCAG contrast ratio of two #RRGGBB colours, 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

const STATUS_TOKENS: Record<StatusKind, keyof ColorTokens> = {
  in_range: 'status-in-range-text',
  // Outside reads as the amber attention pair since the Sat 23:00 palette change.
  outside: 'status-attention-text',
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
