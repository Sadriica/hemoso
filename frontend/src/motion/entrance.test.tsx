import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INTRO_DONE } from './entrance'
import PhaseTransition from './PhaseTransition'

interface Fake {
  el: Element
  delay: number
  duration: number
  state: 'paused' | 'running' | 'finished' | 'cancelled'
  onfinish: (() => void) | null
  pause(): void
  play(): void
  finish(): void
  cancel(): void
}

let made: Fake[] = []

beforeEach(() => {
  made = []
  HTMLElement.prototype.animate = function (this: Element, _k: unknown, o: { delay: number; duration: number }) {
    const a: Fake = {
      el: this,
      delay: o.delay,
      duration: o.duration,
      state: 'running',
      onfinish: null,
      pause() { this.state = 'paused' },
      play() { this.state = 'running' },
      finish() { if (this.state === 'cancelled' || this.state === 'finished') return; this.state = 'finished'; this.onfinish?.() },
      cancel() { this.state = 'cancelled' },
    }
    made.push(a)
    return a as unknown as Animation
  } as never
})
afterEach(() => {
  // @ts-expect-error test cleanup
  delete HTMLElement.prototype.animate
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function page(phase: string, still = false) {
  return (
    <div className="app">
      <div data-enter="scene" />
      <PhaseTransition phase={phase} still={still}>
        <div data-enter="headline">
          <span className="headline__line">a</span>
          <span className="headline__line">b</span>
          <span className="headline__line">c</span>
          <p className="phase-heading__intro">lead</p>
        </div>
        <div data-enter="panel" />
        <div data-enter="rest" />
      </PhaseTransition>
    </div>
  )
}

const kind = (a: Fake) =>
  a.el.getAttribute('data-enter') ?? (a.el.className === 'phase-heading__intro' ? 'intro' : 'line')

describe('phase entrance', () => {
  it('runs scene, headline lines, panel, rest in order, inside 1200 ms', () => {
    render(page('identify'))
    const firsts = ['scene', 'line', 'panel', 'rest'].map((k) => made.find((a) => kind(a) === k)!)
    const delays = firsts.map((a) => a.delay)
    expect([...delays].sort((x, y) => x - y)).toEqual(delays)
    expect(new Set(delays).size).toBe(4)
    const lines = made.filter((a) => kind(a) === 'line')
    expect(lines).toHaveLength(3)
    expect(lines[1].delay - lines[0].delay).toBeCloseTo(70, 5)
    expect(Math.max(...made.map((a) => a.delay + a.duration))).toBeLessThanOrEqual(1200)
    expect(made.every((a) => a.state === 'running')).toBe(true)
  })

  it('brings the lead sentence in one stagger after the last headline line', () => {
    render(page('identify'))
    const lines = made.filter((a) => kind(a) === 'line')
    const intro = made.find((a) => kind(a) === 'intro')!
    expect(intro.delay - lines[2].delay).toBeCloseTo(70, 5)
  })

  it('runs again on a phase change and cancels the one before', () => {
    const { rerender } = render(page('identify'))
    const before = made.length
    rerender(page('report'))
    expect(made.length).toBe(before * 2)
    expect(made.slice(0, before).every((a) => a.state === 'cancelled')).toBe(true)
  })

  it('does not run again when the phase stays the same', () => {
    const { rerender } = render(page('identify'))
    const before = made.length
    rerender(page('identify'))
    expect(made.length).toBe(before)
  })

  it('finishes at once on a key, then nothing is left running', () => {
    render(page('identify'))
    act(() => void window.dispatchEvent(new Event('keydown')))
    expect(made.every((a) => a.state === 'cancelled' || a.state === 'finished')).toBe(true)
    expect(made.some((a) => a.state === 'running')).toBe(false)
  })

  it.each(['pointerdown', 'touchstart'])('finishes on %s', (name) => {
    render(page('identify'))
    act(() => void window.dispatchEvent(new Event(name)))
    expect(made.some((a) => a.state === 'running')).toBe(false)
  })

  it('does nothing under still', () => {
    render(page('identify', true))
    expect(made).toHaveLength(0)
  })

  it('does nothing under the system reduced motion setting', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    render(page('identify'))
    expect(made).toHaveLength(0)
  })

  it('cancels a running entrance when motion turns off', () => {
    const { rerender } = render(page('identify'))
    rerender(page('identify', true))
    expect(made.some((a) => a.state === 'running')).toBe(false)
  })

  it('waits for the intro and starts when it ends', () => {
    const cover = document.createElement('div')
    cover.className = 'intro-cover'
    document.body.append(cover)
    render(page('identify'))
    expect(made.length).toBeGreaterThan(0)
    expect(made.every((a) => a.state === 'paused')).toBe(true)
    act(() => void window.dispatchEvent(new Event(INTRO_DONE)))
    expect(made.every((a) => a.state === 'running')).toBe(true)
  })

  it('draws the strokes marked data-draw', () => {
    SVGElement.prototype.animate = HTMLElement.prototype.animate
    ;(SVGElement.prototype as unknown as { getTotalLength: () => number }).getTotalLength = () => 100
    const { container } = render(
      <div className="app">
        <svg><path data-draw="" d="M0 0L10 10" /></svg>
        <PhaseTransition phase="identify" still={false}><div /></PhaseTransition>
      </div>,
    )
    expect(container.querySelector('path')).not.toBeNull()
    expect(made.some((a) => a.el.tagName.toLowerCase() === 'path')).toBe(true)
    // @ts-expect-error test cleanup
    delete SVGElement.prototype.animate
  })
})
