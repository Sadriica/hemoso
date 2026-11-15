import { describe, expect, it } from 'vitest'
import type { StatusKind } from '../../icons/meta'
import {
  BODY_BASE_TOKEN,
  MARKER_TOKENS,
  contrastRatio,
  sceneColors,
  statusColor,
  systemColor,
} from './palette'
import { BODY_REGION_SYSTEMS } from './regions'

// The glow of a region and the marks must read against the body at 3:1 (WCAG
// 1.4.11). The figure uses one palette in both themes, so one check covers both.
const MIN = 3

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for the same colour', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#3A4A5E', '#3A4A5E')).toBeCloseTo(1, 5)
  })
})

describe('body palette', () => {
  const colors = sceneColors()
  const base = colors[BODY_BASE_TOKEN]

  it('lights every state at 3:1 or more against the body', () => {
    const states: StatusKind[] = ['in_range', 'outside', 'review', 'no_data', 'warning']
    for (const state of states) {
      expect(contrastRatio(statusColor(colors, state), base)).toBeGreaterThanOrEqual(MIN)
    }
  })

  it('lights every system at 3:1 or more against the body', () => {
    for (const system of BODY_REGION_SYSTEMS) {
      expect(contrastRatio(systemColor(colors, system), base)).toBeGreaterThanOrEqual(MIN)
    }
  })

  it('keeps the selected and marked colours at 3:1 or more against the body', () => {
    expect(contrastRatio(colors['color-accent'], base)).toBeGreaterThanOrEqual(MIN)
    expect(contrastRatio(colors['color-text-muted'], base)).toBeGreaterThanOrEqual(MIN)
    for (const token of Object.values(MARKER_TOKENS)) {
      expect(contrastRatio(colors[token], base)).toBeGreaterThanOrEqual(MIN)
    }
  })
})
