import { useEffect, useId, useRef, useState } from 'react'
import { CameraError, startCamera, type CameraSession } from '../face/camera'
import {
  averageDescriptors,
  bestMatch,
  deleteFace,
  loadFaces,
  saveFace,
} from '../face/descriptors'
import { strings } from '../strings'

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

type Message = { text: string; alert: boolean }

export interface FaceSignInProps {
  // The person picked in the header: the one whose face is deleted.
  personId: string
  // The person ids of the app, so registration takes an existing one.
  personIds: string[]
  onPersonSelected(personId: string): void
  onClose(): void
  // Puts focus back on the person picker, the fallback the screen names.
  onFocusPicker(): void
  // Tests open the panel with 0 so five frames do not wait two seconds.
  frameIntervalMs?: number
}

export default function FaceSignIn({
  personId,
  personIds,
  onPersonSelected,
  onClose,
  onFocusPicker,
  frameIntervalMs = FRAME_INTERVAL_MS,
}: FaceSignInProps) {
  const [stage, setStage] = useState<Stage>('consent')
  const [message, setMessage] = useState<Message | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [targetId, setTargetId] = useState(personId || personIds[0] || '')
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    loadFaces().map((record) => record.personId),
  )

  const headingId = useId()
  const videoLabelId = useId()
  const targetFieldId = useId()
  const continueRef = useRef<HTMLButtonElement>(null)
  const registerRef = useRef<HTMLButtonElement>(null)
  const focusRegister = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const sessionRef = useRef<CameraSession | null>(null)

  const busy = stage === 'registering' || stage === 'signingIn'

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
    if (stage === 'ready' && focusRegister.current) {
      focusRegister.current = false
      registerRef.current?.focus()
    }
  }, [stage])

  function stopCamera() {
    sessionRef.current?.stop()
    sessionRef.current = null
    setCameraOn(false)
  }

  function reportFailure(error: unknown) {
    // A camera that will not start has its own sentence; anything else is the
    // model or the browser giving up, and the person still has the picker.
    if (error instanceof CameraError) {
      setMessage({ text: strings.face.camera[error.problem], alert: true })
    } else {
      setMessage({ text: strings.face.status.failed, alert: true })
    }
    // The panel stays open with the sentence, and the picker that always works
    // takes the focus.
    onFocusPicker()
  }

  // The model is a separate chunk: the main page never waits for it.
  async function descriptorOf(
    video: HTMLVideoElement,
  ): Promise<number[] | null> {
    const engine = await import('../face/engine')
    return engine.descriptorFrom(video)
  }

  async function captureFrames(
    video: HTMLVideoElement,
    count: number,
  ): Promise<number[][]> {
    const frames: number[][] = []
    for (let index = 0; index < count; index += 1) {
      if (index > 0) await wait(frameIntervalMs)
      const descriptor = await descriptorOf(video)
      if (descriptor !== null) frames.push(descriptor)
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

  async function register() {
    if (busy) return
    setConfirmingDelete(false)
    setMessage(null)
    setStage('registering')
    try {
      const video = await openCamera()
      const frames = await captureFrames(video, FRAME_COUNT)
      const descriptor = averageDescriptors(frames)
      if (descriptor === null) {
        setMessage({ text: strings.face.status.noFace, alert: true })
        return
      }
      const records = saveFace({ personId: targetId, descriptor })
      setSavedIds(records.map((record) => record.personId))
      setMessage({
        text: strings.face.status.registered(targetId),
        alert: false,
      })
    } catch (error) {
      reportFailure(error)
    } finally {
      stopCamera()
      setStage('ready')
    }
  }

  async function signIn() {
    if (busy) return
    setConfirmingDelete(false)
    setMessage(null)
    setStage('signingIn')
    try {
      const video = await openCamera()
      const frames = await captureFrames(video, 1)
      const probe = frames[0] ?? null
      const match = probe === null ? null : bestMatch(loadFaces(), probe)
      if (match === null) {
        setMessage({ text: strings.face.status.notRecognised, alert: true })
        onFocusPicker()
        return
      }
      onPersonSelected(match.personId)
      onClose()
    } catch (error) {
      reportFailure(error)
    } finally {
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
    focusRegister.current = true
    setStage('ready')
  }

  return (
    <section
      id="face-panel"
      className="face-panel"
      role="dialog"
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
          <div className="field face-panel__person">
            <label htmlFor={targetFieldId}>{strings.face.person}</label>
            <select
              id={targetFieldId}
              value={targetId}
              disabled={busy}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {personIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>

          <div className="face-panel__actions">
            <button
              ref={registerRef}
              className="button button--primary"
              type="button"
              disabled={busy}
              onClick={register}
            >
              {strings.face.register}
            </button>
            <button
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
          <div className="face-panel__camera" hidden={!cameraOn}>
            <video
              ref={videoRef}
              className="face-panel__video"
              aria-labelledby={videoLabelId}
              autoPlay
              playsInline
              muted
            />
            <p className="face-panel__camera-label" id={videoLabelId}>
              {strings.face.videoLabel}
            </p>
          </div>

          <p className="face-panel__status" role="status">
            {message !== null && !message.alert ? message.text : ''}
          </p>
          {message !== null && message.alert && (
            <p className="face-panel__status" role="alert">
              {message.text}
            </p>
          )}

          <div className="face-panel__actions">
            <button
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
