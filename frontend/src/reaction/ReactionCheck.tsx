import { useEffect, useId, useReducer, useRef, useState } from 'react'
import { missionNow } from '../domain/clock'
import { contextForTime } from '../domain/context'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { useMotionAllowed } from '../motion/motion'
import { createTonePlayer, type TonePlayer } from './audio'
import {
  REACTION_COLOUR_TARGETS,
  REACTION_DEMO_DURATION_MS,
  REACTION_MIN_SAVE_TRIALS,
  REACTION_NONTARGET_MS,
  REACTION_TRIAL_WINDOW_MS,
  reactionLength,
} from './constants'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from './ids'
import {
  elapsedMs,
  initialReactionState,
  isTarget,
  pickLightKind,
  randomTone,
  randomSize,
  randomWait,
  reactionReducer,
  remainingMs,
  summarize,
  type ReactionModality,
  type ReactionState,
  type StimulusKind,
} from './timing'
import { reactionStrings } from './strings'
import './reaction.css'

// performance.now() is the clock of the measurement (a reaction is measured in
// fractions of a millisecond); a test passes a clock it controls, because a
// fake timer does not move performance.now.
const defaultClock = (): number => performance.now()

// How often the bar of the time left is redrawn, in ms. One timer for the bar
// and one for the end of the run: the measurement itself never reads either.
const BAR_MS = 250

export interface ReactionCheckProps {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  /** This person's entries, for the mission day and the reading context. */
  entries: EntryRecord[]
  serverConfigured?: boolean
  clock?: () => number
  /** The query string of the page; a test passes one instead of the window's. */
  search?: string
  /**
   * Whether only green is a target. Defaults to REACTION_COLOUR_TARGETS (off);
   * a test passes either value.
   */
  colourTargets?: boolean
}

// The optional reaction check of the report phase (REQ-38, T-71). A light or a
// tone appears after a random wait and the person answers with a tap on the
// test area or the space bar; the median reaction time and the lapses are saved
// as two entries of the existing store, so the outbox sends them like any other
// reading. The run is 90 seconds, a shortened form of the 3-minute PVT-B of
// F-phys-06 (team decision, Sun 01:50). Stopping it or leaving the screen keeps
// what was answered, from REACTION_MIN_SAVE_TRIALS valid trials on. A run of the
// demo length shows the result and saves nothing. The step is hidden while Phys
// has not added the two indicators (T-72), so a missing row is never a crash.

interface Latest {
  store: EntryStore
  personId: string
  entries: EntryRecord[]
  indicators: Indicator[]
}

// Writes the median and the lapses of a run, and returns how many entries it
// wrote. Nothing is written for a demo run, for fewer valid trials than
// REACTION_MIN_SAVE_TRIALS, or while a row of the two indicators is missing.
// Errors are shown in the result and never stored.
function persistRun(state: ReactionState, latest: Latest): number {
  if (state.durationMs === REACTION_DEMO_DURATION_MS) return 0
  const run = summarize(state)
  if (run.trials < REACTION_MIN_SAVE_TRIALS) return 0
  const { store, personId, entries, indicators } = latest
  const median = indicators.find((item) => item.id === REACTION_MEDIAN_ID)
  const lapses = indicators.find((item) => item.id === REACTION_LAPSES_ID)
  if (median === undefined || lapses === undefined) return 0
  const own = entries.filter((entry) => entry.personId === personId)
  const now = missionNow(own)
  // The context of a reading without a stated one: the one the local clock
  // picks, the same rule the Entry screen offers (REQ-09).
  const context = contextForTime(now.time)
  let written = 0
  if (run.medianMs !== null) {
    store.add({
      personId,
      indicatorId: median.id,
      value: run.medianMs,
      unit: median.unit,
      missionDay: now.missionDay,
      time: now.time,
      context,
    })
    written += 1
  }
  store.add({
    personId,
    indicatorId: lapses.id,
    value: run.lapses,
    unit: lapses.unit,
    missionDay: now.missionDay,
    time: now.time,
    context,
  })
  return written + 1
}

