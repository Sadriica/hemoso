// The camera of the face panel (REQ-36): start it, stop every track, and turn
// whatever the browser throws into one of three plain reasons the screen can
// write as a sentence. No frame is kept here; the picture goes to the model and
// is dropped.

export type CameraProblem = 'denied' | 'missing' | 'busy'

// A camera that will not start is a normal state (a laptop without one, a site
// the person has not allowed), so the error carries a reason instead of a
// message of its own.
export class CameraError extends Error {
  readonly problem: CameraProblem

  constructor(problem: CameraProblem) {
    super(`camera: ${problem}`)
    this.name = 'CameraError'
    this.problem = problem
  }
}

export interface CameraSession {
  stop(): void
}

export async function startCamera(
  video: HTMLVideoElement,
): Promise<CameraSession> {
  const devices = navigator.mediaDevices
  if (devices === undefined || typeof devices.getUserMedia !== 'function') {
    throw new CameraError('missing')
  }

  let stream: MediaStream
  try {
    // Front camera, default resolution: the model resizes the frame anyway.
    stream = await devices.getUserMedia({ video: true })
  } catch (error) {
    throw new CameraError(problemFor(error))
  }

  video.srcObject = stream
  let stopped = false

  return {
    stop() {
      if (stopped) return
      stopped = true
      // Every track, not just the video one: a live track keeps the camera
      // light on after the panel closes.
      for (const track of stream.getTracks()) track.stop()
      video.srcObject = null
    },
  }
}

export function problemFor(error: unknown): CameraProblem {
  switch (nameOf(error)) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'NotSupportedError':
      // NotSupportedError is what a browser without a camera stack answers,
      // as in headless Chromium.
      return 'missing'
    default:
      // NotReadableError, TrackStartError, AbortError and anything unknown: the
      // camera is there but something else holds it or stopped it.
      return 'busy'
  }
}

function nameOf(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    return ''
  }
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' ? name : ''
}
