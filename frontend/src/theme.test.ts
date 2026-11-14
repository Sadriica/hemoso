/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The stylesheet is the only place where colours exist, so this test reads it
// instead of keeping a second copy of the numbers. Every pair below appears on
// screen; a pair under the WCAG minimum fails here.
//
// The file is read as text from the project root because Vitest turns any CSS
// import, even with ?raw, into an empty module.

const stylesheet = readFileSync('src/styles.css', 'utf8')

const LIGHT_THEME_AT = '@media (prefers-color-scheme: light)'

const ROOT_BLOCK = /:root\s*\{([^}]*)\}/
const COLOR_DECLARATION = /--([a-z0-9-]+):\s*#([0-9a-f]{6})\s*;/gi

// Dark is the default theme, so its tokens sit in the first :root block and the
// light theme overrides them further down the file.
type Theme = 'dark' | 'light'

interface ColorPair {
  /** What the pair is, in the words of the screen. */
  name: string
  front: string
  back: string
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

function themeSections(css: string): Record<Theme, string> {
  const lightAt = css.indexOf(LIGHT_THEME_AT)
  if (lightAt < 0) throw new Error('styles.css has no light theme block')
  return { dark: css.slice(0, lightAt), light: css.slice(lightAt) }
}

function readColors(section: string): Map<string, string> {
  const root = ROOT_BLOCK.exec(section)
  if (!root) throw new Error('styles.css has no :root block here')
  const colors = new Map<string, string>()
  for (const match of root[1].matchAll(COLOR_DECLARATION)) {
    colors.set(match[1], `#${match[2].toLowerCase()}`)
  }
  return colors
}

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

const sections = themeSections(stylesheet)
const colors: Record<Theme, Map<string, string>> = {
  dark: readColors(sections.dark),
  light: readColors(sections.light),
}
const themes: Theme[] = ['dark', 'light']

function token(theme: Theme, name: string): string {
  const value = colors[theme].get(name)
  if (!value) throw new Error(`the ${theme} theme has no --${name}`)
  return value
}

function ratio(theme: Theme, pair: ColorPair): number {
  return contrastRatio(token(theme, pair.front), token(theme, pair.back))
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
          expect(colors[theme].has(name), `--${name}`).toBe(true)
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
