import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountClient } from '../data/accountClient'
import { saveSession } from '../data/session'
import { saveFace } from '../face/descriptors'
import { useSession } from '../hooks/useSession'
import { personInitials, personName, strings } from '../strings'
import IdentifyPhase from './IdentifyPhase'

// Phase 1 of T-70: the face first when one is saved on this device, the PIN of
// the person it recognised, and the demo that needs neither. The camera and the
// model are faked: no test opens a camera (REQ-36).

const engine = vi.hoisted(() => ({ descriptorFrom: vi.fn() }))

vi.mock('../face/engine', () => ({
  descriptorFrom: engine.descriptorFrom,
}))

const ORIGINAL_MEDIA_DEVICES = navigator.mediaDevices
const ORIGINAL_READY_STATE = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'readyState',
)
const FAR = '2999-01-01T00:00:00Z'
const PERSON = 'demo_astronaut_1'

function fakeCamera() {
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  })
}

// The usernames the form sent, so a test can read what a typed name became.
const sent: { signIn: string[]; create: string[] } = { signIn: [], create: [] }

function accounts(): AccountClient {
  return {
    isConfigured: () => true,
    signIn: (credentials) => {
      sent.signIn.push(credentials.personId)
      return Promise.resolve({
        kind: 'signedIn',
        session: { personId: 'cadet_okoro', token: 'abc', expiresAt: FAR },
      })
    },
    createAccount: (credentials) => {
      sent.create.push(credentials.personId)
      return Promise.resolve('created')
    },
  }
}

// The phase with the real session hook behind it: what a face match does to the
// person on duty is the point, so the hook is never faked.
function Harness({
  onDone,
  personIds = [PERSON],
}: {
  onDone: () => void
  personIds?: string[]
}) {
  const session = useSession(accounts())
  const headingRef = useRef<HTMLHeadingElement>(null)
  return (
    <IdentifyPhase
      headingRef={headingRef}
      personIds={personIds}
      session={session}
      onDone={onDone}
    />
  )
}

async function matchFace(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: strings.face.buttonLabel }))
  // The panel is a chunk of its own: it arrives after the first click.
  const panel = await screen.findByRole('region', {
    name: strings.face.heading,
  })
  await user.click(
    within(panel).getByRole('button', { name: strings.face.continueLabel }),
  )
  await user.click(within(panel).getByRole('button', { name: strings.face.signIn }))
  return panel
}

beforeEach(() => {
  // The carry to the next phase takes half a second; these tests are about what
  // the phase does, so motion is off (src/motion/carry.test.tsx covers the carry).
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  localStorage.clear()
  engine.descriptorFrom.mockReset()
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 2,
  })
  fakeCamera()
})

afterEach(() => {
  if (ORIGINAL_READY_STATE !== undefined) {
    Object.defineProperty(
      HTMLMediaElement.prototype,
      'readyState',
      ORIGINAL_READY_STATE,
    )
  }
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: ORIGINAL_MEDIA_DEVICES,
  })
})

