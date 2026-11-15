import { createTheme } from '@mui/material/styles'
import type { ColorSystemOptions, Shadows } from '@mui/material/styles'
import {
  COLORS,
  FOCUS_RING,
  FONTS,
  RADIUS,
  TAP_TARGET,
  TYPE_SCALE,
  type ThemeMode,
  type TypeStep,
} from './tokens'

// The HeMoSo theme of frontend/sdd/style-guide.md. Values come from tokens.ts;
// nothing here is a number or a colour of its own.
//
// Colours are referenced as MUI's own CSS variables (`--mui-palette-...`), which
// exist because cssVariables is on and are resolved per colour scheme. An
// override written with a hex value would keep the dark colours on the light
// theme.

declare module '@mui/material/styles' {
  interface Palette {
    /** Edge of a control (input, select, outlined button), 3:1 or more. */
    borderControl: { main: string }
  }
  interface PaletteOptions {
    borderControl?: { main?: string } | undefined
  }
}

declare module '@mui/material/styles' {
  interface TypographyVariants {
    /** App name in the header (guide 3.2). */
    display: VariantStyle
    /** The latest value on a card: monospace and large. */
    value: VariantStyle
    /** Labels, badges and metadata: monospace, uppercase, tracked. */
    label: VariantStyle
  }
  interface TypographyVariantsOptions {
    display?: VariantStyle
    value?: VariantStyle
    label?: VariantStyle
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true
    value: true
    label: true
  }
}

/** The CSS one typography variant applies. */
type VariantStyle = Record<string, string | number>

// The colour of one thing MUI paints, as the variable it generates.
const V = {
  background: 'var(--mui-palette-background-default)',
  surface: 'var(--mui-palette-background-paper)',
  text: 'var(--mui-palette-text-primary)',
  textMuted: 'var(--mui-palette-text-secondary)',
  divider: 'var(--mui-palette-divider)',
  borderControl: 'var(--mui-palette-borderControl-main)',
  accent: 'var(--mui-palette-secondary-main)',
  primary: 'var(--mui-palette-primary-main)',
  onPrimary: 'var(--mui-palette-primary-contrastText)',
  signal: 'var(--mui-palette-error-main)',
  warning: 'var(--mui-palette-warning-main)',
  success: 'var(--mui-palette-success-main)',
  info: 'var(--mui-palette-info-main)',
} as const

// 3 px accent outline with a 2 px offset (7.5). Never removed, on any control.
const FOCUS_RING_STYLE = {
  outline: `${FOCUS_RING.width}px solid ${V.accent}`,
  outlineOffset: `${FOCUS_RING.offset}px`,
} as const

function typeStep(step: TypeStep): VariantStyle {
  return {
    fontFamily: FONTS[step.family ?? 'body'],
    fontSize: `${step.size}px`,
    lineHeight: `${step.lineHeight}px`,
    fontWeight: step.weight,
    ...(step.tracking === undefined ? {} : { letterSpacing: step.tracking }),
  }
}

type SchemePalette = NonNullable<ColorSystemOptions['palette']>

function palette(mode: ThemeMode): SchemePalette {
  const c = COLORS[mode]
  return {
    mode,
    primary: { main: c['color-interactive'], contrastText: c['color-on-interactive'] },
    // Accent: links, the selected tab and the focus ring (2.1).
    secondary: { main: c['color-accent'], contrastText: c['color-bg'] },
    info: { main: c['color-accent'], contrastText: c['color-bg'] },
    // The status colours of 2.2. Text is always set on them by the component,
    // so contrastText only matters for a filled notice.
    success: { main: c['status-in-range-text'], contrastText: c['color-bg'] },
    warning: { main: c['status-attention-text'], contrastText: c['color-bg'] },
    error: { main: c['color-signal'], contrastText: c['color-bg'] },
    text: {
      primary: c['color-text'],
      secondary: c['color-text-muted'],
      disabled: c['color-text-muted'],
    },
    divider: c['color-border'],
    background: { default: c['color-bg'], paper: c['color-surface'] },
    borderControl: { main: c['color-border-control'] },
    // The header band and the tab bar (7.1).
    AppBar: {
      defaultBg: c['color-bg-raised'],
      darkBg: c['color-bg-raised'],
      darkColor: c['color-text'],
    },
  }
}

