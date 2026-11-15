import { useEffect, useId, useRef, useState } from 'react'
import { CameraError, startCamera, type CameraSession } from '../face/camera'
import {
  averageDescriptors,
  bestMatch,
  deleteFace,
  loadFaces,
  saveFace,
} from '../face/descriptors'
import { describeError } from '../face/backends'
import { strings, type FaceFallback } from '../strings'
import './face-scan.css'

// Signing in by looking at the camera, on this device only (REQ-36, T-58,
// T-59). The panel opens from the header button and never opens the camera
// before the consent text has been read and accepted.
//
// What leaves this component: a person id. What is kept: 128 numbers per person
// in localStorage, and no frame at all. The model is loaded with import(), so a
// browser that never opens this panel downloads none of it.
//
// It is a quick way to pick a name, not a lock: a photo could fool it, and the
// person picker in the header always works without a camera.

const FRAME_COUNT = 5
// Five frames over about two seconds: long enough for the model to see the
// face in more than one moment, short enough to hold still.
const FRAME_INTERVAL_MS = 400

type Stage = 'consent' | 'ready' | 'registering' | 'signingIn'

// How the check ended, for the picture only: the words come from `message`.
type Outcome = 'success' | 'failure'

// The success mark stays this long before the session opens (about 600 to
// 900 ms, never more than a second), and the result stays on the frame this
// long after the camera has been released.
const RESULT_HOLD_MS = 750
const RESULT_SHOWN_MS = 1800
const STILL_HOLD_MS = 300

