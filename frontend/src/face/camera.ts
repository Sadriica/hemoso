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

// HAVE_CURRENT_DATA: the element holds the first frame, which is what the model
// needs. Below it, a picture has no size yet and the detection waits for a
// frame that never reaches it, so the panel stays busy with no sentence.
const FIRST_FRAME_READY_STATE = 2

// Five seconds is a camera that will not deliver a frame at all, not a slow one:
// the cheap webcams on a laptop start in under two.
export const FIRST_FRAME_TIMEOUT_MS = 5000

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
  try {
    // The second time the panel opens the camera, the element starts from an
    // empty stream: without this wait the model is handed a video with no
    // frame and the check never finishes.
    await waitForFirstFrame(video)
  } catch (error) {
    // Nothing to show, so nothing stays on: the person is told there is no
    // camera and picks a name instead.
    for (const track of stream.getTracks()) track.stop()
    video.srcObject = null
    throw error
  }

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

// Resolves when the element has a frame, or rejects as a missing camera after
// FIRST_FRAME_TIMEOUT_MS. The sentence the panel already has for a missing
// camera is the honest one: there is nothing to look at, so pick a name.
function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= FIRST_FRAME_READY_STATE) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const onLoaded = (): void => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      video.removeEventListener('loadeddata', onLoaded)
      reject(new CameraError('missing'))
    }, FIRST_FRAME_TIMEOUT_MS)
    video.addEventListener('loadeddata', onLoaded, { once: true })
  })
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