// The face is the first sign-in method: its button comes before the row that
// opens the username and PIN form.
function expectFaceBeforeUsernameForm() {
  const face = screen.getByRole('button', { name: strings.face.buttonLabel })
  const more = screen.getByRole('tab', { name: strings.signIn.signInTab })
  expect(
    face.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy()
}

describe('Identify', () => {
  it('shows the face option first even with no face saved, and says how to add one', () => {
    render(<Harness onDone={vi.fn()} />)

    expectFaceBeforeUsernameForm()
    expect(screen.getByText(strings.signIn.faceNone)).toBeInTheDocument()
    // Not a dead button: it opens the consent, the camera stays off.
    expect(
      screen.getByRole('button', { name: strings.face.buttonLabel }),
    ).toBeEnabled()
  })

  it('offers to add a face after a PIN sign-in, consent first, or to go on', async () => {
    fakeCamera()
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await user.type(screen.getByLabelText(strings.signIn.username), 'cadet_okoro')
    await user.type(screen.getByLabelText(strings.signIn.pin, { exact: true }), '4821')
    await user.click(screen.getByRole('button', { name: strings.signIn.action }))

    expect(
      await screen.findByRole('heading', { name: strings.signIn.faceOfferHeading }),
    ).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    await user.click(
      screen.getByRole('button', { name: strings.signIn.faceOfferAction }),
    )
    expect(await screen.findByText(strings.face.consent)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.face.cancelLabel }))

    await user.click(screen.getByRole('button', { name: strings.signIn.faceOfferSkip }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('shows a face first when one is saved on this device', () => {
    saveFace({ personId: 'cadet_okoro', descriptor: [1, 1] })
    render(<Harness onDone={vi.fn()} />)

    expectFaceBeforeUsernameForm()
    expect(screen.getByRole('button', { name: strings.face.buttonLabel })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('opens the stored session of the face it recognises, then the report', async () => {
    saveFace({ personId: 'cadet_okoro', descriptor: [1, 1] })
    saveSession({ personId: 'cadet_okoro', token: 'kept', expiresAt: FAR })
    engine.descriptorFrom.mockResolvedValue([1, 1])
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await matchFace(user)

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('asks for the PIN of a face with no session on this device', async () => {
    saveFace({ personId: 'cadet_okoro', descriptor: [1, 1] })
    engine.descriptorFrom.mockResolvedValue([1, 1])
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await matchFace(user)

    // The form of the recognised person, name included, and no way on yet.
    expect(
      await screen.findByText(strings.signIn.askPin('cadet_okoro')),
    ).toBeVisible()
    expect(screen.getByLabelText(strings.signIn.username)).toHaveValue(
      'cadet_okoro',
    )
    expect(onDone).not.toHaveBeenCalled()
  })

  it('asks for the PIN when a name is picked, even with a stored session', async () => {
    saveSession({ personId: 'cadet_okoro', token: 'kept', expiresAt: FAR })
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} personIds={[PERSON, 'cadet_okoro']} />)

    await user.click(screen.getByRole('radio', { name: 'cadet_okoro' }))

    expect(
      await screen.findByText(strings.signIn.askPin('cadet_okoro')),
    ).toBeVisible()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('shows sign in, create an account and the demo without opening anything', () => {
    render(<Harness onDone={vi.fn()} />)

    expect(screen.getByRole('tab', { name: strings.signIn.signInTab })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: strings.signIn.createToggle })).toBeVisible()
    expect(screen.getByRole('button', { name: strings.signIn.demoAction })).toBeVisible()
    expect(screen.getByLabelText(strings.signIn.username)).toBeVisible()
  })

  it('moves the focus to the first field of the chosen form', async () => {
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: strings.signIn.createToggle }))
    expect(screen.getByLabelText(strings.signIn.username)).toHaveFocus()
    expect(screen.getByLabelText(strings.signIn.confirmPin)).toBeInTheDocument()
  })

  it('opens the demo with no PIN at all', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await user.click(screen.getByRole('button', { name: strings.signIn.demoAction }))

    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('adds nothing above the panel while the carry runs, then switches', async () => {
    vi.unstubAllGlobals() // motion on: the carry takes about 500 ms
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await user.click(screen.getByRole('button', { name: strings.signIn.demoAction }))

    expect(screen.queryByText(strings.signIn.signedInAs(PERSON))).toBeNull()
    expect(onDone).not.toHaveBeenCalled()
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
  })

  it('names the person on duty and offers the way out', async () => {
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: PERSON }))
    expect(screen.getByText(strings.signIn.signedInAs(PERSON))).toBeVisible()

    await user.click(screen.getByRole('button', { name: strings.signIn.signOut }))
    expect(screen.queryByText(strings.signIn.signedInAs(PERSON))).toBeNull()
  })

  it('says in plain words that a PIN is wrong', async () => {
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    await user.type(screen.getByLabelText(strings.signIn.username), 'cadet_okoro')
    await user.type(screen.getByLabelText(strings.signIn.pin), '11')
    await user.click(screen.getByRole('button', { name: strings.signIn.action }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      strings.signIn.errors.pin,
    )
  })

  it('turns a typed name into its id, shows it, and signs in with it', async () => {
    sent.signIn.length = 0
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    const field = screen.getByLabelText(strings.signIn.username)
    await user.type(field, 'Juan Pérez')
    expect(
      screen.getByText(strings.signIn.willSignInAs('juan_perez')),
    ).toBeInTheDocument()
    expect(field).toHaveAccessibleDescription(
      strings.signIn.willSignInAs('juan_perez'),
    )
    await user.type(screen.getByLabelText(strings.signIn.pin, { exact: true }), '4821')
    await user.click(screen.getByRole('button', { name: strings.signIn.action }))

    await waitFor(() => expect(sent.signIn).toEqual(['juan_perez']))
  })

  it('creates the account with the normalised name', async () => {
    sent.create.length = 0
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: strings.signIn.createToggle }))
    await user.type(screen.getByLabelText(strings.signIn.username), '  Wambi ')
    await user.type(screen.getByLabelText(strings.signIn.pin, { exact: true }), '4821')
    await user.type(screen.getByLabelText(strings.signIn.confirmPin), '4821')
    await user.click(
      screen.getByRole('button', { name: strings.signIn.createAction }),
    )

    await waitFor(() => expect(sent.create).toEqual(['wambi']))
  })

  it('offers to add a face right after the account is created', async () => {
    fakeCamera()
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await user.click(screen.getByRole('tab', { name: strings.signIn.createToggle }))
    await user.type(screen.getByLabelText(strings.signIn.username), 'wambi')
    await user.type(screen.getByLabelText(strings.signIn.pin, { exact: true }), '4821')
    await user.type(screen.getByLabelText(strings.signIn.confirmPin), '4821')
    await user.click(screen.getByRole('button', { name: strings.signIn.createAction }))

    expect(
      await screen.findByRole('heading', { name: strings.signIn.faceOfferHeading }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.signIn.faceOfferAction }),
    ).toBeEnabled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('shows no preview for a name that is already an id', async () => {
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    await user.type(screen.getByLabelText(strings.signIn.username), 'cadet_okoro')
    expect(screen.queryByText(/You will sign in as/)).toBeNull()
  })

  it('puts the error of a name that cannot work on the field and sends nothing', async () => {
    sent.signIn.length = 0
    const user = userEvent.setup()
    render(<Harness onDone={vi.fn()} />)

    const field = screen.getByLabelText(strings.signIn.username)
    await user.type(field, 'w@mbi')
    await user.type(screen.getByLabelText(strings.signIn.pin, { exact: true }), '4821')
    await user.click(screen.getByRole('button', { name: strings.signIn.action }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      strings.signIn.errors.username,
    )
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription(strings.signIn.errors.username)
    expect(field).toHaveFocus()
    expect(sent.signIn).toEqual([])

    // Typing again clears the error.
    await user.type(field, 'x')
    expect(field).not.toHaveAttribute('aria-invalid')
  })

  it('keeps someone who is not the demo behind a PIN, and shows the id as a name', () => {
    expect(personName('demo_astronaut_1')).toBe('Demo astronaut 1')
    expect(personInitials('demo_astronaut_1')).toBe('DA')
    expect(personInitials('cadet_okoro')).toBe('CO')
  })
})
