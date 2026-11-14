import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Disclosure from './Disclosure'

describe('Disclosure', () => {
  it('starts collapsed and opens by keyboard', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="Sources">Panel content</Disclosure>)
    const button = screen.getByRole('button', { name: 'Sources' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Panel content')).not.toBeInTheDocument()

    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })

  it('links the button to the panel with aria-controls', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="Sources">Panel content</Disclosure>)
    const button = screen.getByRole('button', { name: 'Sources' })
    await user.click(button)
    const panel = screen.getByText('Panel content')
    expect(button.getAttribute('aria-controls')).toBe(panel.id)
  })
})
