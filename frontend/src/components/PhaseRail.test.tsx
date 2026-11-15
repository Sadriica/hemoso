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

  it('says what comes next, and that the last step is the last', () => {
    const { rerender } = render(<PhaseRail current="identify" />)
    expect(
      screen.getByText(strings.phases.next(strings.phases.report.name)),
    ).toBeInTheDocument()
    rerender(<PhaseRail current="status" />)
    expect(screen.getByText(strings.phases.last)).toBeInTheDocument()
  })
})
