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
    const ctx = { clearRect() {}, beginPath() {}, arc() {}, fill() {}, setTransform() {} }
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
})
