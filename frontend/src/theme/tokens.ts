// The design tokens of frontend/sdd/style-guide.md version 1.0 (Sat 14 Nov
// 2026), in TypeScript so the theme and the contrast test read the same numbers.
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
}

export const COLORS: Record<ThemeMode, ColorTokens> = {
  dark: {
    'color-bg': '#080B12',
    'color-bg-raised': '#101827',
    'color-surface': '#182333',
    'color-border': '#536273',
    'color-border-control': '#6B7A8C',
    'color-text': '#FFFFFF',
    'color-text-muted': '#A7B0BE',
    'color-accent': '#A9D6FF',
    'color-interactive': '#2563EB',
    'color-on-interactive': '#FFFFFF',
    'color-signal': '#FF5A42',
    'color-grid': 'rgba(255, 255, 255, 0.04)',
    'status-in-range-text': '#4ADE80',
    'status-in-range-bg': '#0F2A1C',
    'status-attention-text': '#FACC15',
    'status-attention-bg': '#2E2606',
    'status-no-data-text': '#A7B0BE',
    'status-no-data-bg': '#1C2635',
  },
  light: {
    'color-bg': '#F4F6F9',
    'color-bg-raised': '#FFFFFF',
    'color-surface': '#FFFFFF',
    'color-border': '#C5CDD8',
    'color-border-control': '#78859A',
    'color-text': '#0B1220',
    'color-text-muted': '#4A5568',
    'color-accent': '#0B3D91',
    'color-interactive': '#1D4ED8',
    'color-on-interactive': '#FFFFFF',
    'color-signal': '#C42D17',
    'color-grid': 'transparent',
    'status-in-range-text': '#14532D',
    'status-in-range-bg': '#DCFCE7',
    'status-attention-text': '#713F12',
    'status-attention-bg': '#FEF3C7',
    'status-no-data-text': '#374151',
    'status-no-data-bg': '#E5E7EB',
  },
}

// Type families (3.1). The guide names Inter, Public Sans and DM Mono, all SIL
// Open Font License, bundled with @fontsource packages. Those packages are not
// installed yet (each one needs a docs/DECISIONS.md row), and no font may come
// from a CDN, so the fallback stacks of the guide are what the screens show.
export const FONTS = {
  display: 'system-ui, "Segoe UI", Roboto, sans-serif',
  body: 'system-ui, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
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

// The app scale of 3.2, not the 80 px landing-page hero.
export const TYPE_SCALE: Record<string, TypeStep> = {
  display: { size: 32, lineHeight: 40, weight: 700, family: 'display' },
  h1: { size: 28, lineHeight: 36, weight: 700, family: 'display' },
  h2: { size: 22, lineHeight: 30, weight: 600, family: 'display' },
  value: { size: 36, lineHeight: 40, weight: 500, family: 'mono' },
  bodyLarge: { size: 18, lineHeight: 28, weight: 400, family: 'body' },
  body: { size: 16, lineHeight: 24, weight: 400, family: 'body' },
  small: { size: 14, lineHeight: 20, weight: 400, family: 'body' },
  label: { size: 12, lineHeight: 16, weight: 500, tracking: '0.06em', family: 'mono' },
}

// Below 600 px wide the display steps shrink (3.2); the other steps stay.
export const TYPE_SCALE_SMALL = {
  display: { size: 26, lineHeight: 32 },
  h1: { size: 24, lineHeight: 32 },
  h2: { size: 20, lineHeight: 28 },
  value: { size: 30, lineHeight: 36 },
} as const

// Spacing steps (4.2). MUI's own spacing unit is the 4 px of the guide, so
// theme.spacing(4) is 16 px and these names are the guide's numbers.
export const SPACE = {
  s1: 4,
  s2: 8,
  s3: 16,
  s4: 24,
  s5: 32,
  s6: 48,
  s7: 64,
} as const

// Shape (4.3): 2 px for buttons and badges, 4 px for cards and inputs.
export const RADIUS = {
  small: 2,
  card: 4,
} as const

// Layout (4.1): content stops at 1200 px and the side margin grows with the
// viewport. A column is always inside the page's own width (REQ-32).
export const LAYOUT = {
  containerWidth: 1200,
  gutter: { phone: 20, tablet: 32, desktop: 64 },
} as const

/** Every target a finger has to hit (7.5, 11). */
export const TAP_TARGET = 44

/** The focus ring of 7.5: 3 px accent, 2 px offset, never removed. */
export const FOCUS_RING = {
  width: 3,
  offset: 2,
} as const
