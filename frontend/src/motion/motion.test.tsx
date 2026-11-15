import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { animateIn, Intro, PhaseTransition, useCountUp, useMotionAllowed } from './index'

function mockReduced(reduce: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useMotionAllowed', () => {
  it('is true without matchMedia and false when still', () => {
    expect(renderHook(() => useMotionAllowed(false)).result.current).toBe(true)
    expect(renderHook(() => useMotionAllowed(true)).result.current).toBe(false)
  })
  it('is false when the system prefers reduced motion', () => {
    mockReduced(true)
    expect(renderHook(() => useMotionAllowed(false)).result.current).toBe(false)
  })
})

describe('useCountUp', () => {
  it('returns the target at once when not allowed', () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, false), { initialProps: { t: 10 } })
    rerender({ t: 80 })
    expect(result.current).toBe(80)
  })
  it('ends on the target within its duration and caps it at 600 ms', () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 5000, 1), { initialProps: { t: 0 } })
    rerender({ t: 100 })
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)
    act(() => void vi.advanceTimersByTime(420))
    expect(result.current).toBe(100)
  })
  it('rounds to the decimals asked', () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 250, 1), { initialProps: { t: 36 } })
    rerender({ t: 37.2 })
    act(() => void vi.advanceTimersByTime(100))
    expect(String(result.current).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1)
    act(() => void vi.advanceTimersByTime(300))
    expect(result.current).toBe(37.2)
  })
})

describe('animateIn', () => {
  it('does nothing without el.animate', () => {
    expect(animateIn(document.createElement('div'), 100)).toBeUndefined()
  })
  it('does nothing under .app--still and animates otherwise', () => {
    const animate = vi.fn(() => ({}) as Animation)
    const host = document.createElement('div')
    const el = document.createElement('div')
    el.animate = animate
    host.append(el)
    host.className = 'app--still'
    document.body.append(host)
    expect(animateIn(el, 100)).toBeUndefined()
    host.className = ''
    animateIn(el, 100)
    expect(animate).toHaveBeenCalledOnce()
    host.remove()
  })
})

describe('Intro', () => {
  it('renders nothing and calls onDone at once when still', () => {
    const onDone = vi.fn()
    const { container } = render(<Intro onDone={onDone} still clockText="Day 1" />)
    expect(container).toBeEmptyDOMElement()
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('renders nothing under reduced motion', () => {
    mockReduced(true)
    const onDone = vi.fn()
    const { container } = render(<Intro onDone={onDone} still={false} />)
    expect(container).toBeEmptyDOMElement()
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('is hidden from assistive tech and shows the clock only when given', () => {
    const { container, rerender } = render(<Intro onDone={() => {}} still={false} clockText="Day 41 · 13:30" />)
    const layer = container.querySelector('.intro__layer')!
    expect(layer).toHaveAttribute('aria-hidden', 'true')
    expect(layer).toHaveAttribute('role', 'presentation')
    expect(layer).toHaveTextContent('Day 41 · 13:30')
    rerender(<Intro onDone={() => {}} still={false} />)
    expect(container.querySelector('.intro__clock')).toBeNull()
  })
  it('keeps the name as one plain-text copy and hides the animated letters', () => {
    const { container } = render(<Intro onDone={() => {}} still={false} />)
    const name = container.querySelector('.intro__name')!
    expect(name.querySelector('.sr-only')).toHaveTextContent('HeMoSo')
    const letters = name.querySelectorAll('.intro__letter')
    expect(letters).toHaveLength(6)
    expect(letters[0].parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.intro__title')).toContainElement(name as HTMLElement)
  })
  it('calls onDone once at the end of the intro, about five seconds', () => {
    const onDone = vi.fn()
    render(<Intro onDone={onDone} still={false} />)
    act(() => void vi.advanceTimersByTime(5199))
    expect(onDone).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledOnce()
    act(() => void vi.advanceTimersByTime(5000))
    expect(onDone).toHaveBeenCalledOnce()
  })
  it.each(['keydown', 'pointerdown', 'touchstart'])('ends on %s, once', (name) => {
    const onDone = vi.fn()
    const { container } = render(<Intro onDone={onDone} still={false} />)
    act(() => void window.dispatchEvent(new Event(name)))
    act(() => void window.dispatchEvent(new Event(name)))
    act(() => void vi.advanceTimersByTime(2000))
    expect(onDone).toHaveBeenCalledOnce()
    expect(container).toBeEmptyDOMElement()
  })
  it('shows again on a new page load, with nothing stored', () => {
    const first = render(<Intro onDone={() => {}} still={false} />)
    first.unmount()
    const { container } = render(<Intro onDone={() => {}} still={false} />)
    expect(container.querySelector('.intro__layer')).not.toBeNull()
    expect(sessionStorage.length).toBe(0)
  })
  it('does not throw when storage fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const onDone = vi.fn()
    expect(() => render(<Intro onDone={onDone} still={false} />)).not.toThrow()
    act(() => void vi.advanceTimersByTime(5200))
    expect(onDone).toHaveBeenCalledOnce()
  })
  it('renders a named skip button only with skipLabel', () => {
    const { rerender } = render(<Intro onDone={() => {}} still={false} skipLabel="Skip" />)
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument()
    sessionStorage.clear()
    rerender(<Intro onDone={() => {}} still={false} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('PhaseTransition', () => {
  it('renders children and animates only when the phase changes', () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation)
    HTMLElement.prototype.animate = animate
    const { rerender } = render(
      <PhaseTransition phase="identify" still={false}>
        <p>content</p>
      </PhaseTransition>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(animate).not.toHaveBeenCalled()
    rerender(
      <PhaseTransition phase="report" still={false}>
        <p>content</p>
      </PhaseTransition>,
    )
    expect(animate).toHaveBeenCalledOnce()
    rerender(
      <PhaseTransition phase="status" still>
        <p>content</p>
      </PhaseTransition>,
    )
    expect(animate).toHaveBeenCalledOnce()
    // @ts-expect-error test cleanup
    delete HTMLElement.prototype.animate
  })
})
