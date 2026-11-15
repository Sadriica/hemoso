import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Starfield from './Starfield'

afterEach(() => vi.unstubAllGlobals())

describe('Starfield', () => {
  it('stops and resumes when the system setting changes', () => {
    let handler: () => void = () => {}
    const mq = {
      matches: false,
      addEventListener: (_: string, h: () => void) => (handler = h),
      removeEventListener: () => {},
    }
    vi.stubGlobal('matchMedia', () => mq)
    const ctx = { clearRect() {}, beginPath() {}, arc() {}, fill() {}, setTransform() {}, ellipse() {}, stroke() {} }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    render(<Starfield still={false} />)
    expect(raf).toHaveBeenCalledTimes(1)
    act(() => {
      mq.matches = true
      handler()
    })
    expect(cancel).toHaveBeenCalled()
    const calls = raf.mock.calls.length
    act(() => {
      mq.matches = false
      handler()
    })
    expect(raf.mock.calls.length).toBe(calls + 1)
  })

  it('pauses while the page is hidden and resumes when it shows', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const ctx = { clearRect() {}, beginPath() {}, arc() {}, fill() {}, setTransform() {}, ellipse() {}, stroke() {} }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    render(<Starfield still={false} />)
    expect(raf).toHaveBeenCalledTimes(1)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(cancel).toHaveBeenCalledWith(7)
    hidden.mockReturnValue(false)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(raf).toHaveBeenCalledTimes(2)
  })

  it('draws one frame and never animates when still', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const arc = vi.fn()
    const ctx = { clearRect() {}, beginPath() {}, arc, fill() {}, setTransform() {}, ellipse() {}, stroke() {} }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    render(<Starfield still />)
    expect(raf).not.toHaveBeenCalled()
    expect(arc).toHaveBeenCalled()
  })

  it('is hidden from assistive technology and puts the glow at the focus', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    const { container } = render(<Starfield still focus={{ x: 0.25, y: 0.5 }} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.innerHTML).toContain('at 25% 50%')
  })
})
