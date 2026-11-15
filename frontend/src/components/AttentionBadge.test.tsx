import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AttentionBadge from './AttentionBadge'
import type { AttentionRule } from '../domain/types'

const rule: AttentionRule = {
  indicatorId: 'example_indicator',
  side: 'above',
  threshold: 100,
  attentionLevel: 'example_level',
  notify: 'crew',
  sources: ['Assumption'],
}

describe('AttentionBadge', () => {
  it('shows "In range" for in_range', () => {
    render(<AttentionBadge attention={{ kind: 'in_range' }} />)
    expect(screen.getByText('In range')).toBeInTheDocument()
  })

  it('shows the level name for attention', () => {
    render(
      <AttentionBadge
        attention={{ kind: 'attention', level: 'example_level', rule }}
      />,
    )
    expect(screen.getByText('example_level')).toBeInTheDocument()
  })

  it('shows "No threshold yet" for no_rules', () => {
    render(<AttentionBadge attention={{ kind: 'no_rules' }} />)
    expect(screen.getByText('No threshold yet')).toBeInTheDocument()
    expect(screen.queryByText('In range')).toBeNull()
  })

  it('shows "No data" for no_data', () => {
    render(<AttentionBadge attention={{ kind: 'no_data' }} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('keeps the icon hidden from assistive technology', () => {
    const { container } = render(
      <AttentionBadge attention={{ kind: 'in_range' }} />,
    )
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})
