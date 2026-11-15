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

function accounts(): AccountClient {
  return {
    isConfigured: () => true,
    signIn: () =>
      Promise.resolve({
        kind: 'signedIn',
        session: { personId: 'cadet_okoro', token: 'abc', expiresAt: FAR },
      }),
    createAccount: () => Promise.resolve('created'),
  }
}

// The phase with the real session hook behind it: what a face match does to the
// person on duty is the point, so the hook is never faked.
function Harness({ onDone }: { onDone: () => void }) {
  const session = useSession(accounts())
  const headingRef = useRef<HTMLHeadingElement>(null)
  return (
    <IdentifyPhase
      headingRef={headingRef}
      personIds={[PERSON]}
      session={session}
      faceEnabled
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

describe('Identify', () => {
  it('shows a face first when one is saved on this device', () => {
    saveFace({ personId: 'cadet_okoro', descriptor: [1, 1] })
    render(<Harness onDone={vi.fn()} />)

    const cards = screen.getAllByRole('heading', { level: 2 })
    expect(cards[0]).toHaveTextContent(strings.signIn.faceHeading)
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

  it('opens the demo with no PIN at all', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDone={onDone} />)

    await user.click(screen.getByRole('button', { name: strings.signIn.demoAction }))

    expect(onDone).toHaveBeenCalledTimes(1)
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

  it('keeps someone who is not the demo behind a PIN, and shows the id as a name', () => {
    expect(personName('demo_astronaut_1')).toBe('Demo astronaut 1')
    expect(personInitials('demo_astronaut_1')).toBe('DA')
    expect(personInitials('cadet_okoro')).toBe('CO')
  })
})
