import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AttentionBadge from './AttentionBadge'

describe('AttentionBadge', () => {
  it('shows the words it is given', () => {
    render(<AttentionBadge kind="in_range" text="In your usual range" />)
    expect(screen.getByText('In your usual range')).toBeInTheDocument()
  })

  it('shows the level name of a reading that needs review', () => {
    render(<AttentionBadge kind="attention" text="example_level" />)
    expect(screen.getByText('example_level')).toBeInTheDocument()
  })

  it('shows the no data words when there is no reading', () => {
    render(<AttentionBadge kind="no_data" text="No data yet" />)
    expect(screen.getByText('No data yet')).toBeInTheDocument()
  })

  it('keeps the icon hidden from assistive technology', () => {
    const { container } = render(
      <AttentionBadge kind="in_range" text="In your usual range" />,
    )
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})
