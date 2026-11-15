import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import PhaseTransition from './PhaseTransition'

// A phase with a little state of its own: the switch must never remount it.
function Counter({ name }: { name: string }) {
  const [count, setCount] = useState(0)
  return (
    <button type="button" onClick={() => setCount((value) => value + 1)}>
      {name} {count}
    </button>
  )
}

function Harness({ still = false }: { still?: boolean }) {
  const [phase, setPhase] = useState('identify')
  return (
    <>
      <button type="button" onClick={() => setPhase('report')}>to report</button>
      <button type="button" onClick={() => setPhase('status')}>to status</button>
      <button type="button" onClick={() => setPhase('identify')}>to identify</button>
      <PhaseTransition phase={phase} still={still}>
        <Counter name={phase} />
      </PhaseTransition>
    </>
  )
}

const sweep = (): Element | null => document.querySelector('.channel-switch')

describe('PhaseTransition as a channel switch', () => {
  it('has no switch on the first load', () => {
    render(<Harness />)
    expect(sweep()).toBeNull()
    expect(document.querySelector('.channel')).not.toHaveAttribute('data-direction')
  })

  it('sweeps forward on a step on, hidden from assistive technology', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('to report'))
    expect(sweep()).toHaveClass('channel-switch--forward')
    expect(sweep()).toHaveAttribute('aria-hidden', 'true')
    expect(document.querySelector('.channel')).toHaveClass('channel--forward')
  })

  it('sweeps the other way on a step back', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('to status'))
    fireEvent.click(screen.getByText('to report'))
    expect(sweep()).toHaveClass('channel-switch--back')
    expect(document.querySelector('.channel')).toHaveClass('channel--back')
  })

  it('goes away when the sweep ends and keeps the phase mounted', () => {
    vi.useFakeTimers()
    render(<Harness />)
    fireEvent.click(screen.getByText('to report'))
    fireEvent.click(screen.getByText('report 0'))
    expect(screen.getByText('report 1')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(sweep()).toBeNull()
    // The state of the phase survived the end of the switch.
    expect(screen.getByText('report 1')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('renders nothing of the switch with motion off, and still shows the phase', () => {
    render(<Harness still />)
    fireEvent.click(screen.getByText('to report'))
    expect(sweep()).toBeNull()
    expect(document.querySelector('.channel')).not.toHaveAttribute('data-direction')
    expect(screen.getByText('report 0')).toBeInTheDocument()
  })
})
