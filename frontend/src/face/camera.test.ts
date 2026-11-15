import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraError, problemFor, startCamera } from './camera'

// The camera of the face panel, with getUserMedia faked: the three reasons the
// screen writes as a sentence, and the rule that every track is stopped when the
// panel closes (REQ-36).

const ORIGINAL_MEDIA_DEVICES = navigator.mediaDevices

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value,
  })
}

function fakeStream() {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  return { stream, track }
}

function videoElement(): HTMLVideoElement {
  return document.createElement('video')
}

function namedError(name: string): Error {
  const error = new Error(name)
  error.name = name
  return error
}

afterEach(() => {
  vi.restoreAllMocks()
  setMediaDevices(ORIGINAL_MEDIA_DEVICES)
})

describe('startCamera', () => {
  it('asks for the camera and puts the stream on the element', async () => {
    const { stream } = fakeStream()
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    setMediaDevices({ getUserMedia })
    const video = videoElement()

    const session = await startCamera(video)

    expect(getUserMedia).toHaveBeenCalledWith({ video: true })
    expect(video.srcObject).toBe(stream)
    session.stop()
  })

  it('stops every track and clears the element when it closes', async () => {
    const { stream, track } = fakeStream()
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) })
    const video = videoElement()

    const session = await startCamera(video)
    session.stop()

    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(video.srcObject).toBeNull()
  })

  it('stops the tracks once even when stop is called twice', async () => {
    const { stream, track } = fakeStream()
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) })

    const session = await startCamera(videoElement())
    session.stop()
    session.stop()

    expect(track.stop).toHaveBeenCalledTimes(1)
  })

  it('reports a browser without getUserMedia as a missing camera', async () => {
    setMediaDevices(undefined)
    await expect(startCamera(videoElement())).rejects.toMatchObject({
      problem: 'missing',
    })
  })

  it('reports a blocked camera as denied', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotAllowedError')),
    })
    const failure = startCamera(videoElement())
    await expect(failure).rejects.toBeInstanceOf(CameraError)
    await expect(failure).rejects.toMatchObject({ problem: 'denied' })
  })

  it('reports a machine without a camera as missing', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotFoundError')),
    })
    await expect(startCamera(videoElement())).rejects.toMatchObject({
      problem: 'missing',
    })
  })

  it('reports a camera held by another app as busy', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(namedError('NotReadableError')),
    })
    await expect(startCamera(videoElement())).rejects.toMatchObject({
      problem: 'busy',
    })
  })
})

describe('problemFor', () => {
  it('maps the names the browsers use', () => {
    expect(problemFor(namedError('NotAllowedError'))).toBe('denied')
    expect(problemFor(namedError('PermissionDeniedError'))).toBe('denied')
    expect(problemFor(namedError('SecurityError'))).toBe('denied')
    expect(problemFor(namedError('NotFoundError'))).toBe('missing')
    expect(problemFor(namedError('DevicesNotFoundError'))).toBe('missing')
    expect(problemFor(namedError('OverconstrainedError'))).toBe('missing')
    // What a browser without a camera stack answers (headless Chromium).
    expect(problemFor(namedError('NotSupportedError'))).toBe('missing')
    expect(problemFor(namedError('NotReadableError'))).toBe('busy')
    expect(problemFor(namedError('AbortError'))).toBe('busy')
  })

  it('treats anything else as a camera that is busy right now', () => {
    expect(problemFor(new Error('something else'))).toBe('busy')
    expect(problemFor('a string')).toBe('busy')
    expect(problemFor(undefined)).toBe('busy')
  })
})
