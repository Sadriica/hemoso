import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Notice from './Notice'

describe('Notice', () => {
  it('shows its text inside a note', () => {
    render(<Notice tone="info">Example note.</Notice>)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent('Example note.')
  })

  it('keeps the icon hidden from assistive technology', () => {
    const { container } = render(<Notice tone="warning">Example note.</Notice>)
    const icon = container.querySelector('.notice__icon')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.querySelector('svg')).not.toBeNull()
  })

  it('applies the tone as a class so the rail and icon change with it', () => {
    const { container, rerender } = render(
      <Notice tone="info">Example note.</Notice>,
    )
    expect(container.querySelector('.notice--info')).not.toBeNull()

    rerender(<Notice tone="warning">Example note.</Notice>)
    expect(container.querySelector('.notice--warning')).not.toBeNull()
  })
})
