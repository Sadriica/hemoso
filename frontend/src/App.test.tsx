import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './data/storedState'
import { strings } from './strings'

const PERSON = 'demo_astronaut_1'
const copy = strings.phases

beforeEach(() => {
  localStorage.clear()
  // Every test starts on the plain page: the face panel only exists with
  // ?face=1, and some tests open it.
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

function heading() {
  return screen.getByRole('heading', { level: 1 })
}

function currentStep() {
  const rail = screen.getByRole('navigation', { name: copy.railLabel })
  return within(rail)
    .getAllByRole('listitem')
    .find((item) => item.getAttribute('aria-current') === 'step')
}

// Phase 1 to phase 2: pick the demo person and press the way on.
async function signInByName(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: PERSON }))
  await user.click(screen.getByRole('button', { name: copy.identify.next }))
}

describe('guided check', () => {
  it('opens on phase 1, identify, with its headline and the rail on step 1', () => {
    render(<App />)
    expect(heading()).toHaveTextContent(copy.identify.headline.join(' '))
    expect(screen.getByText(copy.identify.eyebrow)).toBeInTheDocument()
    expect(currentStep()).toHaveTextContent(copy.identify.name)
  })

  it('offers no menu: the rail shows progress only, with no buttons or links', () => {
    render(<App />)
    const rail = screen.getByRole('navigation', { name: copy.railLabel })
    expect(within(rail).queryAllByRole('button')).toHaveLength(0)
    expect(within(rail).queryAllByRole('link')).toHaveLength(0)
    expect(within(rail).getAllByRole('listitem')).toHaveLength(3)
  })

  it('lists the crew members from the demo person ids', () => {
    render(<App />)
    const picker = screen.getByRole('group', { name: copy.identify.crewLabel })
    expect(within(picker).getByRole('radio', { name: PERSON })).toBeInTheDocument()
  })

  it('asks for a name before it moves on, and puts focus on the crew list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: copy.identify.next }))
    expect(screen.getByRole('alert')).toHaveTextContent(copy.identify.missing)
    expect(screen.getByRole('radio', { name: PERSON })).toHaveFocus()
    expect(heading()).toHaveTextContent(copy.identify.headline.join(' '))
  })

  it('goes identify, report, status in order, moving focus to each heading', async () => {
    const user = userEvent.setup()
    render(<App />)

    await signInByName(user)
    expect(heading()).toHaveTextContent(copy.report.headline.join(' '))
    expect(heading()).toHaveFocus()
    expect(currentStep()).toHaveTextContent(copy.report.name)
    expect(screen.getByText(strings.topbar.onDuty(PERSON))).toBeInTheDocument()
    expect(screen.getByText(copy.report.logged(0))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.report.next }))
    expect(heading()).toHaveTextContent(copy.status.headline.join(' '))
    expect(heading()).toHaveFocus()
    expect(currentStep()).toHaveTextContent(copy.status.name)
    // The status of the indicators and the history are on the last phase.
    expect(screen.getByText(strings.personHeading(PERSON))).toBeInTheDocument()
    expect(
      screen.getByText(/Your earlier median|Not enough earlier entries/),
    ).toBeInTheDocument()
  })

  it('goes back one phase at a time and starts a new check from phase 1', async () => {
    const user = userEvent.setup()
    render(<App />)
    await signInByName(user)
    await user.click(screen.getByRole('button', { name: copy.report.next }))

    await user.click(screen.getByRole('button', { name: copy.status.back }))
    expect(heading()).toHaveTextContent(copy.report.headline.join(' '))
    await user.click(screen.getByRole('button', { name: copy.report.back }))
    expect(heading()).toHaveTextContent(copy.identify.headline.join(' '))

    await user.click(screen.getByRole('button', { name: copy.identify.next }))
    await user.click(screen.getByRole('button', { name: copy.report.next }))
    await user.click(screen.getByRole('button', { name: copy.status.restart }))
    expect(heading()).toHaveTextContent(copy.identify.headline.join(' '))
    // A new check asks again who is on duty.
    expect(screen.getByRole('radio', { name: PERSON })).not.toBeChecked()
  })

  it('saves a reading in phase 2 and shows it in phase 3', async () => {
    const user = userEvent.setup()
    render(<App />)
    await signInByName(user)

    // The day after the latest one in the store, so the new entry is the latest
    // one whatever the clock says.
    const day = screen.getByLabelText('Mission day') as HTMLInputElement
    const nextDay = String(Number(day.value) + 1)
    await user.clear(day)
    await user.type(day, nextDay)
    await user.type(screen.getByLabelText('Value'), '1234567')
    // The native time input keeps HH:MM in its value on any OS setting.
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '15:44' } })
    const save = screen.getByRole('button', { name: 'Save entry' })
    save.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Saved on this device.')).toBeInTheDocument()
    expect(screen.getByText(copy.report.logged(1))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.report.next }))
    expect(screen.getAllByText('1234567').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(strings.timeLabel(Number(nextDay), '15:44')).length,
    ).toBeGreaterThan(0)
  })
})

describe('top bar', () => {
  it('shows the synthetic data sentence on every phase', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(strings.syntheticNotice)).toBeInTheDocument()
    await signInByName(user)
    expect(screen.getByText(strings.syntheticNotice)).toBeInTheDocument()
  })

  it('labels the device clock as NOW in the metadata line', () => {
    render(<App />)
    expect(screen.getByText(/^DAY \d+ · NOW \d\d:\d\d$/)).toBeInTheDocument()
  })

  it('shows the sync status with no server set up', () => {
    render(<App />)
    expect(screen.getByText('Nothing waiting to be sent')).toBeInTheDocument()
    expect(screen.getByText('Not sent yet')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(screen.getByText('No server set up for this demo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send now' })).toBeNull()
  })

  it('switches motion off and says so with aria-pressed', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = screen.getByRole('button', { name: strings.topbar.reduceMotion })
    const before = toggle.getAttribute('aria-pressed')
    await user.click(toggle)
    expect(toggle.getAttribute('aria-pressed')).not.toBe(before)
  })

  it('warns when the browser does not save the entries on this device', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked')
    })
    render(<App />)
    expect(screen.getByText(strings.sync.notSaved)).toBeInTheDocument()
  })

  it('warns when stored entries could not be read and were replaced', () => {
    localStorage.setItem(STORAGE_KEY, '{"version":2,"entries":[]')
    render(<App />)
    expect(screen.getByText(strings.sync.reset)).toBeInTheDocument()
    expect(screen.queryByText(strings.sync.notSaved)).toBeNull()
  })
})

describe('face sign-in behind ?face=1', () => {
  it('renders no face control on the plain page', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: strings.face.buttonLabel })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the face button above the crew list with the flag', () => {
    window.history.replaceState({}, '', '/?face=1')
    render(<App />)
    expect(screen.getByRole('group', { name: copy.identify.crewLabel })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.face.buttonLabel }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the panel with the consent text and closes it on Escape', async () => {
    window.history.replaceState({}, '', '/?face=1')
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: strings.face.buttonLabel })

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

  it('puts the focus on the crew list when the camera is blocked', async () => {
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
      await user.click(screen.getByRole('button', { name: strings.face.buttonLabel }))
      await user.click(
        await screen.findByRole('button', { name: strings.face.continueLabel }),
      )
      await user.click(screen.getByRole('button', { name: strings.face.signIn }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        strings.face.camera.denied,
      )
      // The way in that always works has the focus.
      expect(screen.getByRole('radio', { name: PERSON })).toHaveFocus()
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: original,
      })
    }
  })
})
