import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Instrument, { fraction, SCALES } from './index'

const draw = (id: string, value: number, reducedMotion = false) =>
  render(<Instrument indicatorId={id} value={value} reducedMotion={reducedMotion} />).container

const num = (el: Element | null, attr: string) => Number(el?.getAttribute(attr))

describe('Instrument', () => {
  it('is hidden from assistive tech and uses the system colour', () => {
    const root = draw('hr_bpm', 70).firstElementChild!
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect((root as HTMLElement).style.color).toBe('var(--system-cardiovascular)')
    expect(draw('mood_1_5', 3).firstElementChild).toHaveStyle({ color: 'var(--system-neuro)' })
  })

  it('renders nothing for an unknown id', () => {
    expect(draw('nope', 1).firstChild).toBeNull()
  })

  it('beats at the same pace whatever the value', () => {
    const a = draw('hr_bpm', 50).innerHTML
    const b = draw('hr_bpm', 150).innerHTML
    expect(a).toBe(b)
    expect(draw('hr_bpm', 70).querySelector('.ins-beat')).not.toBeNull()
  })

  it('turns the needle with the value and clamps at the bounds', () => {
    const lo = num(draw('bp_sys_mmhg', 100).querySelector('.ins-needle'), 'data-angle')
    const hi = num(draw('bp_sys_mmhg', 160).querySelector('.ins-needle'), 'data-angle')
    expect(hi).toBeGreaterThan(lo)
    expect(num(draw('bp_sys_mmhg', 999).querySelector('.ins-needle'), 'data-angle')).toBe(90)
    expect(num(draw('bp_dia_mmhg', 0).querySelector('.ins-needle'), 'data-angle')).toBe(-90)
  })

  it('fills the thermometer with the value', () => {
    const lo = num(draw('temp_core_c', 35).querySelector('.ins-level'), 'data-fill')
    const hi = num(draw('temp_core_c', 38).querySelector('.ins-level'), 'data-fill')
    expect(hi).toBeGreaterThan(lo)
    expect(num(draw('temp_core_c', 99).querySelector('.ins-level'), 'data-fill')).toBe(1)
    expect(num(draw('temp_core_c', -5).querySelector('.ins-level'), 'data-fill')).toBe(0)
  })

  it('raises the moon with the hours', () => {
    const lo = num(draw('sleep_h', 3).querySelector('.ins-moon'), 'data-offset')
    const hi = num(draw('sleep_h', 8).querySelector('.ins-moon'), 'data-offset')
    expect(hi).toBeLessThan(lo)
    expect(num(draw('sleep_h', 30).querySelector('.ins-moon'), 'data-offset')).toBe(0)
  })

  it('changes the mouth from 1 to 5', () => {
    const mouths = [1, 2, 3, 4, 5].map((v) => draw('mood_1_5', v).querySelector('.ins-mouth')!.getAttribute('d'))
    expect(new Set(mouths).size).toBe(5)
    const y = (v: number) => num(draw('mood_1_5', v).querySelector('.ins-mouth'), 'data-y')
    expect(y(1)).toBeLessThan(y(3))
    expect(y(5)).toBeGreaterThan(y(3))
    expect(y(9)).toBe(y(5))
  })

  it('fills the drop with the value', () => {
    const lo = num(draw('glucose_mgdl', 80).querySelector('.ins-level'), 'data-offset')
    const hi = num(draw('glucose_mgdl', 200).querySelector('.ins-level'), 'data-offset')
    expect(hi).toBeLessThan(lo)
  })

  it('draws the final state with no animation class under reduced motion', () => {
    for (const id of Object.keys(SCALES).concat('hr_bpm')) {
      const root = draw(id, SCALES[id]?.max ?? 70, true).firstElementChild!
      expect(root.className).not.toContain('instrument--anim')
      expect(root.className).toContain('instrument--still')
    }
    expect(draw('hr_bpm', 70).firstElementChild!.className).toContain('instrument--anim')
  })

  it('keeps fraction inside 0 to 1 and handles bad numbers', () => {
    expect(fraction('sleep_h', NaN)).toBe(0)
    expect(fraction('unknown', 5)).toBe(0)
    expect(fraction('sleep_h', 6)).toBe(0.5)
  })
})
