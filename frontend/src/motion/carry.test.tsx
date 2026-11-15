import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCarry } from './carry'

function Harness({ still = false, done }: { still?: boolean; done: () => void }) {
  const carry = useCarry(still)
  return (
    <div>
      <p data-testid="p">{String(carry.progress)}</p>
      <button onClick={() => carry.run(done)}>go</button>
    </div>
  )
}

const go = () => act(() => void screen.getByText('go').click())

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useCarry', () => {
  it('closes the ring, then switches after about 500 ms, once', () => {
    const done = vi.fn()
    render(<Harness done={done} />)
    expect(screen.getByTestId('p')).toHaveTextContent('undefined')
    go()
    expect(screen.getByTestId('p')).toHaveTextContent('0')
    act(() => void vi.advanceTimersByTime(20))
    expect(screen.getByTestId('p')).toHaveTextContent('1')
    act(() => void vi.advanceTimersByTime(470))
    expect(done).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(40))
    expect(done).toHaveBeenCalledOnce()
    act(() => void vi.advanceTimersByTime(2000))
    expect(done).toHaveBeenCalledOnce()
  })

  it('ends at once on a key, a pointer or a touch', () => {
    for (const name of ['keydown', 'pointerdown', 'touchstart']) {
      const done = vi.fn()
      const { unmount } = render(<Harness done={done} />)
      go()
      act(() => void window.dispatchEvent(new Event(name)))
      expect(done).toHaveBeenCalledOnce()
      act(() => void vi.advanceTimersByTime(2000))
      expect(done).toHaveBeenCalledOnce()
      unmount()
    }
  })

  it('switches at once under still, with no ring', () => {
    const done = vi.fn()
    render(<Harness still done={done} />)
    go()
    expect(done).toHaveBeenCalledOnce()
    expect(screen.getByTestId('p')).toHaveTextContent('undefined')
  })

  it('switches at once under the system reduced motion setting', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const done = vi.fn()
    render(<Harness done={done} />)
    go()
    expect(done).toHaveBeenCalledOnce()
  })

  it('ignores a second run while one is going', () => {
    const done = vi.fn()
    render(<Harness done={done} />)
    go()
    go()
    act(() => void vi.advanceTimersByTime(600))
    expect(done).toHaveBeenCalledOnce()
  })

  it('flies a copy of the picked avatar and removes it at the end', () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation)
    HTMLElement.prototype.animate = animate
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main id="main-content"></main><label class="crew-option"><input type="radio" checked /><span class="crew-option__avatar">AB</span></label>',
    )
    const done = vi.fn()
    render(<Harness done={done} />)
    go()
    expect(animate).toHaveBeenCalledTimes(2) // the flight and the fade
    expect(document.querySelectorAll('.crew-option__avatar')).toHaveLength(2)
    act(() => void vi.advanceTimersByTime(600))
    expect(document.querySelectorAll('.crew-option__avatar')).toHaveLength(1)
    expect(done).toHaveBeenCalledOnce()
    // @ts-expect-error test cleanup
    delete HTMLElement.prototype.animate
  })
})
