import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AttentionBadge from './AttentionBadge'
import { strings } from '../strings'

describe('AttentionBadge', () => {
  it('shows the words it is given', () => {
    render(<AttentionBadge kind="in_range" text="In your usual range" />)
    expect(screen.getByText('In your usual range')).toBeInTheDocument()
  })

  it('shows the level name of a reading that needs review', () => {
    render(<AttentionBadge kind="review" text="example_level" />)
    expect(screen.getByText('example_level')).toBeInTheDocument()
  })

  it('shows the no data words when there is no reading', () => {
    render(<AttentionBadge kind="no_data" text={strings.badge.noData} />)
    expect(screen.getByText(strings.badge.noData)).toBeInTheDocument()
  })

  it('draws the state shape of the kind it is given', () => {
    for (const [kind, icon] of [
      ['in_range', 'in_range'],
      ['outside', 'outside'],
      ['review', 'review'],
      ['no_data', 'no_data'],
    ] as const) {
      const { container, unmount } = render(
        <AttentionBadge kind={kind} text={kind} />,
      )
      expect(container.querySelector('svg')).toHaveAttribute('data-icon', icon)
      expect(container.querySelector(`.attention-badge--${kind}`)).not.toBeNull()
      unmount()
    }
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
