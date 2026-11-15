import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PhaseRail from './PhaseRail'
import { strings } from '../strings'

describe('PhaseRail', () => {
  it('numbers the three steps and marks the current one', () => {
    render(<PhaseRail current="report" />)
    expect(screen.getByText('02')).toBeInTheDocument()
    const current = screen
      .getAllByRole('listitem')
      .find((item) => item.getAttribute('aria-current') === 'step')
    expect(current).toHaveTextContent(strings.phases.report.name)
  })

  it('checks the steps already done and leaves the next one plain', () => {
    const { container } = render(<PhaseRail current="report" />)
    const steps = screen.getAllByRole('listitem')

    // Identify is done: a check icon in its node instead of the number.
    expect(steps[0]).toHaveClass('phase-rail__step--done')
    expect(steps[0].querySelector('svg')).not.toBeNull()
    expect(steps[0]).not.toHaveTextContent('01')

    // The current step keeps its number and the accent colour.
    expect(steps[1]).toHaveClass('phase-rail__step--current')
    expect(steps[1].querySelector('svg')).toBeNull()

    // Status is still ahead.
    expect(steps[2]).toHaveClass('phase-rail__step--next')
    expect(steps[2]).toHaveTextContent(strings.phases.status.name)

    // The next step is its own node now: no separate line under the rail.
    expect(container.querySelector('.phase-rail__next')).toBeNull()
  })

  it('fills the track up to the current node', () => {
    const { container, rerender } = render(<PhaseRail current="identify" />)
    const fill = container.querySelector('.phase-rail__fill')
    expect(fill).toHaveStyle({ width: '0%' })

    rerender(<PhaseRail current="report" />)
    expect(fill).toHaveStyle({ width: '50%' })

    rerender(<PhaseRail current="status" />)
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('says where the check is, in words for a screen reader', () => {
    render(<PhaseRail current="status" />)
    expect(screen.getByText(strings.phases.step(3, 3))).toBeInTheDocument()
  })

  it('keeps every step name in the tree, for the short rail of a phone', () => {
    render(<PhaseRail current="identify" />)
    // The phone view shows only the current name; the others are hidden by
    // CSS, so each one must still be text a screen reader reads.
    for (const phase of ['identify', 'report', 'status'] as const) {
      expect(screen.getByText(strings.phases[phase].name)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step')).toHaveLength(1)
  })

  it('offers no way to jump between phases', () => {
    render(<PhaseRail current="identify" />)
    const rail = screen.getByRole('navigation', { name: strings.phases.railLabel })
    expect(rail.querySelectorAll('button, a')).toHaveLength(0)
    expect(rail.querySelectorAll('li')).toHaveLength(3)
  })
})
