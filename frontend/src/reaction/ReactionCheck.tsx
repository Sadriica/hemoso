import { useEffect, useId, useReducer, useRef, useState } from 'react'
import { missionNow } from '../domain/clock'
import { contextForTime } from '../domain/context'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { useMotionAllowed } from '../motion/motion'
import { createTonePlayer, type TonePlayer } from './audio'
import { REACTION_RESPONSE_WINDOW_MS } from './constants'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from './ids'
import {
  initialReactionState,
  randomWait,
  reactionReducer,
  summarize,
  type ReactionModality,
} from './timing'
import { reactionStrings } from './strings'
import './reaction.css'

// performance.now() is the clock of the measurement (a reaction is measured in
// fractions of a millisecond); a test passes a clock it controls, because a
// fake timer does not move performance.now.
const defaultClock = (): number => performance.now()

export interface ReactionCheckProps {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  /** This person's entries, for the mission day and the reading context. */
  entries: EntryRecord[]
  serverConfigured?: boolean
  clock?: () => number
}

// The optional reaction check of the report phase (REQ-38, T-71). A light or a
// tone appears after a random wait and the person answers with a tap on the
// test area or the space bar; the median reaction time and the lapses are saved
// as two entries of the existing store, so the outbox sends them like any other
// reading. The step is hidden while Phys has not added the two indicators
// (T-72), so a missing row is never a crash.
export default function ReactionCheck({
  store,
  personId,
  indicators,
  entries,
  serverConfigured = false,
  clock = defaultClock,
}: ReactionCheckProps) {
  const copy = reactionStrings
  const [modality, setModality] = useState<ReactionModality>('light')
  const [state, dispatch] = useReducer(
    reactionReducer,
    'light' as ReactionModality,
    initialReactionState,
  )
  // Skipped or finished and dismissed: the step takes no more room.
  const [hidden, setHidden] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [toneMissing, setToneMissing] = useState(false)
  const headingId = useId()
  const areaRef = useRef<HTMLDivElement>(null)
  const tone = useRef<TonePlayer | null>(null)
  const saved = useRef(false)
  const began = useRef(false)
  // The props the save effect needs, kept current after every render (an
  // effect, not a write during render: React forbids that).
  const latest = useRef({ store, personId, entries, indicators })
  useEffect(() => {
    latest.current = { store, personId, entries, indicators }
  })

  const motionAllowed = useMotionAllowed(false)
  const summary = summarize(state)
  const running = state.phase === 'waiting' || state.phase === 'stimulus'

  // 1. The random wait before one stimulus. One timer per wait token, so a
  // false start clears the old one and starts a new wait.
  useEffect(() => {
    if (state.phase !== 'waiting') return
    const timer = window.setTimeout(
      () => dispatch({ type: 'stimulus', at: clock() }),
      randomWait(),
    )
    return () => window.clearTimeout(timer)
  }, [state.phase, state.waitToken, clock])

  // 2. The response window. An answer that never comes closes the trial as a
  // lapse, and the next trial starts.
  useEffect(() => {
    if (state.phase !== 'stimulus' || state.stimulusAt === null) return
    const left = Math.max(
      0,
      state.stimulusAt + REACTION_RESPONSE_WINDOW_MS - clock(),
    )
    const timer = window.setTimeout(
      () => dispatch({ type: 'timeout', at: clock() }),
      left,
    )
    return () => window.clearTimeout(timer)
  }, [state.phase, state.stimulusAt, clock])

  // 3. The tone, once per stimulus. A light-only run never loads audio.
  useEffect(() => {
    if (state.phase !== 'stimulus') return
    tone.current?.play()
  }, [state.phase, state.stimulusAt])

  // 4. The keyboard path: the space bar answers wherever the focus is, and
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

  // 5. The focus goes to the test area when the run starts, so the space bar
  // and a screen reader are both on the thing being tested.
  useEffect(() => {
    if (began.current || state.phase !== 'waiting') return
    began.current = true
    areaRef.current?.focus()
  }, [state.phase])

  // 6. The result is saved once, through the store: the outbox sends it like
  // any other reading, so nothing here needs the network (REQ-28).
  useEffect(() => {
    if (state.phase !== 'finished' || saved.current) return
    saved.current = true
    const run = summarize(state)
    if (run.trials === 0) return
    const { store, personId, entries, indicators } = latest.current
    const median = indicators.find((item) => item.id === REACTION_MEDIAN_ID)
    const lapses = indicators.find((item) => item.id === REACTION_LAPSES_ID)
    if (median === undefined || lapses === undefined) return
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
    written += 1
    setSavedCount(written)
  }, [state])

  // 7. The audio context does not outlive the screen.
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
    dispatch({ type: 'start', modality: chosen })
  }

  function again() {
    saved.current = false
    began.current = false
    setSavedCount(0)
    dispatch({ type: 'reset', modality: state.modality })
  }

  return (
    <section className="reaction" aria-labelledby={headingId}>
      <h2 id={headingId} className="reaction__heading">
        {copy.heading}
      </h2>

      {state.phase === 'idle' && (
        <>
          <p className="reaction__intro">{copy.intro}</p>
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
              {copy.light}
            </label>
            <label>
              <input
                type="radio"
                name={`${headingId}-modality`}
                value="sound"
                checked={modality === 'sound'}
                onChange={() => setModality('sound')}
              />
              {copy.sound}
            </label>
          </fieldset>
          <div className="reaction__actions">
            <button
              type="button"
              className="button button--secondary"
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
          <p className="reaction__progress" role="status">
            {copy.trial(state.done + 1, state.total)}
          </p>
          <div
            ref={areaRef}
            className={`reaction__area reaction__area--${state.phase}${
              motionAllowed ? '' : ' reaction__area--still'
            }`}
            data-reaction-state={state.phase}
            data-reaction-modality={state.modality}
            role="group"
            aria-label={copy.areaLabel}
            tabIndex={0}
            onClick={() => dispatch({ type: 'answer', at: clock() })}
          >
            {state.phase === 'stimulus' ? (
              <span className="reaction__stimulus">
                <span
                  className={
                    state.modality === 'light'
                      ? 'reaction__light'
                      : 'reaction__ring'
                  }
                  aria-hidden="true"
                />
                {/* The visible cue of the sound mode: a person who cannot hear
                    the tone still sees when it plays. */}
                <span className="reaction__cue">{copy.cue[state.modality]}</span>
              </span>
            ) : null}
            <p className="reaction__hint">
              {state.phase === 'stimulus'
                ? copy.now
                : copy.wait[state.modality]}
            </p>
            {state.tooEarly && (
              <p className="reaction__early" role="status">
                {copy.tooEarly}
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
          {summary.trials === 0 ? (
            <p className="reaction__result">{copy.stoppedNothing}</p>
          ) : (
            <>
              <p className="reaction__result" data-reaction-result="median">
                {copy.result(summary.medianMs, summary.lapses)}
              </p>
              <p className="reaction__meta">
                {copy.falseStarts(summary.falseStarts)}
              </p>
              {state.stopped && (
                <p className="reaction__meta">{copy.stopped}</p>
              )}
            </>
          )}
          <p className="reaction__meta" role="status">
            {copy.saved(savedCount, serverConfigured)}
          </p>
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
