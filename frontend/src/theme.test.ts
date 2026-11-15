/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLORS, type ThemeMode } from './theme/tokens'

// Every pair below appears on screen; a pair under the WCAG minimum fails here.
// The colours come from src/theme/tokens.ts, which is the only place the theme
// reads them from, so the test cannot drift from what the screens paint.

type ColorToken = keyof (typeof COLORS)['dark']

interface ColorPair {
  /** What the pair is, in the words of the screen. */
  name: string
  front: ColorToken
  back: ColorToken
}

// Text and badge colours: at least 4.5:1 (WCAG 2.1 AA for normal text).
const TEXT_PAIRS: ColorPair[] = [
  { name: 'body text on the page', front: 'color-text', back: 'color-bg' },
  { name: 'body text on a card', front: 'color-text', back: 'color-surface' },
  { name: 'body text on the header band', front: 'color-text', back: 'color-bg-raised' },
  { name: 'muted text on the page', front: 'color-text-muted', back: 'color-bg' },
  { name: 'muted text on a card', front: 'color-text-muted', back: 'color-surface' },
  { name: 'muted text on the header band', front: 'color-text-muted', back: 'color-bg-raised' },
  // The "who acts" line under a card's next step.
  { name: 'who acts line on a card', front: 'color-text', back: 'color-surface' },
  { name: 'link on the page', front: 'color-accent', back: 'color-bg' },
  { name: 'link on a card', front: 'color-accent', back: 'color-surface' },
  { name: 'link on the header band', front: 'color-accent', back: 'color-bg-raised' },
  { name: 'field error on the page', front: 'status-attention-text', back: 'color-bg' },
  { name: 'primary button text', front: 'color-on-interactive', back: 'color-interactive' },
  { name: 'in range badge', front: 'status-in-range-text', back: 'status-in-range-bg' },
  { name: 'attention badge', front: 'status-attention-text', back: 'status-attention-bg' },
  { name: 'no data badge', front: 'status-no-data-text', back: 'status-no-data-bg' },
  { name: 'signal red on a card', front: 'color-signal', back: 'color-surface' },
  // The face panel (T-58): its sentences and its one destructive action sit on
  // the panel surface, which is the card surface.
  { name: 'face panel text', front: 'color-text', back: 'color-surface' },
  { name: 'face panel delete action', front: 'color-signal', back: 'color-surface' },
]

// Non-text contrast (WCAG 1.4.11): the focus outline and the edge of a control
// need 3:1 against what they sit on.
const UI_PAIRS: ColorPair[] = [
  { name: 'focus outline on the page', front: 'color-accent', back: 'color-bg' },
  { name: 'focus outline on a card', front: 'color-accent', back: 'color-surface' },
  { name: 'focus outline on the header band', front: 'color-accent', back: 'color-bg-raised' },
  { name: 'control border on the page', front: 'color-border-control', back: 'color-bg' },
  { name: 'control border on a card', front: 'color-border-control', back: 'color-surface' },
  { name: 'control border on the header band', front: 'color-border-control', back: 'color-bg-raised' },
]

function channel(value: number): number {
  const fraction = value / 255
  return fraction <= 0.04045
    ? fraction / 12.92
    : ((fraction + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const digits = hex.replace('#', '')
  const [red, green, blue] = [0, 2, 4].map((at) =>
    channel(Number.parseInt(digits.slice(at, at + 2), 16)),
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (left, right) => right - left,
  )
  return (lighter + 0.05) / (darker + 0.05)
}

const themes: ThemeMode[] = ['dark', 'light']

function ratio(theme: ThemeMode, pair: ColorPair): number {
  return contrastRatio(COLORS[theme][pair.front], COLORS[theme][pair.back])
}

describe('theme colours', () => {
  for (const theme of themes) {
    describe(`${theme} theme`, () => {
      it('defines every colour the screens use', () => {
        const used = [...TEXT_PAIRS, ...UI_PAIRS].flatMap((pair) => [
          pair.front,
          pair.back,
        ])
        for (const name of new Set(used)) {
          expect(COLORS[theme][name], name).toMatch(/^#[0-9a-f]{6}$/i)
        }
      })

      for (const pair of TEXT_PAIRS) {
        it(`keeps 4.5:1 for ${pair.name}`, () => {
          expect(ratio(theme, pair)).toBeGreaterThanOrEqual(4.5)
        })
      }

      for (const pair of UI_PAIRS) {
        it(`keeps 3:1 for ${pair.name}`, () => {
          expect(ratio(theme, pair)).toBeGreaterThanOrEqual(3)
        })
      }
    })
  }
})

// While the screens still paint themselves from styles.css (57b moves them to
// MUI), the two places must agree: a colour changed in one and not in the other
// would put a pair that passes here on a screen that fails.
describe('styles.css during the move to MUI', () => {
  const stylesheet = readFileSync('src/styles.css', 'utf8')
  const lightAt = stylesheet.indexOf('@media (prefers-color-scheme: light)')
  const sections: Record<ThemeMode, string> = {
    dark: stylesheet.slice(0, lightAt),
    light: stylesheet.slice(lightAt),
  }
  const ROOT_BLOCK = /:root\s*\{([^}]*)\}/
  const COLOR_DECLARATION = /--([a-z0-9-]+):\s*#([0-9a-f]{6})\s*;/gi

  function readColors(section: string): Map<string, string> {
    const root = ROOT_BLOCK.exec(section)
    if (!root) throw new Error('styles.css has no :root block here')
    const colors = new Map<string, string>()
    for (const match of root[1].matchAll(COLOR_DECLARATION)) {
      colors.set(match[1], `#${match[2]}`)
    }
    return colors
  }

  for (const theme of themes) {
    it(`carries the ${theme} colours of tokens.ts`, () => {
      const colors = readColors(sections[theme])
      for (const [name, value] of Object.entries(COLORS[theme])) {
        // The grid is a translucent line, not a hex colour, and it has no rule
        // in styles.css beyond the background image.
        if (!value.startsWith('#')) continue
        expect(colors.get(name)?.toLowerCase(), `--${name}`).toBe(
          value.toLowerCase(),
        )
      }
    })
  }
})
