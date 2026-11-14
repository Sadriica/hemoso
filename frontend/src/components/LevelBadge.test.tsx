import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LevelBadge from './LevelBadge'

describe('LevelBadge', () => {
  it('shows the correct text for every level', () => {
    const { rerender } = render(<LevelBadge level="green" />)
    expect(screen.getByText('Green · OK')).toBeInTheDocument()

    rerender(<LevelBadge level="yellow" />)
    expect(screen.getByText('Yellow · Watch')).toBeInTheDocument()

    rerender(<LevelBadge level="orange" />)
    expect(screen.getByText('Orange · Needs attention')).toBeInTheDocument()
  })

  it('keeps the icon hidden from assistive technology while the text stays visible', () => {
    const { container } = render(<LevelBadge level="yellow" />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('Yellow · Watch')).toBeInTheDocument()
  })
})
