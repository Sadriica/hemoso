import { useEffect, useId, useRef, useState } from 'react'
import { missionNow } from '../domain/clock'
import { contextForTime } from '../domain/context'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { CameraError, startCamera, type CameraSession } from '../face/camera'
import { useMotionAllowed } from '../motion/motion'
import { loadDetector as defaultLoadDetector, type EyeDetector } from './detector'
import { analyse } from './ear'
import { eyeLength } from './enabled'
import { BLINK_RATE_ID, EYE_CLOSURE_ID } from './ids'
import { runCheck } from './run'
import { eyeStrings } from './strings'
import './eye.css'

export interface EyeCheckProps {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  /** This person's entries, for the mission day and the reading context. */
  entries: EntryRecord[]
  serverConfigured?: boolean
  /** Tests pass their own; the app uses the camera of the face panel. */
  openCamera?: (video: HTMLVideoElement) => Promise<CameraSession>
  loadDetector?: () => Promise<EyeDetector>
  /** The query string of the page; a test passes one instead of the window's. */
  search?: string
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

type Phase = 'idle' | 'starting' | 'running' | 'done' | 'problem'
type Problem = keyof typeof eyeStrings.problem

interface Result {
  closedPct: number
  blinkRate: number
  saved: boolean
}

// The optional eye check of the report phase. It measures how much the eyes are
// closed and how often they blink, from the camera, on this device; it reads no
// mood, stress, emotion or mental state. The two numbers are saved as two
// entries of the existing store, like the reaction check, so the outbox sends
// them like any other reading. Escape stops the run and keeps nothing.
export default function EyeCheck({
  store,
  personId,
  indicators,
  entries,
  serverConfigured = false,
  openCamera = startCamera,
  loadDetector = defaultLoadDetector,
  search,
  now,
  sleep,
}: EyeCheckProps) {
  const copy = eyeStrings
  const [length] = useState(() => eyeLength(search ?? window.location.search))
  const [phase, setPhase] = useState<Phase>('idle')
  const [runId, setRunId] = useState(0)
  const [share, setShare] = useState(0)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [stopped, setStopped] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [hidden, setHidden] = useState(false)
  const headingId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  // The props the save needs, current at the end of a run that started earlier.
  const latest = useRef({ store, personId, entries, indicators, serverConfigured })
  useEffect(() => {
    latest.current = { store, personId, entries, indicators, serverConfigured }
  })
  const motionAllowed = useMotionAllowed(false)
  const active = phase === 'starting' || phase === 'running'

  // The run. One effect per press of Start; leaving the screen aborts it and
  // releases the camera.
  useEffect(() => {
    const video = videoRef.current
    if (runId === 0 || video === null) return
    const controller = new AbortController()
    abortRef.current = controller
    let camera: CameraSession | null = null
    // Stop, Escape and leaving the screen release the camera at once, even while
    // the detector is still working on a frame.
    controller.signal.addEventListener('abort', () => camera?.stop())

    void (async () => {
      try {
        try {
          camera = await openCamera(video)
          if (controller.signal.aborted) camera.stop()
        } catch (error) {
          if (controller.signal.aborted) return
          setProblem(error instanceof CameraError ? error.problem : 'busy')
          setPhase('problem')
          return
        }
        if (controller.signal.aborted) return
        let detect: EyeDetector
        try {
          detect = await loadDetector()
        } catch {
          if (controller.signal.aborted) return
          setProblem('models')
          setPhase('problem')
          return
        }
        if (controller.signal.aborted) return
        setPhase('running')
        const run = await runCheck({
          video,
          detect,
          durationMs: length,
          signal: controller.signal,
          onProgress: setShare,
          now,
          sleep,
        })
        // Stopped or left: nothing is kept.
        if (run.aborted) return
        const analysis = analyse(run.frames, run.elapsedMs)
        if (!analysis.enough) {
          setProblem('noFace')
          setPhase('problem')
          return
        }
        const closedPct = Math.round(analysis.closurePct)
        const blinkRate = Math.round(analysis.blinkRatePm)
        setResult({
          closedPct,
          blinkRate,
          saved: persist(closedPct, blinkRate, latest.current),
        })
        setPhase('done')
      } finally {
        // Every exit releases the camera: the light goes off with the run.
        camera?.stop()
      }
    })()

    return () => {
      controller.abort()
      camera?.stop()
    }
    // The run starts only when Start is pressed; the other values are read then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  // Escape stops and discards, while the camera is on.
  useEffect(() => {
    if (!active) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') stop()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active])

  if (hidden) return null

  function begin() {
    setShare(0)
    setProblem(null)
    setStopped(false)
    setResult(null)
    setPhase('starting')
    setRunId((value) => value + 1)
  }

  function stop() {
    abortRef.current?.abort()
    setStopped(true)
    setPhase('idle')
  }

  const secondsLeft = Math.max(0, Math.ceil((length * (1 - share)) / 1000))

  return (
    <section className="eye panel panel--cut" aria-labelledby={headingId}>
      <h2 id={headingId} className="eye__heading">
        {copy.heading}
      </h2>

      {(phase === 'idle' || phase === 'problem') && (
        <>
          <p className="eye__intro">{copy.intro}</p>
          <p className="eye__meta">{copy.lengthNote}</p>
        </>
      )}

      {active && (
        <>
          <p className="eye__meta">{copy.guide}</p>
          <div className="eye__stage" aria-hidden="true">
            <video ref={videoRef} className="eye__video" muted playsInline />
            <span className="eye__guide" />
          </div>
          <div
            className="eye__bar"
            role="progressbar"
            aria-label={copy.timeLeft}
            aria-valuemin={0}
            aria-valuemax={length}
            aria-valuenow={Math.round(length * share)}
            aria-valuetext={copy.hasLeft(secondsLeft)}
          >
            <div
              className={`eye__bar-fill${motionAllowed ? '' : ' eye__bar-fill--still'}`}
              style={{ transform: `scaleX(${share})` }}
            />
          </div>
        </>
      )}

      <p className="eye__status" role="status">
        {phase === 'starting'
          ? copy.starting
          : phase === 'running'
            ? copy.running
            : phase === 'problem' && problem !== null
              ? copy.problem[problem]
              : stopped
                ? copy.stopped
                : ''}
      </p>

      {phase === 'done' && result !== null && (
        <div data-eye-result="done">
          <p className="eye__result">{copy.closedLine(result.closedPct)}</p>
          <p className="eye__result">{copy.blinkLine(result.blinkRate)}</p>
          <p className="eye__meta">{copy.confirms}</p>
          <p className="eye__meta" role="status">
            {result.saved ? copy.saved(serverConfigured) : ''}
          </p>
        </div>
      )}

      <div className="eye__actions">
        {active ? (
          <>
            <button type="button" className="button button--secondary" onClick={stop}>
              {copy.stop}
            </button>
            <p className="eye__meta">{copy.stopHint}</p>
          </>
        ) : phase === 'done' ? (
          <>
            <button type="button" className="button button--secondary" onClick={begin}>
              {copy.again}
            </button>
            <button type="button" className="text-link" onClick={() => setHidden(true)}>
              {copy.close}
            </button>
          </>
        ) : (
          <>
            {problem !== 'denied' &&
              problem !== 'missing' &&
              problem !== 'busy' &&
              problem !== 'models' && (
                <button type="button" className="button" onClick={begin}>
                  {copy.start}
                </button>
              )}
            <button type="button" className="text-link" onClick={() => setHidden(true)}>
              {copy.skip}
            </button>
          </>
        )}
      </div>
    </section>
  )
}

// Writes the two numbers, with the mission day, time and context of the report.
// Returns false while a row of the two indicators is missing.
function persist(
  closedPct: number,
  blinkRate: number,
  latest: {
    store: EntryStore
    personId: string
    entries: EntryRecord[]
    indicators: Indicator[]
  },
): boolean {
  const { store, personId, entries, indicators } = latest
  const closure = indicators.find((item) => item.id === EYE_CLOSURE_ID)
  const blinks = indicators.find((item) => item.id === BLINK_RATE_ID)
  if (closure === undefined || blinks === undefined) return false
  const own = entries.filter((entry) => entry.personId === personId)
  const at = missionNow(own)
  const context = contextForTime(at.time)
  store.add({
    personId,
    indicatorId: closure.id,
    value: closedPct,
    unit: closure.unit,
    missionDay: at.missionDay,
    time: at.time,
    context,
  })
  store.add({
    personId,
    indicatorId: blinks.id,
    value: blinkRate,
    unit: blinks.unit,
    missionDay: at.missionDay,
    time: at.time,
    context,
  })
  return true
}
