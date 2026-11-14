import { fireEvent, render, screen } from '@testing-library/react'
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

  it('moves between the tabs with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)
    const tab = screen.getByRole('tab', { name: 'Home' })
    tab.focus()
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('tab', { name: 'Entry', selected: true }),
    ).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(
      screen.getByRole('tab', { name: 'Home', selected: true }),
    ).toBeInTheDocument()
  })

  // The waiting-for text depends on which config files exist, so Home tests
  // cover it with fixed data. Here only the note that is always on screen.
  it('shows the synthetic data notice', () => {
    render(<App />)
    expect(screen.getByText('Demo with synthetic data only.')).toBeInTheDocument()
  })

  it('shows a person picker built from the demo person ids', () => {
    render(<App />)
    expect(screen.getByLabelText('Person')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'demo_astronaut_1' }),
    ).toBeInTheDocument()
  })

  it('saves an entry on the Entry tab and shows it on Home', async () => {
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('tab', { name: 'Home' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('tab', { name: 'Entry', selected: true }),
    ).toBeInTheDocument()

    // One Tab: the panel is not a stop of its own.
    await user.tab()
    expect(screen.getByLabelText('Indicator')).toHaveFocus()

    // The day after the latest one in the store, so the new entry is the latest
    // one on Home whatever the clock says.
    const day = screen.getByLabelText('Mission day') as HTMLInputElement
    const nextDay = String(Number(day.value) + 1)
    await user.clear(day)
    await user.type(day, nextDay)
    await user.type(screen.getByLabelText('Value'), '1234567')
    // The native time input keeps HH:MM in its value on any OS setting.
    const time = screen.getByLabelText('Time')
    fireEvent.change(time, { target: { value: '15:44' } })
    const save = screen.getByRole('button', { name: 'Save entry' })
    save.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved. Waiting to be sent.',
    )

    screen.getByRole('tab', { name: 'Home' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('1234567')).toBeInTheDocument()
    expect(screen.getByText(`Day ${nextDay} 15:44`)).toBeInTheDocument()
  })
})
