import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { loadContent } from './content/load'
import { SESSION_STORAGE_KEY } from './data/session'
import { STORAGE_KEY } from './data/storedState'
import { strings } from './strings'

const PERSON = 'demo_astronaut_1'
const copy = strings.phases

beforeEach(() => {
  // The carry to the next phase takes half a second; these tests are about what
  // the phase does, so motion is off (src/motion/carry.test.tsx covers the carry).
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  localStorage.clear()
  // Every test starts on the plain page, and some tests open the face panel.
  window.history.replaceState({}, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
  // A test with a server leaves neither its fetch nor its base URL behind.
  vi.unstubAllGlobals()
  vi.stubEnv('VITE_API_BASE_URL', '')
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
    // The history waits behind a closed disclosure.
    expect(screen.queryByText(/Your usual|Not enough earlier entries/)).toBeNull()
    await user.click(screen.getByRole('button', { name: copy.status.historyToggle }))
    expect(
      await screen.findByText(
        /Your usual|Not enough earlier entries/,
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it('reads the stored history of every indicator for the chosen person', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    const indicators = loadContent().indicators
    const first = indicators[0]
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        urls.push(input)
        // The server keeps one reading this device never saved, for the first
        // indicator of the check; every other history is empty.
        const body = input.endsWith(`/indicators/${first.id}/history`)
          ? [
              {
                person_id: PERSON,
                indicator_id: first.id,
                value: 71,
                unit: first.unit,
                mission_day: 31,
                time: '05:15',
                context: 'rest',
              },
            ]
          : []
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(body),
        } as unknown as Response)
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    await signInByName(user)

    // One request per indicator of the content, all for the chosen person.
    await waitFor(() =>
      expect(urls.filter((url) => url.endsWith('/history'))).toHaveLength(
        indicators.length,
      ),
    )
    for (const indicator of indicators) {
      expect(urls).toContain(
        `https://api.example.test/people/${PERSON}/indicators/${indicator.id}/history`,
      )
    }

    // The reading of the other device is in the history the screen shows.
    await user.click(screen.getByRole('button', { name: copy.report.next }))
    await user.click(
      screen.getByRole('button', { name: copy.status.historyToggle }),
    )
    const table = await screen.findByRole('table')
    expect(within(table).getByText('05:15')).toBeInTheDocument()
    expect(within(table).getByText('31')).toBeInTheDocument()
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
    const day = screen.getByLabelText(strings.entry.missionDay) as HTMLInputElement
    const nextDay = String(Number(day.value) + 1)
    await user.clear(day)
    await user.type(day, nextDay)
    await user.type(screen.getByLabelText('Heart rate'), '1234567')
    // The native time input keeps HH:MM in its value on any OS setting.
    fireEvent.change(screen.getByLabelText(strings.entry.time), {
      target: { value: '15:44' },
    })
    const save = screen.getByRole('button', { name: strings.entry.save })
    save.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText(strings.entry.savedOnDevice, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(copy.report.logged(1))).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: copy.report.next }))
    expect(screen.getAllByText('1234567').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(new RegExp(`^FD ${nextDay} · GMT 15:44`)).length,
    ).toBeGreaterThan(0)
  })
})