// One light stimulus: a colour and a shape together, so the target is never
// known by colour alone. The shape is decoration; the label is the name.
function LightShape({
  kind,
  colour,
  size,
}: {
  kind: StimulusKind
  colour: boolean
  size: number
}) {
  const shape = kind === 'white' || kind === 'green' ? 'circle' : kind
  return (
    <span
      className={`reaction__shape reaction__shape--${colour ? kind : 'plain'}`}
      role="img"
      aria-label={
        colour ? reactionStrings.kind[kind] : reactionStrings.kindPlain[kind]
      }
      data-shape={shape}
      // Size changes by scale only, which is a transform and never reflows.
      style={size === 1 ? undefined : { transform: `scale(${size})` }}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        {shape === 'circle' && <circle cx="50" cy="50" r="46" />}
        {shape === 'square' && <rect x="8" y="8" width="84" height="84" rx="6" />}
        {shape === 'triangle' && <polygon points="50,6 95,92 5,92" />}
        {shape === 'diamond' && <polygon points="50,4 96,50 50,96 4,50" />}
      </svg>
    </span>
  )
}
export default function ReactionCheck({
  store,
  personId,
  indicators,
  entries,
  serverConfigured = false,
  clock = defaultClock,
  search,
  colourTargets = REACTION_COLOUR_TARGETS,
}: ReactionCheckProps) {
  const copy = reactionStrings
  const [length] = useState(() =>
    reactionLength(search ?? window.location.search),
  )
  const [modality, setModality] = useState<ReactionModality>('light')
  const [state, dispatch] = useReducer(
    reactionReducer,
    'light' as ReactionModality,
    (initial) => initialReactionState(initial, length, colourTargets),
  )
  // Skipped or finished and dismissed: the step takes no more room.
  const [hidden, setHidden] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [toneMissing, setToneMissing] = useState(false)
  // The clock of the progress bar, raised by its own timer: the bar moves
  // without re-measuring anything.
  const [barAt, setBarAt] = useState(0)
  const headingId = useId()
  const areaRef = useRef<HTMLDivElement>(null)
  const tone = useRef<TonePlayer | null>(null)
  const saved = useRef(false)
  const began = useRef(false)
  // The props the save effect needs, kept current after every render (an
  // effect, not a write during render: React forbids that).
  const latest = useRef<Latest>({ store, personId, entries, indicators })
  // The newest state, for the cleanup that runs when the screen is left.
  const stateRef = useRef(state)
  useEffect(() => {
    latest.current = { store, personId, entries, indicators }
    stateRef.current = state
  })

  const motionAllowed = useMotionAllowed(false)
  const summary = summarize(state)
  const running = state.phase === 'waiting' || state.phase === 'stimulus'

  // 1. The random wait before one stimulus. One timer per wait token, so a
  // false start clears the old one and starts a new wait.
  useEffect(() => {
    if (state.phase !== 'waiting') return
    const sound = state.modality === 'sound'
    const timer = window.setTimeout(
      () =>
        dispatch({
          type: 'stimulus',
          at: clock(),
          kind: sound ? 'tone' : pickLightKind(state.shown, Math.random, colourTargets),
          tone: sound ? randomTone() : undefined,
          size: sound || colourTargets ? undefined : randomSize(),
        }),
      randomWait(),
    )
    return () => window.clearTimeout(timer)
  }, [state.phase, state.waitToken, state.modality, state.shown, colourTargets, clock])

  // 2. The response window. An answer that never comes closes the trial as a
  // lapse, and the next trial starts.
  useEffect(() => {
    if (state.phase !== 'stimulus' || state.stimulusAt === null) return
    // A target waits for an answer; a non-target clears after a short time.
    const windowMs =
      state.kind !== null && !isTarget(state.kind, colourTargets)
        ? REACTION_NONTARGET_MS
        : REACTION_TRIAL_WINDOW_MS
    const left = Math.max(0, state.stimulusAt + windowMs - clock())
    const timer = window.setTimeout(
      () => dispatch({ type: 'timeout', at: clock() }),
      left,
    )
    return () => window.clearTimeout(timer)
  }, [state.phase, state.stimulusAt, state.kind, colourTargets, clock])

  // 3. The end of the run: one timer for the length, so the check stops even
  // while it waits for a stimulus.
  useEffect(() => {
    if (!running || state.endsAt === null) return
    const left = Math.max(0, state.endsAt - clock())
    const timer = window.setTimeout(
      () => dispatch({ type: 'tick', at: clock() }),
      left,
    )
    return () => window.clearTimeout(timer)
  }, [running, state.endsAt, clock])

  // 4. The bar of the time left, redrawn a few times a second.
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setBarAt(clock()), BAR_MS)
    return () => window.clearInterval(timer)
  }, [running, clock])

  // 5. The tone, once per stimulus. A light-only run never loads audio.
  useEffect(() => {
    if (state.phase !== 'stimulus' || state.tone === null) return
    tone.current?.play(state.tone)
  }, [state.phase, state.stimulusAt, state.tone])

  // 6. The keyboard path: the space bar answers wherever the focus is, and
  // Escape stops the check (REQ-15).
  useEffect(() => {
    if (!running) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return
      if (event.key === 'Escape') {
        event.preventDefault()
        dispatch({ type: 'stop' })
        return
      }
      if (event.key === ' ' || event.code === 'Space') {
        // Otherwise the page scrolls, or a focused button fires on key up.
        event.preventDefault()
        dispatch({ type: 'answer', at: clock() })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [running, clock])

  // 7. The focus goes to the test area when the run starts, so the space bar
  // and a screen reader are both on the thing being tested.
  useEffect(() => {
    if (began.current || state.phase !== 'waiting') return
    began.current = true
    areaRef.current?.focus()
  }, [state.phase])

  // 8. The result is saved once, through the store: the outbox sends it like
  // any other reading, so nothing here needs the network (REQ-28). A run stopped
  // with Escape keeps what was answered; with fewer than REACTION_MIN_SAVE_TRIALS
  // valid trials nothing is saved, and a run of the demo length saves nothing
  // either: 30 seconds is a demonstration of the screen, and its two entries
  // would sit in the mission record as a check nobody took (T-76).
  useEffect(() => {
    if (state.phase !== 'finished' || saved.current) return
    saved.current = true
    setSavedCount(persistRun(state, latest.current))
  }, [state])

  // 8b. Leaving the screen in the middle of a run (the person moves on) keeps
  // what was answered, once. The `saved` ref is the guard: a run already saved
  // by step 8, or a second cleanup, writes nothing. Under StrictMode the
  // simulated unmount happens while the check is idle, so it writes nothing
  // either. No state is set here: the component is going away.
  useEffect(
    () => () => {
      const last = stateRef.current
      if (saved.current) return
      if (last.phase !== 'waiting' && last.phase !== 'stimulus') return
      saved.current = true
      persistRun(last, latest.current)
    },
    [],
  )

  // 9. The audio context does not outlive the screen.
  useEffect(() => () => tone.current?.close(), [])

  const medianRow = indicators.find((item) => item.id === REACTION_MEDIAN_ID)
  const lapsesRow = indicators.find((item) => item.id === REACTION_LAPSES_ID)
  // Without both rows there is nowhere to save the result: the step is hidden.
  if (hidden || medianRow === undefined || lapsesRow === undefined) return null

  function begin(chosen: ReactionModality) {
    // The tone player is created inside the click: a browser only starts audio
    // from a person's gesture, and the Start button is that gesture.
    if (chosen === 'sound') {
      if (tone.current === null) tone.current = createTonePlayer()
      setToneMissing(tone.current === null)
    } else {
      setToneMissing(false)
    }
    saved.current = false
    began.current = false
    setSavedCount(0)
    setBarAt(clock())
    dispatch({ type: 'start', modality: chosen, at: clock() })
  }

  function again() {
    saved.current = false
    began.current = false
    setSavedCount(0)
    dispatch({ type: 'reset', modality: state.modality })
  }

  const left = remainingMs(state, barAt)
  const elapsed = elapsedMs(state, barAt)
  const leftShare =
    state.durationMs > 0 ? Math.min(1, Math.max(0, left / state.durationMs)) : 0

  const target = state.kind === null ? true : isTarget(state.kind, colourTargets)
  const demo = state.durationMs === REACTION_DEMO_DURATION_MS
  const tooFew = summary.trials < REACTION_MIN_SAVE_TRIALS

  return (
    <section
      className="reaction panel panel--cut"
      aria-labelledby={headingId}
    >
      <p className="eyebrow">
        <span className="hairline" aria-hidden="true" />
        {copy.eyebrow}
      </p>
      <h2 id={headingId} className="reaction__heading">
        {copy.heading}
      </h2>

      {state.phase === 'idle' && (
        <>
          <p className="reaction__intro">
            {modality === 'sound'
              ? copy.introSound
              : colourTargets
                ? copy.introLightColour
                : copy.introLight}
          </p>
          <p className="reaction__meta">
            {length === REACTION_DEMO_DURATION_MS
              ? copy.demoLength
              : copy.lengthNote}
          </p>
          <fieldset className="reaction__choice">
            <legend>{copy.modalityLegend}</legend>
            <label>
              <input
                type="radio"
                name={`${headingId}-modality`}
                value="light"
                checked={modality === 'light'}
                onChange={() => setModality('light')}
              />
              <span>{copy.light}</span>
            </label>
            <label>
              <input
                type="radio"
                name={`${headingId}-modality`}
                value="sound"
                checked={modality === 'sound'}
                onChange={() => setModality('sound')}
              />
              <span>{copy.sound}</span>
            </label>
          </fieldset>
          <div className="reaction__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => begin(modality)}
            >
              {copy.start}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setHidden(true)}
            >
              {copy.skip}
            </button>
          </div>
        </>
      )}

      {running && (
        <>
          <div className="reaction__top">
            <p className="reaction__progress">{copy.trial(state.done + 1)}</p>
            {state.modality === 'light' && (
              <p className="reaction__rule">
                {colourTargets ? copy.ruleLightColour : copy.ruleLight}
              </p>
            )}
          </div>
          <div
            className="reaction__bar"
            role="progressbar"
            aria-label={copy.timeLeft}
            aria-valuemin={0}
            aria-valuemax={state.durationMs}
            aria-valuenow={elapsed}
            aria-valuetext={copy.hasLeft(Math.ceil(left / 1000))}
          >
            <div
              className="reaction__bar-fill"
              style={{ transform: `scaleX(${leftShare})` }}
            />
          </div>
          <div
            ref={areaRef}
            className={`reaction__area reaction__area--${state.phase}${
              motionAllowed ? '' : ' reaction__area--still'
            }`}
            data-reaction-state={state.phase}
            data-reaction-modality={state.modality}
            data-reaction-target={String(target)}
            data-reaction-kind={state.kind ?? ''}
            role="group"
            aria-label={copy.areaLabel}
            tabIndex={0}
            onClick={() => dispatch({ type: 'answer', at: clock() })}
          >
            {state.phase === 'stimulus' && state.kind !== null ? (
              <span className="reaction__stimulus">
                {state.modality === 'light' ? (
                  <LightShape kind={state.kind} colour={colourTargets} size={state.size} />
                ) : (
                  <span className="reaction__ring" aria-hidden="true" />
                )}
                {/* The visible name of the stimulus; the sound mode shows
                    "Tone", so a person who cannot hear it still sees it. */}
                <span className="reaction__cue" aria-hidden="true">
                  {colourTargets || state.modality === 'sound'
                    ? copy.kind[state.kind]
                    : copy.kindPlain[state.kind]}
                </span>
              </span>
            ) : null}
            <p className="reaction__hint" role="status">
              {state.phase !== 'stimulus'
                ? copy.wait
                : target
                  ? copy.now
                  : copy.notThis}
            </p>
            {state.tooEarly && (
              <p className="reaction__early" role="status">
                {copy.tooEarly}
              </p>
            )}
            {state.wrong && (
              <p className="reaction__early" role="status">
                {copy.wrong}
              </p>
            )}
          </div>
          {toneMissing && (
            <p className="reaction__meta" role="status">
              {copy.noTone}
            </p>
          )}
          <div className="reaction__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => dispatch({ type: 'stop' })}
            >
              {copy.stop}
            </button>
          </div>
        </>
      )}

      {state.phase === 'finished' && (
        <>
          {summary.trials === 0 || (tooFew && !demo) ? (
            <p className="reaction__result" role="status">
              {copy.tooFew}
            </p>
          ) : (
            <>
              <dl className="reaction__figures" data-reaction-result="median">
                <div className="reaction__figure">
                  <dt>{copy.medianLabel}</dt>
                  <dd>{copy.medianValue(summary.medianMs)}</dd>
                </div>
                <div className="reaction__figure">
                  <dt>{copy.lapsesLabel}</dt>
                  <dd>{summary.lapses}</dd>
                </div>
                {state.modality === 'light' && colourTargets && (
                  <div className="reaction__figure">
                    <dt>{copy.errorsLabel}</dt>
                    <dd>{summary.errors}</dd>
                  </div>
                )}
              </dl>
              <p className="reaction__meta">
                {copy.falseStarts(summary.falseStarts)}
              </p>
              <p className="reaction__meta" role="status">
                {demo
                  ? copy.demoNotSaved
                  : copy.saved(savedCount, serverConfigured)}
              </p>
            </>
          )}
          <div className="reaction__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={again}
            >
              {copy.again}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setHidden(true)}
            >
              {copy.done}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
