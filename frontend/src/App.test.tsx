import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './data/storedState'
import { strings } from './strings'

beforeEach(() => {
  localStorage.clear()
  // Every test starts on the plain page: the face panel only exists with
  // ?face=1, and one test opens it.
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

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

  it('keeps History after Entry', () => {
    render(<App />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Home',
      'Entry',
      'History',
    ])
  })

  it('opens History by keyboard and shows the table with a comparison', async () => {
    const user = userEvent.setup()
    render(<App />)
    screen.getByRole('tab', { name: 'Home' }).focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(
      screen.getByRole('tab', { name: 'History', selected: true }),
    ).toBeInTheDocument()
    // The number of readings comes from config/, so the test asks for the shape
    // of the sentence, not for a value.
    expect(
      screen.getByText(/Your earlier median|Not enough earlier entries/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
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

  it('shows the sync status in the header with no server set up', () => {
    render(<App />)
    expect(screen.getByText('Nothing waiting to be sent')).toBeInTheDocument()
    expect(screen.getByText('Not sent yet')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('No server set up for this demo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send now' })).toBeNull()
  })

  it('warns when the browser does not save the entries on this device', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked')
    })
    render(<App />)
    expect(
      screen.getByText('Entries are not saved on this device.'),
    ).toBeInTheDocument()
  })

  it('warns when stored entries could not be read and were replaced', () => {
    localStorage.setItem(STORAGE_KEY, '{"version":2,"entries":[]')
    render(<App />)
    expect(
      screen.getByText(
        'Saved entries could not be read and were replaced by the demo data.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Entries are not saved on this device.'),
    ).toBeNull()
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
      'Saved on this device.',
    )

    screen.getByRole('tab', { name: 'Home' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('1234567')).toBeInTheDocument()
    expect(screen.getByText(`Day ${nextDay} 15:44`)).toBeInTheDocument()
  })
})

describe('face sign-in behind ?face=1', () => {
  it('renders no face control on the plain page', () => {
    render(<App />)
    expect(
      screen.queryByRole('button', { name: strings.face.buttonLabel }),
    ).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the button next to the person picker with the flag', () => {
    window.history.replaceState({}, '', '/?face=1')
    render(<App />)
    expect(screen.getByLabelText('Person')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.face.buttonLabel }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the panel with the consent text and closes it on Escape', async () => {
    window.history.replaceState({}, '', '/?face=1')
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', {
      name: strings.face.buttonLabel,
    })

    await user.click(button)
    const panel = await screen.findByRole('dialog')
    expect(panel).toHaveAttribute('aria-labelledby')
    expect(screen.getByText(strings.face.consent)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('puts the focus on the person picker when the camera is blocked', async () => {
    window.history.replaceState({}, '', '/?face=1')
    const original = navigator.mediaDevices
    const blocked = new Error('blocked')
    blocked.name = 'NotAllowedError'
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(blocked) },
    })
    try {
      const user = userEvent.setup()
      render(<App />)
      await user.click(
        screen.getByRole('button', { name: strings.face.buttonLabel }),
      )
      await user.click(
        await screen.findByRole('button', {
          name: strings.face.continueLabel,
        }),
      )
      await user.click(
        screen.getByRole('button', { name: strings.face.signIn }),
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(
        strings.face.camera.denied,
      )
      // The way out that always works has the focus, not the panel button.
      expect(screen.getByLabelText('Person')).toHaveFocus()
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: original,
      })
    }
  })
})
