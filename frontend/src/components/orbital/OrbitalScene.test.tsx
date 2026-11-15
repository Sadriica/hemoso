import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrbitalScene } from './index'

function media(reduced = false, touch = false) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce') ? reduced : q.includes('hover: none') ? touch : false,
    addEventListener() {}, removeEventListener() {},
  }))
}
afterEach(() => vi.unstubAllGlobals())
const root = (c: HTMLElement) => c.firstElementChild as HTMLElement

describe('OrbitalScene', () => {
  it('is decorative: aria-hidden, no focus stops, no text', () => {
    media()
    const { container } = render(<OrbitalScene variant="identify" />)
    expect(root(container)).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('button, a, [tabindex], text')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it.each([['identify', 4], ['report', 3], ['status', 4]] as const)('the %s variant draws %i orbits and its own class', (variant, n) => {
    media()
    const { container } = render(<OrbitalScene variant={variant} className="mine" />)
    expect(root(container)).toHaveClass(`orbital--${variant}`, 'mine')
    expect(container.querySelectorAll('.orbital__orbit')).toHaveLength(n)
    expect(container.querySelectorAll('.orbital__orbit--accent')).toHaveLength(1)
  })

  it('closes the progress ring with the value, clamped to 0..1', () => {
    media()
    const { container, rerender } = render(<OrbitalScene variant="identify" />)
    expect(container.querySelector('.orbital__progress')).toBeNull()
    rerender(<OrbitalScene variant="identify" progress={0.25} />)
    expect(container.querySelector('.orbital__progress')).toHaveAttribute('stroke-dashoffset', '0.75')
    rerender(<OrbitalScene variant="identify" progress={4} />)
    expect(container.querySelector('.orbital__progress')).toHaveAttribute('stroke-dashoffset', '0')
  })

  it('listens to the pointer only when motion is on', () => {
    media()
    const add = vi.spyOn(window, 'addEventListener')
    const { unmount } = render(<OrbitalScene variant="identify" />)
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(true)
    unmount()
    add.mockClear()
    render(<OrbitalScene variant="identify" still />)
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(false)
  })

  it('has no pointer handlers under reduced motion or on touch screens, and marks itself still', () => {
    media(true)
    const add = vi.spyOn(window, 'addEventListener')
    const { container, unmount } = render(<OrbitalScene variant="status" />)
    expect(root(container)).toHaveClass('orbital--still')
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(false)
    unmount()
    media(false, true)
    render(<OrbitalScene variant="status" />)
    expect(add.mock.calls.some(([t]) => t === 'pointermove')).toBe(false)
  })

  it('moves the layers with one custom-property pair per frame', () => {
    media()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { cb(0); return 1 })
    const { container } = render(<OrbitalScene variant="identify" />)
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: window.innerWidth, clientY: 0 }))
    expect(root(container).style.getPropertyValue('--px')).toBe('1.000')
    expect(root(container).style.getPropertyValue('--py')).toBe('-1.000')
  })
})