// Motion is off with the top bar switch (.app--still) or the system setting.
function motionIsOff(): boolean {
  if (document.querySelector('.app--still') !== null) return true
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

type Message = { text: string; alert: boolean }

export interface FaceSignInProps {
  // The person on duty on this device: the face registered here is theirs, and
  // their face is the one deleted. Empty until a name is signed in (T-70).
  personId: string
  onPersonSelected(personId: string): void
  onClose(): void
  // Puts focus on the way in the sentence names when signing in with the face
  // fails: the Sign in tab, or the crew picker when the server has no accounts.
  onFocusPicker(): void
  // Which of the two that is; the sentence says the same thing.
  fallback?: FaceFallback
  // Tests open the panel with 0 so five frames do not wait two seconds.
  frameIntervalMs?: number
  // How long the success mark shows before the session opens. Tests use 0.
  resultHoldMs?: number
}

export default function FaceSignIn({
  personId,
  onPersonSelected,
  onClose,
  onFocusPicker,
  fallback = 'tab',
  frameIntervalMs = FRAME_INTERVAL_MS,
  resultHoldMs = RESULT_HOLD_MS,
}: FaceSignInProps) {
  const [stage, setStage] = useState<Stage>('consent')
  const [message, setMessage] = useState<Message | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  // Share of the registering frames taken, for the progress arc only.
  const [captured, setCaptured] = useState<number | null>(null)
  const [loadingPercent, setLoadingPercent] = useState<number | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    loadFaces().map((record) => record.personId),
  )

  const headingId = useId()
  const videoLabelId = useId()
  const continueRef = useRef<HTMLButtonElement>(null)
  const registerRef = useRef<HTMLButtonElement>(null)
  const signInRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const focusFirstAction = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const sessionRef = useRef<CameraSession | null>(null)

  const busy = stage === 'registering' || stage === 'signingIn'
  // The frame stays after the camera is released, to show how the check ended.
  const showFrame = cameraOn || outcome !== null

  // A result left on the frame after the camera is released goes away by
  // itself; during a sign-in the session opens first.
  useEffect(() => {
    if (outcome === null || busy) return undefined
    const timer = setTimeout(() => setOutcome(null), RESULT_SHOWN_MS)
    return () => clearTimeout(timer)
  }, [outcome, busy])

  // The consent text comes first, so its button takes the focus.
  useEffect(() => {
    continueRef.current?.focus()
  }, [])

  // Escape closes the panel from anywhere inside it, and the button that opened
  // it takes the focus back.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // The camera is released when the panel goes away, whatever closed it.
  useEffect(
    () => () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    },
    [],
  )

  // After the consent the first action takes the focus, so the panel never
  // looks like the page behind it. Only the consent moves the focus: a camera
  // problem has to leave it on the person picker, which is the way out.
  useEffect(() => {
    if (stage === 'ready' && focusFirstAction.current) {
      focusFirstAction.current = false
      // Registration needs a person on duty; until there is one, the first
      // action is the face that already matches.
      if (personId === '') signInRef.current?.focus()
      else registerRef.current?.focus()
    }
  }, [stage, personId])

  function stopCamera() {
    sessionRef.current?.stop()
    sessionRef.current = null
    setCameraOn(false)
  }

  // `where` is the action that failed: registering happens signed in, so the
  // username and PIN are already there; signing in points at the way in that
  // exists on this screen. The cause goes to the console, name and message only.
  function reportFailure(error: unknown, action: 'register' | 'signIn') {
    console.warn(`face: ${action} failed (${describeError(error)})`)
    const where = action === 'register' ? 'register' : fallback
    const kind =
      error instanceof CameraError ? error.problem : ('failed' as const)
    setMessage({ text: strings.face.problem(kind, where), alert: true })
    // The panel stays open with the sentence. Registering has nowhere else to
    // go but Close; signing in sends the focus to the other way in.
    if (action === 'register') closeRef.current?.focus()
    else onFocusPicker()
  }

  // The model is a separate chunk: the main page never waits for it. Its files
  // download while the camera starts, with the percentage on screen.
  async function prepareModels(): Promise<void> {
    const engine = await import('../face/engine')
    let shown = -1
    await engine.loadModels((fraction) => {
      const percent = Math.floor((fraction * 100) / 10) * 10
      if (percent !== shown) {
        shown = percent
        setLoadingPercent(percent)
      }
    })
  }

  async function descriptorOf(
    video: HTMLVideoElement,
  ): Promise<number[] | null> {
    const engine = await import('../face/engine')
    return engine.descriptorFrom(video)
  }

  async function captureFrames(
    video: HTMLVideoElement,
    count: number,
    onFrame?: (done: number) => void,
  ): Promise<number[][]> {
    const frames: number[][] = []
    for (let index = 0; index < count; index += 1) {
      if (index > 0) await wait(frameIntervalMs)
      const descriptor = await descriptorOf(video)
      if (descriptor !== null) frames.push(descriptor)
      onFrame?.(index + 1)
    }
    return frames
  }

  async function openCamera(): Promise<HTMLVideoElement> {
    const video = videoRef.current
    if (video === null) throw new CameraError('missing')
    const session = await startCamera(video)
    sessionRef.current = session
    setCameraOn(true)
    return video
  }

  // The camera and the model files start together; a camera that fails first
  // is reported and the download is left to finish in the cache.
  async function openCameraAndModels(): Promise<HTMLVideoElement> {
    const loading = prepareModels()
    loading.catch(() => undefined)
    const video = await openCamera()
    await loading
    setLoadingPercent(null)
    return video
  }

  async function register() {
    if (busy || personId === '') return
    setConfirmingDelete(false)
    setMessage(null)
    setOutcome(null)
    setCaptured(0)
    setStage('registering')
    try {
      const video = await openCameraAndModels()
      const frames = await captureFrames(video, FRAME_COUNT, (done) =>
        setCaptured(done / FRAME_COUNT),
      )
      const descriptor = averageDescriptors(frames)
      if (descriptor === null) {
        setOutcome('failure')
        setMessage({ text: strings.face.status.noFace, alert: true })
        return
      }
      const records = saveFace({ personId, descriptor })
      setSavedIds(records.map((record) => record.personId))
      setOutcome('success')
      setMessage({
        text: strings.face.status.registered(personId),
        alert: false,
      })
    } catch (error) {
      reportFailure(error, 'register')
    } finally {
      setLoadingPercent(null)
      setCaptured(null)
      stopCamera()
      setStage('ready')
    }
  }

  async function signIn() {
    if (busy) return
    setConfirmingDelete(false)
    setMessage(null)
    setOutcome(null)
    setStage('signingIn')
    try {
      const video = await openCameraAndModels()
      const frames = await captureFrames(video, 1)
      const probe = frames[0] ?? null
      const match = probe === null ? null : bestMatch(loadFaces(), probe)
      if (match === null) {
        setOutcome('failure')
        setMessage({
          text: strings.face.problem('notRecognised', fallback),
          alert: true,
        })
        onFocusPicker()
        return
      }
      // The ring closes and the check draws before the session opens.
      setOutcome('success')
      await wait(
        motionIsOff() ? Math.min(resultHoldMs, STILL_HOLD_MS) : resultHoldMs,
      )
      onPersonSelected(match.personId)
      onClose()
    } catch (error) {
      reportFailure(error, 'signIn')
    } finally {
      setLoadingPercent(null)
      stopCamera()
      setStage('ready')
    }
  }

  function removeFace() {
    const records = deleteFace(personId)
    setSavedIds(records.map((record) => record.personId))
    setConfirmingDelete(false)
    setMessage({ text: strings.face.status.deleted(personId), alert: false })
  }

  function acceptConsent() {
    focusFirstAction.current = true
    setStage('ready')
  }

  return (
    // A region, not a dialog: the panel sits in the flow of phase 1, the page
    // behind it stays usable, and nothing traps the focus (T-70).
    <section
      id="face-panel"
      className="face-panel"
      role="region"
      aria-labelledby={headingId}
    >
      <h2 id={headingId} className="face-panel__heading">
        {strings.face.heading}
      </h2>

      {stage === 'consent' ? (
        <>
          <p className="face-panel__text">{strings.face.consent}</p>
          <div className="face-panel__actions">
            <button
              ref={continueRef}
              className="button button--primary"
              type="button"
              onClick={acceptConsent}
            >
              {strings.face.continueLabel}
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={onClose}
            >
              {strings.face.cancelLabel}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="face-panel__text">
            {personId === ''
              ? strings.face.chooseFirst
              : strings.face.registeredFor(personId)}
          </p>

          <div className="face-panel__actions">
            <button
              ref={registerRef}
              className="button button--primary"
              type="button"
              disabled={busy || personId === ''}
              onClick={register}
            >
              {strings.face.register}
            </button>
            <button
              ref={signInRef}
              className="button button--secondary"
              type="button"
              disabled={busy}
              onClick={signIn}
            >
              {strings.face.signIn}
            </button>
          </div>

          <div className="face-panel__delete">
            {confirmingDelete ? (
              <>
                <p className="face-panel__text">
                  {strings.face.deleteConfirm(personId)}
                </p>
                <div className="face-panel__actions">
                  <button
                    className="button button--danger"
                    type="button"
                    onClick={removeFace}
                  >
                    {strings.face.deleteConfirmAction}
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    {strings.face.cancelLabel}
                  </button>
                </div>
              </>
            ) : savedIds.includes(personId) ? (
              <button
                className="button button--danger"
                type="button"
                disabled={busy}
                onClick={() => setConfirmingDelete(true)}
              >
                {strings.face.deleteAction}
              </button>
            ) : (
              <p className="face-panel__note">
                {strings.face.noSavedFace(personId)}
              </p>
            )}
          </div>

          {/* The picture exists only while the camera is on. The label is part
              of the panel, so the element is never an unlabelled video. */}
          <div
            className="face-panel__camera"
            hidden={!showFrame}
            aria-hidden={!showFrame}
          >
            <div className="face-panel__frame">
              <video
                ref={videoRef}
                className="face-panel__video"
                aria-labelledby={videoLabelId}
                autoPlay
                playsInline
                muted
              />
              {showFrame && (
                <FaceScan
                  state={outcome ?? 'scanning'}
                  still={motionIsOff()}
                  progress={captured}
                />
              )}
            </div>
            <p className="face-panel__camera-label" id={videoLabelId}>
              {strings.face.videoLabel}
            </p>
          </div>

          <p className="face-panel__status" role="status">
            {loadingPercent !== null
              ? strings.face.loading(loadingPercent)
              : message !== null && !message.alert
                ? message.text
                : ''}
          </p>
          {message !== null && message.alert && (
            <p className="face-panel__status" role="alert">
              {message.text}
            </p>
          )}

          <div className="face-panel__actions">
            <button
              ref={closeRef}
              className="button button--secondary"
              type="button"
              onClick={onClose}
            >
              {strings.face.closeLabel}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

// The picture of the check, over the video. Decoration: the words are in the
// status line, so a screen reader hears nothing from here. `progress` (0 to 1)
// is given only while a face is being registered: the arc fills with the frames.
const BRACKETS = [
  'M52 34 V12 H74',
  'M246 12 H268 V34',
  'M268 206 V228 H246',
  'M74 228 H52 V206',
]
// Decorative dots around the eyes and the mouth. They are not real landmarks.
const LANDMARKS: Array<[number, number]> = [
  [132, 98],
  [188, 98],
  [144, 168],
  [160, 174],
  [176, 168],
]

export function FaceScan({
  state,
  still,
  progress,
}: {
  state: 'scanning' | 'success' | 'failure'
  still: boolean
  progress?: number | null
}) {
  const filling = typeof progress === 'number' && state === 'scanning'
  return (
    <div
      className="face-scan"
      data-state={state}
      data-motion={still ? 'still' : 'moving'}
      data-progress={filling ? String(progress) : undefined}
      aria-hidden="true"
    >
      {state === 'scanning' && <div className="face-scan__line" />}
      <svg className="face-scan__svg" viewBox="0 0 320 240">
        <g className="face-scan__guide">
          {BRACKETS.map((d) => (
            <path key={d} className="face-scan__bracket" d={d} />
          ))}
          <ellipse
            className="face-scan__ring"
            cx="160"
            cy="120"
            rx="84"
            ry="104"
            pathLength="100"
          />
        </g>
        {state === 'scanning' &&
          LANDMARKS.map(([cx, cy], index) => (
            <circle
              key={`${cx}-${cy}`}
              className="face-scan__dot"
              cx={cx}
              cy={cy}
              r="2.5"
              style={{ animationDelay: `${600 + index * 220}ms` }}
            />
          ))}
        {filling && (
          <ellipse
            className="face-scan__progress"
            cx="160"
            cy="120"
            rx="94"
            ry="114"
            pathLength="100"
            style={{
              strokeDashoffset: 100 - Math.min(1, Math.max(0, progress)) * 100,
            }}
          />
        )}
        {state !== 'scanning' && (
          <>
            <ellipse
              className="face-scan__glow"
              cx="160"
              cy="120"
              rx="84"
              ry="104"
            />
            <ellipse
              className="face-scan__done"
              cx="160"
              cy="120"
              rx="84"
              ry="104"
              pathLength="100"
            />
          </>
        )}
        {state === 'success' && (
          <path
            className="face-scan__mark"
            d="M122 122 L150 150 L204 94"
            pathLength="100"
          />
        )}
        {state === 'failure' && (
          <>
            <path
              className="face-scan__mark"
              d="M132 92 L188 148"
              pathLength="100"
            />
            <path
              className="face-scan__mark"
              d="M188 92 L132 148"
              pathLength="100"
            />
          </>
        )}
      </svg>
    </div>
  )
}