export const theme = createTheme({
  // Dark is the theme of the guide (2.1); the light one comes from the
  // operating system, with no flash of the wrong colours and no script.
  cssVariables: { colorSchemeSelector: 'media' },
  defaultColorScheme: 'dark',
  colorSchemes: {
    dark: { palette: palette('dark') },
    light: { palette: palette('light') },
  },
  // Spacing is the guide's 4 px step (4.2): theme.spacing(4) is 16 px.
  spacing: 4,
  shape: { borderRadius: RADIUS.card },
  // No elevation and no drop shadows anywhere: thin borders carry the structure
  // (4.3). The guide allows one soft shadow in the light theme at most.
  shadows: Array.from({ length: 25 }, () => 'none') as Shadows,
  typography: {
    fontFamily: FONTS.body,
    fontSize: TYPE_SCALE.body.size,
    h1: typeStep(TYPE_SCALE.h1),
    h2: typeStep(TYPE_SCALE.h2),
    // The main sentence of a card (7.3): body type at the larger step.
    h3: typeStep(TYPE_SCALE.bodyLarge),
    body1: typeStep(TYPE_SCALE.body),
    body2: typeStep(TYPE_SCALE.small),
    caption: typeStep(TYPE_SCALE.small),
    button: { ...typeStep(TYPE_SCALE.body), fontWeight: 600, textTransform: 'uppercase' },
    display: typeStep(TYPE_SCALE.display),
    value: { ...typeStep(TYPE_SCALE.value), fontVariantNumeric: 'tabular-nums' },
    label: { ...typeStep(TYPE_SCALE.label), textTransform: 'uppercase' },
  },
  components: {
    // The focus ring of 7.5 for everything MUI renders, and the switch that
    // turns every MUI transition off under prefers-reduced-motion (9).
    MuiCssBaseline: {
      styleOverrides: {
        ':focus-visible': FOCUS_RING_STYLE,
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        // A state class needs the slot of the root, not a slot of its own.
        root: { '&.Mui-focusVisible': FOCUS_RING_STYLE },
      },
    },
    // Primary, secondary and danger buttons (7.5): radius 2, uppercase, never
    // an elevation.
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: RADIUS.small,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: TYPE_SCALE.label.tracking,
          minHeight: TAP_TARGET,
          minWidth: TAP_TARGET,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&.Mui-disabled': { opacity: 0.5 },
        },
        contained: {
          backgroundColor: V.primary,
          color: V.onPrimary,
          '&:hover': { backgroundColor: V.primary, filter: 'brightness(1.12)' },
        },
        outlined: {
          borderColor: V.borderControl,
          color: V.text,
          '&:hover': { borderColor: V.accent, color: V.accent },
        },
        text: {
          color: V.accent,
          '&:hover': { color: V.text },
        },
      },
    },
    // Cards and panels (4.3): 1 px border, radius 4, no shadow.
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${V.divider}`,
          borderRadius: RADIUS.card,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${V.divider}`,
          borderRadius: RADIUS.card,
          boxShadow: 'none',
          backgroundColor: V.surface,
        },
      },
    },
    // Attention badges (7.4): uppercase monospace label, 1 px border in the
    // text colour, radius 2.
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.small,
          border: '1px solid currentColor',
          backgroundColor: 'transparent',
          fontFamily: FONTS.mono,
          fontSize: `${TYPE_SCALE.label.size}px`,
          lineHeight: `${TYPE_SCALE.label.lineHeight}px`,
          letterSpacing: TYPE_SCALE.label.tracking,
          fontWeight: 500,
          textTransform: 'uppercase',
          minHeight: 28,
        },
        label: { paddingInline: 8 },
        icon: { color: 'inherit' },
      },
    },
    // Tabs (7.2): uppercase monospace, 44 px, selected in the text colour and
    // the accent underline, so the state is never colour alone.
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: TAP_TARGET,
          paddingInline: 16,
          fontFamily: FONTS.mono,
          fontSize: `${TYPE_SCALE.label.size}px`,
          lineHeight: `${TYPE_SCALE.label.lineHeight}px`,
          letterSpacing: TYPE_SCALE.label.tracking,
          fontWeight: 500,
          textTransform: 'uppercase',
          color: V.textMuted,
          opacity: 1,
          '&.Mui-selected': { color: V.text, fontWeight: 600 },
        },
      },
    },
    // Notices (7.7): a 2 px left rule in the notice colour, radius 4, on the
    // card surface. The icon repeats the tone, the words carry it.
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.card,
          border: `1px solid ${V.divider}`,
          borderLeftWidth: 2,
          borderLeftStyle: 'solid',
          borderLeftColor: V.accent,
          backgroundColor: V.surface,
          color: V.text,
          alignItems: 'flex-start',
          '&.MuiAlert-colorInfo': { borderLeftColor: V.info },
          '&.MuiAlert-colorWarning': { borderLeftColor: V.warning },
          '&.MuiAlert-colorSuccess': { borderLeftColor: V.success },
          '&.MuiAlert-colorError': { borderLeftColor: V.signal },
        },
        icon: { color: 'inherit', paddingTop: 2, marginRight: 8 },
        message: { padding: 0 },
      },
    },
    // Form fields (7.6): 44 px high, 1 px border in the control colour, radius
    // 4, the label in the technical style. The error sits under its field in
    // the attention colour, which is the pair the contrast test measures.
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiFormHelperText-root': {
            margin: '4px 0 0',
            fontFamily: FONTS.body,
            fontSize: `${TYPE_SCALE.small.size}px`,
            lineHeight: `${TYPE_SCALE.small.lineHeight}px`,
            '&.Mui-error': { color: V.warning },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: FONTS.mono,
          fontSize: `${TYPE_SCALE.label.size}px`,
          letterSpacing: TYPE_SCALE.label.tracking,
          textTransform: 'uppercase',
          color: V.textMuted,
          '&.Mui-focused': { color: V.accent },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: TAP_TARGET,
          borderRadius: RADIUS.card,
          backgroundColor: V.surface,
          color: V.text,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: V.borderControl },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: V.accent },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: V.accent,
            borderWidth: 2,
          },
          // A native select inside the field keeps no box of its own: the
          // outlined field is the box.
          '& select': {
            border: 0,
            backgroundColor: 'transparent',
            color: 'inherit',
            font: 'inherit',
            minHeight: 0,
          },
        },
      },
    },
    // The person picker and the History picker (7.6, 10).
    MuiSelect: {
      styleOverrides: {
        select: {
          minHeight: TAP_TARGET,
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
    // The 1 to 5 scale (7.6): the chosen value is marked by the radio itself and
    // by the accent, never by colour alone.
    MuiRadio: {
      styleOverrides: {
        root: {
          color: V.textMuted,
          padding: 8,
          '&.Mui-checked': { color: V.accent },
        },
      },
    },
  },
})
