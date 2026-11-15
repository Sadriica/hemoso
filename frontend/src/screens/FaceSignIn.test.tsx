import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FaceSignIn, { type FaceSignInProps } from './FaceSignIn'
import { loadFaces, saveFace } from '../face/descriptors'
import { strings } from '../strings'

// The panel of T-58 and T-59, with getUserMedia and the model faked: the camera
// is never opened in a test, and no user is asked for permission (REQ-36).
// The model itself is checked in the browser by hand, not in jsdom.

const engine = vi.hoisted(() => ({ descriptorFrom: vi.fn() }))

vi.mock('../face/engine', () => ({
  descriptorFrom: engine.descriptorFrom,
}))

const ORIGINAL_MEDIA_DEVICES = navigator.mediaDevices

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value,
  })
}

function namedError(name: string): Error {
  const error = new Error(name)
  error.name = name
  return error
}

function fakeStream() {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

function allowCamera() {
  const { stream, track } = fakeStream()
  const getUserMedia = vi.fn().mockResolvedValue(stream)
  setMediaDevices({ getUserMedia })
  return { getUserMedia, track }
}

function renderPanel(overrides: Partial<FaceSignInProps> = {}) {
  const props: FaceSignInProps = {
    personId: 'demo_astronaut_1',
    personIds: ['demo_astronaut_1'],
    onPersonSelected: vi.fn(),
    onClose: vi.fn(),
    onFocusPicker: vi.fn(),
    // Five frames do not wait two seconds in a test.
    frameIntervalMs: 0,
    ...overrides,
  }
  render(<FaceSignIn {...props} />)
  return props
}

// jsdom has no camera and its video element never holds a frame, and starting
// the camera waits for one now. The fake element reports the first frame as
// soon as there is a stream, which is what a browser does.
const ORIGINAL_READY_STATE = Object.getOwnPropertyDescriptor(
  HTMLMediaElement.prototype,
  'readyState',
)

beforeEach(() => {
  localStorage.clear()
  engine.descriptorFrom.mockReset()
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 2,
  })
})

afterEach(() => {
  if (ORIGINAL_READY_STATE !== undefined) {
    Object.defineProperty(
      HTMLMediaElement.prototype,
      'readyState',
      ORIGINAL_READY_STATE,
    )
  }
  setMediaDevices(ORIGINAL_MEDIA_DEVICES)
})

