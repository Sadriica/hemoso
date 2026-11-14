import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the tabs pattern with a selected Home tab and its panel', () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    const tab = screen.getByRole('tab', { name: 'Home' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(tab).toHaveAttribute('aria-controls', 'panel-home')
    expect(screen.getByRole('tabpanel')).toHaveAttribute(
      'aria-labelledby',
      'tab-home',
    )
  })

  it('keeps the tab selected when arrow keys are pressed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tab = screen.getByRole('tab', { name: 'Home' })
    tab.focus()
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('tab', { name: 'Home', selected: true }),
    ).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(
      screen.getByRole('tab', { name: 'Home', selected: true }),
    ).toBeInTheDocument()
  })

  it('shows the synthetic notice and the placeholder notice', () => {
    render(<App />)
    expect(screen.getByText('Demo with synthetic data only.')).toBeInTheDocument()
    expect(
      screen.getByText('Showing example content until the team adds config files.'),
    ).toBeInTheDocument()
  })

  it('shows a person picker built from the demo person ids', () => {
    render(<App />)
    expect(screen.getByLabelText('Person')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'demo_astronaut_1' }),
    ).toBeInTheDocument()
  })
})