describe('sign in', () => {
  it('opens the demo with one click and no PIN', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: strings.signIn.demoAction }),
    )

    expect(heading()).toHaveTextContent(copy.report.headline.join(' '))
    expect(screen.getByText(strings.topbar.onDuty(PERSON))).toBeInTheDocument()
    // The demo needs no token, so nothing is kept that looks like one.
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('asks for the PIN again when the server stops accepting the token', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    const authorizations: Array<string | null> = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        authorizations.push(headers.get('authorization'))
        if (String(input).endsWith('/sessions')) {
          return Promise.resolve({
            status: 200,
            json: () =>
              Promise.resolve({
                token: 'tok',
                person_id: 'cadet_okoro',
                expires_at: '2999-01-01T00:00:00Z',
              }),
          } as unknown as Response)
        }
        // The person routes refuse the token this device holds.
        return Promise.resolve({
          status: 401,
          json: () => Promise.resolve({ detail: 'session expired' }),
        } as unknown as Response)
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(strings.signIn.username), 'cadet_okoro')
    await user.type(screen.getByLabelText(strings.signIn.pin), '4821')
    await user.click(screen.getByRole('button', { name: strings.signIn.action }))

    // The history of that person is asked for with the token, the server
    // refuses it, and the screen asks for the PIN again with the same name.
    await waitFor(() =>
      expect(screen.getByText(strings.signIn.expired)).toBeInTheDocument(),
    )
    expect(authorizations).toContain('Bearer tok')
    expect(screen.getByLabelText(strings.signIn.username)).toHaveValue(
      'cadet_okoro',
    )
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it('keeps the readings of a person who signs out', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(
      screen.getByRole('button', { name: strings.signIn.demoAction }),
    )

    // The day after the latest one in the store, so the new reading is the
    // latest whatever the clock says (CI runs in UTC).
    const day = screen.getByLabelText(strings.entry.missionDay) as HTMLInputElement
    const nextDay = String(Number(day.value) + 1)
    await user.clear(day)
    await user.type(day, nextDay)
    await user.type(screen.getByLabelText('Heart rate'), '7654321')
    await user.click(screen.getByRole('button', { name: strings.entry.save }))
    expect(
      screen.getByText(strings.entry.savedOnDevice, { exact: false }),
    ).toBeInTheDocument()

    // Back to phase 1, out of the session, and in again with the same person.
    await user.click(screen.getByRole('button', { name: copy.report.back }))
    await user.click(screen.getByRole('button', { name: strings.signIn.signOut }))
    await user.click(screen.getByRole('radio', { name: PERSON }))
    await user.click(screen.getByRole('button', { name: copy.identify.next }))
    await user.click(screen.getByRole('button', { name: copy.report.next }))

    // The reading was never the session's to lose (REQ-02).
    expect(screen.getAllByText('7654321').length).toBeGreaterThan(0)
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

  it('puts the day and the clock on one muted line, with who is on duty', async () => {
    const user = userEvent.setup()
    render(<App />)
    const stamp = /^Flight Day \d+ · GMT \d\d:\d\d$/
    // Nothing before sign-in: the day belongs to the person.
    expect(screen.queryByText(stamp)).toBeNull()
    await signInByName(user)
    expect(screen.getByText(stamp)).toBeInTheDocument()
    expect(
      screen.getByText(strings.topbar.onDuty(PERSON), { exact: false }),
    ).toBeInTheDocument()
  })

  it('shows one sync chip, with no server set up', () => {
    render(<App />)
    const chip = screen.getByTitle(
      strings.sync.chip(strings.sync.noServer, strings.sync.savedHere),
    )
    expect(chip).toHaveTextContent(strings.sync.noServer)
    expect(screen.queryByRole('button', { name: strings.sync.sendNow })).toBeNull()
  })

  it('switches motion off and says so with aria-pressed', async () => {
    vi.unstubAllGlobals()
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

describe('face sign-in on the plain page', () => {
  it('shows the face option without a flag, with the panel closed', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: strings.face.buttonLabel }),
    ).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByRole('region', { name: strings.face.heading }),
    ).toBeNull()
  })

  it('shows the face button above the crew list', () => {
    render(<App />)
    expect(screen.getByRole('group', { name: copy.identify.crewLabel })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.face.buttonLabel }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens the panel with the consent text and closes it on Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: strings.face.buttonLabel })

    await user.click(button)
    const panel = await screen.findByRole('region', { name: strings.face.heading })
    expect(panel).toHaveAttribute('aria-labelledby')
    expect(screen.getByText(strings.face.consent)).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: strings.face.heading }),
      ).toBeNull(),
    )
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('puts the focus on the crew list when the camera is blocked', async () => {
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
