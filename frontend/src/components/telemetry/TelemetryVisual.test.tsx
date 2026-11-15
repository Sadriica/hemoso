import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TelemetryVisual, { Sparkline } from './TelemetryVisual'

// The figures of the report console are decoration: each one is drawn from
// the value it is given and hidden from assistive technology, because the
// value, the unit and the state are words beside it.
describe('TelemetryVisual', () => {
  it.each(['hr_bpm', 'bp', 'temp_core_c', 'sleep_h', 'mood_1_5', 'glucose_mgdl'])(
    'draws %s hidden from assistive technology, with no text of its own value',
    (kind) => {
      const { container } = render(<TelemetryVisual kind={kind} values={[72, 80]} />)
      const figure = container.querySelector(`[data-telemetry="${kind}"]`)
      expect(figure).toHaveAttribute('aria-hidden', 'true')
      expect(figure).toHaveClass('tele--live')
      // No number of the reading is written inside the drawing.
      expect(figure?.textContent).not.toMatch(/72|80/)
    },
  )

  it('draws appetite as the same five steps as mood, lit up to the rating', () => {
    const lit = (kind: string, value: number | null) =>
      Array.from(
        render(<TelemetryVisual kind={kind} values={[value]} />).container.querySelectorAll('.tele-fill'),
      ).map((el) => (el as SVGElement).style.opacity)
    expect(lit('appetite_1_5', 3)).toEqual(lit('mood_1_5', 3))
    expect(lit('appetite_1_5', 3)).toEqual(['0.45', '0.45', '1', '0', '0'])
    expect(lit('appetite_1_5', null)).toEqual(['0', '0', '0', '0', '0'])
  })

  it('fills the glass of fluid intake with the volume, within drawing bounds', () => {
    const level = (value: number | null) =>
      (render(<TelemetryVisual kind="fluid_intake_ml" values={[value]} />).container.querySelector(
        '.tele-fill',
      ) as SVGElement).style.transform
    expect(level(null)).toBe('scaleY(0)')
    expect(level(2000)).toBe('scaleY(0.5)')
    // Past the bound it is drawn at the bound, never as a verdict.
    expect(level(9000)).toBe('scaleY(1)')
    expect(level(-5)).toBe('scaleY(0)')
  })

  it('turns the needle of the body scale with the mass and clamps at the bounds', () => {
    const angle = (value: number | null) =>
      (render(<TelemetryVisual kind="body_mass_kg" values={[value]} />).container.querySelector(
        '.tele-marker-rot',
      ) as SVGElement | null)?.style.transform
    expect(angle(null)).toBeUndefined()
    expect(angle(90)).toBe('rotate(0deg)')
    expect(angle(40)).toBe('rotate(-90deg)')
    expect(angle(500)).toBe('rotate(90deg)')
  })

  it.each(['appetite_1_5', 'fluid_intake_ml', 'body_mass_kg'])(
    'hides the %s figure from assistive technology and writes no reading in it',
    (kind) => {
      const { container } = render(<TelemetryVisual kind={kind} values={[3]} />)
      const figure = container.querySelector(`[data-telemetry="${kind}"]`)
      expect(figure).toHaveAttribute('aria-hidden', 'true')
      expect(figure).toHaveClass('tele--live')
    },
  )

  it('shows an idle trace with no value and a moving one with a heart rate', () => {
    const idle = render(<TelemetryVisual kind="hr_bpm" values={[null]} />)
    expect(idle.container.querySelector('.tele-sweep')).toBeNull()
    expect(idle.container.querySelector('.tele-line--idle')).not.toBeNull()
    expect(idle.container.querySelector('.tele')).not.toHaveClass('tele--live')

    const live = render(<TelemetryVisual kind="hr_bpm" values={[60]} />)
    expect(live.container.querySelector('.tele-sweep')).not.toBeNull()
  })

  it('moves the pulse trace at the pace of the heart rate, within drawing bounds', () => {
    const pace = (bpm: number): string =>
      (
        render(<TelemetryVisual kind="hr_bpm" values={[bpm]} />).container.querySelector(
          '.tele-sweep',
        ) as HTMLElement
      ).style.getPropertyValue('--tele-beat')
    // Two beats per cycle: 60 bpm is 2 s, 120 bpm is 1 s.
    expect(pace(60)).toBe('2.00s')
    expect(pace(120)).toBe('1.00s')
    // Never faster than the drawing bound of 220 bpm, so nothing flashes.
    expect(pace(900)).toBe(pace(220))
    expect(Number.parseFloat(pace(220))).toBeGreaterThan(0.5)
  })

  it('fills the two pressure bars from the two values', () => {
    const { container } = render(<TelemetryVisual kind="bp" values={[140, 85]} />)
    const fills = [...container.querySelectorAll<SVGRectElement>('.tele-fill')]
    expect(fills).toHaveLength(2)
    expect(fills[0].style.transform).toBe('scaleX(0.5)')
    expect(fills[1].style.transform).toBe('scaleX(0.5)')
  })

  it('lights the hours slept, the last one in part', () => {
    const { container } = render(<TelemetryVisual kind="sleep_h" values={[5.5]} />)
    const fills = [...container.querySelectorAll<SVGRectElement>('.tele-fill')]
    expect(fills).toHaveLength(12)
    expect(fills.map((fill) => fill.style.opacity)).toEqual([
      '1', '1', '1', '1', '1', '0.5', '0', '0', '0', '0', '0', '0',
    ])
  })
})

describe('Sparkline', () => {
  it('draws nothing with fewer than two points', () => {
    expect(render(<Sparkline values={[70]} />).container).toBeEmptyDOMElement()
  })

  it('draws the earlier readings and marks the newest one', () => {
    const { container } = render(<Sparkline values={[70, 72, 71]} />)
    const figure = container.querySelector('.tele-spark')
    expect(figure).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.tele-spark__line')?.getAttribute('points')?.split(' ')).toHaveLength(3)
    expect(container.querySelector('.tele-spark__pending')).toBeNull()
  })

  it('adds the typed value as an open dot that is not part of the line', () => {
    const { container } = render(<Sparkline values={[70, 72, 71]} pending={95} />)
    expect(container.querySelector('.tele-spark__line')?.getAttribute('points')?.split(' ')).toHaveLength(3)
    expect(container.querySelector('.tele-spark__pending')).not.toBeNull()
  })
})
