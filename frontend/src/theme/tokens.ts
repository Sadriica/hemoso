// The design tokens of frontend/DESIGN.md (Observatory, Sat 14 Nov 2026), in
// TypeScript so the theme and the contrast test read the same numbers.
// Nothing on a screen is a colour, size or space of its own: it comes from here.
//
// Dark is the default theme (guide 2.1); the light theme is for bright rooms and
// printing and comes from the operating system preference.

export type ThemeMode = 'dark' | 'light'

/** Every colour the app paints, named as the guide names it. */
export interface ColorTokens {
  /** Page background (2.1). */
  'color-bg': string
  /** Header band and tab bar. */
  'color-bg-raised': string
  /** Cards and panels. */
  'color-surface': string
  /** Decorative 1 px rules and card borders. */
  'color-border': string
  /** Edge of a control: 3:1 or more against the page and the card. */
  'color-border-control': string
  'color-text': string
  /** Labels and metadata. */
  'color-text-muted': string
  /** Links, selected tab, focus ring. */
  'color-accent': string
  /** Primary buttons, with `color-on-interactive` on top. */
  'color-interactive': string
  'color-on-interactive': string
  /** Rare emphasis only: the most urgent attention level and destructive actions. */
  'color-signal': string
  /** Technical grid on the page background (5), dark theme only. */
  'color-grid': string
  /** Attention badges (2.2): state is always icon, text and colour together. */
  'status-in-range-text': string
  'status-in-range-bg': string
  'status-attention-text': string
  'status-attention-bg': string
  'status-no-data-text': string
  'status-no-data-bg': string
  'status-outside-text': string
  'status-outside-bg': string
  'status-review-text': string
  'status-review-bg': string
  /** One colour per body system: icons, body zones and planetarium orbits. */
  'system-cardiovascular': string
  'system-thermoregulation': string
  'system-sleep': string
  'system-neuro': string
  'system-metabolic': string
}

export const COLORS: Record<ThemeMode, ColorTokens> = {
  dark: {
    'color-bg': '#070B10',
    'color-bg-raised': '#0C131D',
    'color-surface': '#121B27',
    'color-border': '#3A4A5E',
    'color-border-control': '#6F8197',
    'color-text': '#F2F1E9',
    'color-text-muted': '#A9B3C1',
    'color-accent': '#8EC5FF',
    'color-interactive': '#2563EB',
    'color-on-interactive': '#FFFFFF',
    'color-signal': '#FF6A4D',
    'color-grid': 'rgba(255, 255, 255, 0.04)',
    'status-in-range-text': '#5FD49A',
    'status-in-range-bg': '#0D2A1F',
    'status-outside-text': '#8EC5FF',
    'status-outside-bg': '#0F2339',
    'status-attention-text': '#F5C542',
    'status-attention-bg': '#2C2407',
    'status-review-text': '#FF8A70',
    'status-review-bg': '#33140E',
    'status-no-data-text': '#A9B3C1',
    'status-no-data-bg': '#18222F',
    'system-cardiovascular': '#FF7A70',
    'system-thermoregulation': '#F5A524',
    'system-sleep': '#9AA5FF',
    'system-neuro': '#C39BFF',
    'system-metabolic': '#3ED1C0',
  },
  light: {
    'color-bg': '#F3F4F0',
    'color-bg-raised': '#FFFFFF',
    'color-surface': '#FFFFFF',
    'color-border': '#C5CDD8',
    'color-border-control': '#6B7A8F',
    'color-text': '#0B1220',
    'color-text-muted': '#475266',
    'color-accent': '#0B4AA8',
    'color-interactive': '#1D4ED8',
    'color-on-interactive': '#FFFFFF',
    'color-signal': '#B82A14',
    'color-grid': 'transparent',
    'status-in-range-text': '#14532D',
    'status-in-range-bg': '#DCFCE7',
    'status-outside-text': '#0B4AA8',
    'status-outside-bg': '#DBEAFE',
    'status-attention-text': '#6B3A06',
    'status-attention-bg': '#FEF3C7',
    'status-review-text': '#9A2A14',
    'status-review-bg': '#FDE4DE',
    'status-no-data-text': '#374151',
    'status-no-data-bg': '#E5E7EB',
    'system-cardiovascular': '#C7352B',
    'system-thermoregulation': '#A85D00',
    'system-sleep': '#4F46E5',
    'system-neuro': '#7C3AED',
    'system-metabolic': '#0F766E',
  },
}

// Type families (DESIGN.md 4.1). Planned files are self-hosted from
// frontend/public with their licence once Eng 1 approves; until then the
// system fallbacks show. No font ever comes from a CDN.
export const FONTS = {
  display: "'Barlow Condensed', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif",
  body: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
} as const

export interface TypeStep {
  /** Font size in px. */
  size: number
  /** Line height in px. */
  lineHeight: number
  weight: number
  /** Letter spacing; the label style is the only one with tracking. */
  tracking?: string
  family?: keyof typeof FONTS
}

// DESIGN.md 4.2. `hero` is the one big uppercase line of each phase.
export const TYPE_SCALE: Record<string, TypeStep> = {
  hero: { size: 64, lineHeight: 60, weight: 700, tracking: '0.01em', family: 'display' },
  display: { size: 40, lineHeight: 40, weight: 700, tracking: '0.01em', family: 'display' },
  h1: { size: 28, lineHeight: 36, weight: 700, family: 'display' },
  h2: { size: 22, lineHeight: 30, weight: 600, family: 'display' },
  value: { size: 36, lineHeight: 40, weight: 500, family: 'mono' },
  bodyLarge: { size: 18, lineHeight: 28, weight: 400, family: 'body' },
  body: { size: 16, lineHeight: 24, weight: 400, family: 'body' },
  small: { size: 14, lineHeight: 20, weight: 400, family: 'body' },
  label: { size: 12, lineHeight: 16, weight: 500, tracking: '0.08em', family: 'mono' },
}

// Below 600 px wide the display steps shrink; the other steps stay.
export const TYPE_SCALE_SMALL = {
  hero: { size: 44, lineHeight: 42 },
  display: { size: 32, lineHeight: 34 },
  h1: { size: 24, lineHeight: 32 },
  h2: { size: 20, lineHeight: 28 },
  value: { size: 30, lineHeight: 36 },
} as const

// Spacing steps (DESIGN.md 5), 4 px base.
export const SPACE = {
  s1: 4,
  s2: 8,
  s3: 16,
  s4: 24,
  s5: 32,
  s6: 48,
  s7: 64,
} as const

// Shape (DESIGN.md 6): 2 px for buttons and badges, 4 px for cards and inputs.
export const RADIUS = {
  small: 2,
  card: 4,
} as const

// Layout (DESIGN.md 5): content stops at 1200 px and the side margin grows with the
// viewport. A column is always inside the page's own width (REQ-32).
export const LAYOUT = {
  containerWidth: 1200,
  gutter: { phone: 20, tablet: 32, desktop: 64 },
} as const

/** Every target a finger has to hit (DESIGN.md 9). */
export const TAP_TARGET = 44

/** The focus ring of DESIGN.md 9: 3 px accent, 2 px offset, never removed. */
export const FOCUS_RING = {
  width: 3,
  offset: 2,
} as const

/** Durations in ms (DESIGN.md 7). State changes never pass `slow`. */
export const MOTION = {
  fast: 150,
  base: 250,
  slow: 400,
  cinematic: 1200,
} as const