describe('FaceSignIn', () => {
  it('asks for consent before it opens the camera', () => {
    const { getUserMedia } = allowCamera()
    renderPanel()

    expect(screen.getByText(strings.face.consent)).toBeVisible()
    expect(screen.getByRole('button', { name: strings.face.continueLabel })).toHaveFocus()
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('closes without asking for the camera when consent is cancelled', async () => {
    const { getUserMedia } = allowCamera()
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.cancelLabel }))

    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('registers a face by keyboard and tells the person it is saved', async () => {
    const { getUserMedia, track } = allowCamera()
    engine.descriptorFrom.mockResolvedValue([0.2, 0.4])
    const user = userEvent.setup()
    renderPanel()

    // Continue has the focus, so Enter accepts the consent text.
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('button', { name: strings.face.register }),
    ).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        strings.face.status.registered('demo_astronaut_1'),
      ),
    )
    expect(getUserMedia).toHaveBeenCalledWith({ video: true })
    expect(engine.descriptorFrom).toHaveBeenCalledTimes(5)
    expect(loadFaces()).toEqual([
      { personId: 'demo_astronaut_1', descriptor: [0.2, 0.4] },
    ])
    // The camera is released as soon as the frames are taken.
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('registers the person chosen in the panel, not just the header one', async () => {
    allowCamera()
    engine.descriptorFrom.mockResolvedValue([1, 1])
    const user = userEvent.setup()
    renderPanel({ personIds: ['demo_astronaut_1', 'demo_astronaut_2'] })

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.selectOptions(
      screen.getByLabelText(strings.face.person),
      'demo_astronaut_2',
    )
    await user.click(screen.getByRole('button', { name: strings.face.register }))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        strings.face.status.registered('demo_astronaut_2'),
      ),
    )
    expect(loadFaces().map((record) => record.personId)).toEqual([
      'demo_astronaut_2',
    ])
  })

  it('keeps every track of a camera that was opened, even after an empty scan', async () => {
    const { track } = allowCamera()
    engine.descriptorFrom.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.register }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        strings.face.status.noFace,
      ),
    )
    expect(loadFaces()).toEqual([])
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('selects the matching person after one look', async () => {
    allowCamera()
    saveFace({ personId: 'demo_astronaut_2', descriptor: [1, 1] })
    engine.descriptorFrom.mockResolvedValue([1, 1])
    const user = userEvent.setup()
    const props = renderPanel({ personIds: ['demo_astronaut_1', 'demo_astronaut_2'] })

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.signIn }))

    await waitFor(() =>
      expect(props.onPersonSelected).toHaveBeenCalledWith('demo_astronaut_2'),
    )
    expect(props.onClose).toHaveBeenCalledTimes(1)
    // One look is one frame.
    expect(engine.descriptorFrom).toHaveBeenCalledTimes(1)
  })

  it('says so when the face is not recognised and returns the focus to the picker', async () => {
    allowCamera()
    saveFace({ personId: 'demo_astronaut_2', descriptor: [1, 1] })
    engine.descriptorFrom.mockResolvedValue([9, 9])
    const user = userEvent.setup()
    const props = renderPanel({ personIds: ['demo_astronaut_1', 'demo_astronaut_2'] })

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.signIn }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      strings.face.status.notRecognised,
    )
    expect(props.onPersonSelected).not.toHaveBeenCalled()
    expect(props.onFocusPicker).toHaveBeenCalledTimes(1)
  })

  it('names a blocked camera as denied and returns the focus to the picker', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotAllowedError')),
    })
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.register }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      strings.face.camera.denied,
    )
    expect(props.onFocusPicker).toHaveBeenCalledTimes(1)
    expect(engine.descriptorFrom).not.toHaveBeenCalled()
  })

  it('names a missing camera and a busy camera in their own words', async () => {
    const user = userEvent.setup()
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotFoundError')),
    })
    renderPanel()
    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.signIn }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      strings.face.camera.missing,
    )

    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotReadableError')),
    })
    await user.click(screen.getByRole('button', { name: strings.face.signIn }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        strings.face.camera.busy,
      ),
    )
    expect(engine.descriptorFrom).not.toHaveBeenCalled()
  })

  it('deletes the face of the selected person after a confirmation', async () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(
      screen.getByRole('button', { name: strings.face.deleteAction }),
    )
    expect(
      screen.getByText(strings.face.deleteConfirm('demo_astronaut_1')),
    ).toBeVisible()
    // Nothing is deleted until the second button is pressed.
    expect(loadFaces()).toHaveLength(1)

    await user.click(
      screen.getByRole('button', { name: strings.face.deleteConfirmAction }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      strings.face.status.deleted('demo_astronaut_1'),
    )
    expect(loadFaces()).toEqual([])
    expect(
      screen.getByText(strings.face.noSavedFace('demo_astronaut_1')),
    ).toBeVisible()
  })

  it('keeps the face when the confirmation is cancelled', async () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(
      screen.getByRole('button', { name: strings.face.deleteAction }),
    )
    await user.click(screen.getByRole('button', { name: strings.face.cancelLabel }))

    expect(loadFaces()).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: strings.face.deleteAction }),
    ).toBeVisible()
  })

  it('says the face check could not run when the model fails, and stops the camera', async () => {
    const { track } = allowCamera()
    engine.descriptorFrom.mockRejectedValue(new Error('the chunk did not load'))
    const user = userEvent.setup()
    const props = renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    await user.click(screen.getByRole('button', { name: strings.face.register }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      strings.face.status.failed,
    )
    expect(props.onFocusPicker).toHaveBeenCalledTimes(1)
    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('says when no face is saved for the selected person', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))

    expect(
      screen.getByText(strings.face.noSavedFace('demo_astronaut_1')),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: strings.face.deleteAction }),
    ).toBeNull()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const props = renderPanel()

    await user.keyboard('{Escape}')

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('labels the picture and shows it only while the camera is on', async () => {
    const { stream } = fakeStream()
    let release: ((value: MediaStream) => void) | undefined
    setMediaDevices({
      getUserMedia: vi.fn().mockImplementation(
        () =>
          new Promise<MediaStream>((resolve) => {
            release = resolve
          }),
      ),
    })
    engine.descriptorFrom.mockResolvedValue([0.5, 0.5])
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: strings.face.continueLabel }))
    const picture = screen.getByLabelText(strings.face.videoLabel)
    expect(picture.tagName).toBe('VIDEO')
    expect(picture.closest('[hidden]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: strings.face.register }))
    await waitFor(() => expect(release).toBeDefined())
    release?.(stream)
    await waitFor(() => expect(picture.closest('[hidden]')).toBeNull())

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        strings.face.status.registered('demo_astronaut_1'),
      ),
    )
    expect(picture.closest('[hidden]')).not.toBeNull()
  })
})
