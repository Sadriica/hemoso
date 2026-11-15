import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { missionClockFor, type MissionClock } from '../domain/clock'
import { getMissionStart } from '../data/missionStart'
import { MEASUREMENT_CONTEXTS, contextForTime } from '../domain/context'
import { latestEntry, newestFirst } from '../domain/entries'
import { localState, statusFromLocal, type Status } from '../domain/state'
import type {
  AttentionRule,
  Entry as EntryRecord,
  Indicator,
  MeasurementContext,
} from '../domain/types'
import type { EntryStore, Outbox } from '../data/entryStore'
import { IndicatorIcon, StatusIcon, systemColor } from '../icons'
import AttentionBadge from '../components/AttentionBadge'
import { statusBadgeKind, statusText } from '../components/attentionText'
import Notice from '../components/Notice'
import TelemetryVisual, { Sparkline } from '../components/telemetry/TelemetryVisual'
import {
  SCALE_VALUES,
  parseReport,
  readingRows,
  rowContexts,
  type ReadingRow,
} from './entryDraft'
import { strings } from '../strings'
import './entry.css'
import './telemetry-console.css'

// The report screen: one row for every indicator of
// config/data/indicators.csv, on one shared day, time and context, saved with
// one button (REQ-02). An empty row is a reading that was not taken, so the
// person fills in what they measured and saves the rest.
//
// Each row is the system icon, the name, the last reading under it and one
// field on the right, so every value sits in the same column and every row is
// the same height. The field holds the unit inside it and no spin buttons; the
// two blood pressures are two of those fields with a slash between them.

export default function Entry({
  store,
  personId,
  indicators,
  entries,
  rules,
  serverConfigured = false,
  onFilledChange,
  onProgress,
  onNext,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
  // The attention rows of config/rules/attention.csv. With them each panel
  // shows the state of the person's last reading; without them it shows none.
  rules?: AttentionRule[]
  // True only when a server is set up. Without one nothing is sent, so the
  // saved message does not promise a send.
  serverConfigured?: boolean
  // Told how many rows hold a value that is not saved yet, so the screen can
  // keep one primary action at a time. Presentation only.
  onFilledChange?: (count: number) => void
  // Told how many rows are done (filled or saved in this check) out of how many
  // there are, so the scene of the phase can follow. Presentation only.
  onProgress?: (done: number, total: number) => void
  // The way on to the status, offered next to the saved message.
  onNext?: () => void
}) {
  // Day and time belong to the moment the form opens for this person; the
  // screen is keyed by person in App, so they are read once.
  const [defaults] = useState(() => missionClockFor(entries, personId, getMissionStart(personId)))
  const headingId = useId()

  if (indicators.length === 0) {
    return (
      <section aria-labelledby={headingId} className="report-form">
        <h2 id={headingId} className="report-form__heading">
          {strings.entry.heading}
        </h2>
        <Notice tone="info">{strings.entry.noIndicators}</Notice>
      </section>
    )
  }

  return (
    <ReportForm
      store={store}
      personId={personId}
      indicators={indicators}
      entries={entries}
      rules={rules}
      defaults={defaults}
      serverConfigured={serverConfigured}
      onFilledChange={onFilledChange}
      onProgress={onProgress}
      onNext={onNext}
    />
  )
}

function ReportForm({
  store,
  personId,
  indicators,
  entries,
  rules,
  defaults,
  serverConfigured,
  onFilledChange,
  onProgress,
  onNext,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
  rules?: AttentionRule[]
  defaults: MissionClock
  serverConfigured: boolean
  onFilledChange?: (count: number) => void
  onProgress?: (done: number, total: number) => void
  onNext?: () => void
}) {
  const [rows] = useState(() => readingRows(indicators))
  // Nothing animates while the tab is hidden: the figures pause with it.
  const [tabHidden, setTabHidden] = useState(false)
  useEffect(() => {
    const update = (): void => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  const [values, setValues] = useState<Record<string, string>>({})
  const [missionDayText, setMissionDayText] = useState(
    String(defaults.missionDay),
  )
  const [timeText, setTimeText] = useState(defaults.time)
  // The routine prompt (REQ-09): the readings are taken at the clock time the
  // form opens with, so the context that fits that time is the header's. Each
  // row opens on its usual context from the person's earlier entries, or the
  // header's when there are none. Changing the header moves only the rows the
  // person has not changed by hand.
  const [headerContext, setHeaderContext] = useState<MeasurementContext>(() =>
    contextForTime(defaults.time),
  )
  const [contexts, setContexts] = useState<Record<string, MeasurementContext>>(
    () => rowContexts(rows, entries, contextForTime(defaults.time)),
  )
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Which set of four choices is open: the header's, a row's key, or none.
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const contextOf = (row: ReadingRow): MeasurementContext =>
    contexts[row.key] ?? headerContext
  const keepOwn = rows.filter((row) => contextOf(row) !== headerContext).length
  function chooseHeaderContext(choice: MeasurementContext) {
    setHeaderContext(choice)
    setContexts((current) =>
      Object.fromEntries(
        rows.map((row) => [row.key, touched[row.key] ? (current[row.key] ?? choice) : choice]),
      ),
    )
  }
  function chooseRowContext(key: string, choice: MeasurementContext) {
    setContexts((current) => ({ ...current, [key]: choice }))
    setTouched((current) => ({ ...current, [key]: true }))
  }
  function toggleMenu(key: string) {
    setOpenMenu((current) => (current === key ? null : key))
  }
  const rowOfField = new Map(
    rows.flatMap((row) => row.fields.map((field) => [field.indicatorId, row] as const)),
  )
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({})
  const [dayError, setDayError] = useState<string | undefined>()
  const [timeError, setTimeError] = useState<string | undefined>()
  const [status, setStatus] = useState('')
  // The readings of the last save and how many the server had refused before
  // it, so the sentence can follow the outbox: waiting, then sent.
  const [lastSave, setLastSave] = useState<{
    ids: string[]
    refusedBefore: number
  } | null>(null)
  // Subscribed so the sentence is read again whenever the outbox changes.
  useSyncExternalStore(
    (listener) => store.subscribe(listener),
    () => outboxKey(store),
  )
  const sendState = sendStateOf(store, lastSave, serverConfigured)
  // Rows saved in this check, so they keep reading as done once cleared, and
  // whether the last action was a save (it offers the way on).
  const [savedRows, setSavedRows] = useState<Record<string, boolean>>({})
  const [justSaved, setJustSaved] = useState(false)

  const baseId = useId()
  const valueRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const choiceRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const missionDayRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)

  const dayId = `${baseId}-mission-day`
  const dayErrorId = `${dayId}-error`
  const timeId = `${baseId}-time`
  const timeErrorId = `${timeId}-error`

  // With an odd number of plain rows the last one takes the full width, so the
  // two-column layout leaves no hole (presentation only).
  const plain = rows.filter((row) => !row.scale)
  const lastPlainKey = plain.length % 2 === 1 ? plain[plain.length - 1].key : null
  const names = new Map(indicators.map((item) => [item.id, item.name]))
  const errorOf = (row: ReadingRow) =>
    row.fields
      .map((field) => valueErrors[field.indicatorId])
      .find((text) => text !== undefined && text !== '')

  function onValueChange(indicatorId: string, text: string) {
    setValues((current) => ({ ...current, [indicatorId]: text }))
    // The problem belongs to the text that was there when it was written.
    setValueErrors((current) => ({ ...current, [indicatorId]: '' }))
  }

  function focusProblem(row: ReadingRow, problems: Record<string, string>) {
    const field = row.fields.find(
      (item) => problems[item.indicatorId] !== undefined,
    )
    const input =
      field === undefined ? null : valueRefs.current[field.indicatorId]
    if (input !== null && input !== undefined) {
      input.focus()
      return
    }
    choiceRefs.current[row.key]?.focus()
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = rows.flatMap((row) =>
      row.fields.map((field) => ({
        ...field,
        value: values[field.indicatorId] ?? '',
      })),
    )
    const draft = parseReport(fields, missionDayText, timeText)

    if (!draft.ok) {
      const problems = Object.fromEntries(
        Object.entries(draft.valueErrors).filter(([, text]) => text !== ''),
      )
      setValueErrors(problems)
      setDayError(draft.missionDay)
      setTimeError(draft.time)
      setStatus('')
      setJustSaved(false)

      // The first problem on screen takes the focus: a row, then the day, then
      // the time.
      const firstRow = rows.find((row) =>
        row.fields.some((field) => problems[field.indicatorId] !== undefined),
      )
      if (firstRow !== undefined) focusProblem(firstRow, problems)
      else if (draft.missionDay !== undefined) missionDayRef.current?.focus()
      else timeRef.current?.focus()
      return
    }

    if (draft.readings.length === 0) {
      setValueErrors({})
      setDayError(undefined)
      setTimeError(undefined)
      // A save from before still stands, so the way on stays offered.
      setStatus(strings.entry.noReading)
      return
    }

    setValueErrors({})
    setDayError(undefined)
    setTimeError(undefined)

    const savedIds: string[] = []
    const refusedBefore = refusedCount(store)
    for (const reading of draft.readings) {
      const created = store.add({
        personId,
        indicatorId: reading.indicatorId,
        value: reading.value,
        unit: reading.unit,
        missionDay: draft.missionDay,
        time: draft.time,
        context: contextOf(rowOfField.get(reading.indicatorId) ?? rows[0]),
      })
      savedIds.push(created.id)
    }
    setLastSave({ ids: savedIds, refusedBefore })

    const saved = draft.readings.map((reading) =>
      strings.entry.reading(
        names.get(reading.indicatorId) ?? reading.indicatorId,
        `${reading.value} ${strings.cardUnit(reading.unit)}`,
      ),
    )
    setJustSaved(true)
    setSavedRows((current) => ({
      ...current,
      ...Object.fromEntries(
        draft.readings.map((reading) => [
          (rowOfField.get(reading.indicatorId) ?? rows[0]).key,
          true,
        ]),
      ),
    }))
    setStatus(strings.entry.savedList(saved.join(', ')))

    // The day and the time usually repeat; only the readings are cleared.
    setValues((current) => {
      const next = { ...current }
      for (const reading of draft.readings) next[reading.indicatorId] = ''
      return next
    })
  }

  // A row counts as filled when any of its fields has text (or a scale choice).
  const filled = rows.filter((row) =>
    row.fields.some((field) => (values[field.indicatorId] ?? '').trim() !== ''),
  ).length
  const empty = filled === 0
  const isFilled = (row: ReadingRow) =>
    row.fields.some((field) => (values[field.indicatorId] ?? '').trim() !== '')
  const doneCount = rows.filter((row) => isFilled(row) || savedRows[row.key]).length
  // Save is the primary until a save is done and nothing new is typed; then the
  // way on is.
  const afterSave = justSaved && empty
  useEffect(() => {
    onFilledChange?.(filled)
  }, [filled, onFilledChange])
  useEffect(() => {
    onProgress?.(doneCount, rows.length)
  }, [doneCount, rows.length, onProgress])
  const headerMenuId = `${baseId}-header-context`
  const progressId = `${baseId}-progress`
  const reasonId = `${baseId}-reason`

  // Enter in a field goes to the next one instead of sending the form: the day,
  // the time, every row in order, and last the save button.
  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const order: (HTMLElement | null | undefined)[] = [
      missionDayRef.current,
      timeRef.current,
      ...rows.flatMap((row) =>
        row.scale
          ? [choiceRefs.current[row.key]]
          : row.fields.map((field) => valueRefs.current[field.indicatorId]),
      ),
      saveRef.current,
    ]
    const at = order.indexOf(event.currentTarget)
    order.slice(at + 1).find((element) => element != null)?.focus()
  }

  return (
    <section
      aria-labelledby={`${baseId}-heading`}
      className={`report-form rep rep--console${tabHidden ? ' rep--paused' : ''}`}
    >
      <div className="rep-head">
        <div className="rep-title">
          <p className="rep-eyebrow">{strings.entry.console}</p>
          <h2 id={`${baseId}-heading`} className="report-form__heading">
            {strings.entry.heading}
          </h2>
        </div>
        <div className="rep-progress capsule">
          <span className="rep-progress__dots" aria-hidden="true">
            {rows.map((row, index) => (
              <span
                key={row.key}
                className={`rep-progress__dot${index < doneCount ? ' rep-progress__dot--on' : ''}`}
              />
            ))}
          </span>
          {/* Not role="status": the save result below is the one status. */}
          <span id={progressId} aria-live="polite">
            {strings.entry.progress(doneCount, rows.length)}
          </span>
        </div>
      </div>
      {/* noValidate: the messages next to the rows replace the browser bubbles. */}
      <form className="report-form__body" noValidate onSubmit={onSubmit}>
        <div className="rep-meta">
          {/* Day and time as two chips on one line. Each chip is its own text
              field, so a tap edits it; the time is 24-hour HH:MM whatever the
              system clock shows (STANDARDS.md section 4). */}
          <div className="rep-chips">
            <div className="rep-chipwrap">
              <label className="rep-chip" htmlFor={dayId}>
                <span className="rep-chip__label">{strings.entry.missionDay}</span>
                <input
                  ref={missionDayRef}
                  className="rep-chip__input rep-chip__input--day"
                  id={dayId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={missionDayText}
                  aria-invalid={dayError === undefined ? undefined : true}
                  aria-describedby={dayError === undefined ? undefined : dayErrorId}
                  onChange={(event) => setMissionDayText(event.target.value)}
                  onKeyDown={onEnter}
                />
              </label>
            </div>
            <div className="rep-chipwrap">
              <label className="rep-chip" htmlFor={timeId}>
                <span className="rep-chip__label">{strings.entry.time}</span>
                <input
                  ref={timeRef}
                  className="rep-chip__input rep-chip__input--time"
                  id={timeId}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={5}
                  placeholder="HH:MM"
                  value={timeText}
                  aria-invalid={timeError === undefined ? undefined : true}
                  aria-describedby={
                    timeError === undefined ? undefined : timeErrorId
                  }
                  onChange={(event) => setTimeText(event.target.value)}
                  onKeyDown={onEnter}
                />
              </label>
            </div>
            {/* What the person was doing when they took the readings, so each
                value is compared with readings of the same kind (FORMATS.md
                section 3). Said once here; a row only says its own when it is
                another one. */}
            <div className="rep-chipwrap">
              <button
                type="button"
                className="rep-chip rep-chip--button"
                aria-expanded={openMenu === 'header'}
                aria-controls={headerMenuId}
                onClick={() => toggleMenu('header')}
              >
                <span className="rep-chip__label">{strings.entry.context}</span>
                <span className="rep-chip__value">
                  {strings.entry.contextLabels[headerContext]}
                </span>
                <span className="rep-chip__change">{strings.entry.change}</span>
              </button>
            </div>
          </div>
          {(dayError !== undefined || timeError !== undefined) && (
            <div className="rep-chiperrors">
              {dayError !== undefined && (
                <FieldError id={dayErrorId}>{dayError}</FieldError>
              )}
              {timeError !== undefined && (
                <FieldError id={timeErrorId}>{timeError}</FieldError>
              )}
            </div>
          )}

          {openMenu === 'header' && (
            <ContextChoices
              id={headerMenuId}
              legend={strings.entry.context}
              name={`${baseId}-context`}
              value={headerContext}
              onChoose={chooseHeaderContext}
              onClose={() => setOpenMenu(null)}
            />
          )}
          <p className="rep-keep">{strings.entry.timeHelp}</p>
          {keepOwn > 0 && (
            <p className="rep-keep">{strings.entry.keepOwn(keepOwn)}</p>
          )}
        </div>


        <ul className="rep-rows">
          {rows.map((row, index) => (
            <ReadingRowField
              key={row.key}
              row={row}
              index={index}
              telemetry={telemetryOf(row, values, entries, contextOf(row))}
              status={
                rules === undefined ? null : lastStatus(row, entries, indicators, rules)
              }
              baseId={baseId}
              values={values}
              error={errorOf(row)}
              last={lastReading(row, entries)}
              onChange={onValueChange}
              valueRefs={valueRefs}
              choiceRefs={choiceRefs}
              onEnter={onEnter}
              wide={row.key === lastPlainKey}
              context={contextOf(row)}
              headerContext={headerContext}
              done={isFilled(row) || savedRows[row.key] === true}
              menuOpen={openMenu === row.key}
              onToggleMenu={() => toggleMenu(row.key)}
              onContext={(choice) => chooseRowContext(row.key, choice)}
            />
          ))}
        </ul>

        <div className={`rep-footer${afterSave && onNext !== undefined ? ' rep-footer--saved' : ''}`}>
          {/* The live region stays in place so the text is read out when it appears. */}
          <div className="rep-saved">
            <p className="form__status" role="status">
              {status}
              {status !== '' && sendState !== null && ` ${sendWords[sendState]}`}
            </p>
            {afterSave && onNext !== undefined && (
              <button
                type="button"
                className="button button--primary rep-next"
                aria-label={strings.entry.nextLabel}
                onClick={onNext}
              >
                {strings.entry.next}
                <span className="rep-next__arrow" aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <div className="rep-actions">
            <button
              ref={saveRef}
              className={`button ${afterSave && onNext !== undefined ? 'button--secondary' : 'button--primary'} rep-save`}
              type="submit"
              aria-disabled={empty ? true : undefined}
              aria-describedby={reasonId}
            >
              {strings.entry.save}
            </button>
            <p className="rep-actions__reason" id={reasonId}>
              {empty ? strings.entry.saveNeeds : strings.entry.saveWhat}
            </p>
          </div>
        </div>
      </form>
    </section>
  )
}

function ReadingRowField({
  row,
  index,
  telemetry,
  status,
  baseId,
  values,
  error,
  last,
  onChange,
  valueRefs,
  choiceRefs,
  onEnter,
  wide,
  context,
  headerContext,
  done,
  menuOpen,
  onToggleMenu,
  onContext,
}: {
  row: ReadingRow
  /** The place of the panel in the console, for its channel number. */
  index: number
  telemetry: RowTelemetry
  /** The state of the last saved reading; null with none or with no rules. */
  status: Status | null
  baseId: string
  values: Record<string, string>
  error: string | undefined
  last: string | null
  onChange: (indicatorId: string, text: string) => void
  valueRefs: { current: Record<string, HTMLInputElement | null> }
  choiceRefs: { current: Record<string, HTMLInputElement | null> }
  onEnter: (event: KeyboardEvent<HTMLInputElement>) => void
  wide: boolean
  context: MeasurementContext
  headerContext: MeasurementContext
  done: boolean
  menuOpen: boolean
  onToggleMenu: () => void
  onContext: (choice: MeasurementContext) => void
}) {
  const unitId = `${baseId}-${row.key}-unit`
  const lastId = `${baseId}-${row.key}-last`
  const errorId = `${baseId}-${row.key}-error`
  const nameId = `${baseId}-${row.key}-name`
  const menuId = `${baseId}-${row.key}-ctx`
  // A row says its own context only when it is not the header's: the tag is
  // the control. A row that matches shows a quiet button with no words, so the
  // context of one row can still be changed.
  const differs = context !== headerContext
  const contextLabel = strings.entry.contextLabels[context]
  const ctxControl = (
    <button
      type="button"
      className={`rep-ctx${differs ? ' rep-ctx--tag' : ' rep-ctx--quiet'}`}
      aria-expanded={menuOpen}
      aria-controls={menuOpen ? menuId : undefined}
      aria-label={
        differs
          ? `${strings.entry.rowContext(row.name)}: ${contextLabel} ${strings.entry.change}`
          : `${strings.entry.rowContext(row.name)}: ${contextLabel}`
      }
      onClick={onToggleMenu}
    >
      {differs ? (
        <>
          <span>{contextLabel}</span>{' '}
          <span className="rep-ctx__change">{strings.entry.change}</span>
        </>
      ) : (
        <>
          <span>{strings.entry.context}</span>
          <span aria-hidden="true">▾</span>
        </>
      )}
    </button>
  )
  // A screen reader reads the name, then the unit, the last reading and the
  // problem of the group it is in.
  const describedBy = [
    last === null ? null : lastId,
    error === undefined ? null : errorId,
  ]
    .filter((id): id is string => id !== null)
    .join(' ')
  const style = {
    '--reading-system':
      row.system === null ? 'var(--color-border)' : systemColor(row.system),
  } as CSSProperties
  const invalid = error === undefined ? undefined : true
  const pair = row.fields.length === 2

  const title = pair || row.scale ? (
    <p className="rep-row__name" id={nameId}>
      {row.name}
    </p>
  ) : (
    <label className="rep-row__name" htmlFor={`${baseId}-${row.fields[0].indicatorId}`}>
      {row.name}
    </label>
  )
  const lastLine =
    last === null ? null : (
      <p className="rep-row__last" id={lastId}>
        {last}
      </p>
    )
  const errorLine =
    error === undefined ? null : <FieldError id={errorId}>{error}</FieldError>
  // The state of the last saved reading, in words with its icon. It is about
  // that reading, never about the value being typed.
  const stateLine =
    status === null ? null : (
      <p className="rep-row__state">
        <span className="sr-only">{strings.entry.lastState} </span>
        <AttentionBadge kind={statusBadgeKind(status)} text={statusText(status)} />
      </p>
    )
  // The live figure follows the readout; the small history is the person's
  // own earlier readings, with the count and the two ends in words.
  const scope = (
    <div className="rep-row__scope">
      <TelemetryVisual kind={row.key} values={telemetry.live} />
    </div>
  )
  const trend =
    telemetry.history.length === 0 ? (
      <p className="rep-row__history rep-row__history--empty">
        {strings.entry.noHistory}
      </p>
    ) : (
      <div className="rep-row__trend">
        <Sparkline values={telemetry.history} pending={telemetry.pending} />
        <p className="rep-row__history">
          {strings.entry.history(
            pair ? row.fields[0].label : null,
            telemetry.history.length,
            Math.min(...telemetry.history),
            Math.max(...telemetry.history),
            strings.cardUnit(row.unit),
          )}
        </p>
      </div>
    )

  return (
    <li
      className={`rep-row${done ? ' rep-row--done' : ''}${row.scale ? ' rep-row--scale' : ''}${wide ? ' rep-row--wide' : ''}${pair ? ' rep-row--pair' : ''}`}
      style={style}
    >
      <span className="rep-row__channel" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
        {/* Done is a check beside the channel number and a stronger edge,
            never colour alone. */}
        {done && <span className="rep-row__check">✓</span>}
      </span>
      <span className="rep-row__icon">
        <IndicatorIcon
          indicatorId={row.iconId}
          colored={row.system !== null}
          size={24}
        />
      </span>

      {row.scale ? (
        <div
          className="rep-row__body"
          role="group"
          aria-labelledby={nameId}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        >
          <div className="rep-row__head">
            {title}
            {lastLine}
            {ctxControl}
            {stateLine}
          </div>
          {scope}
          <div className="rep-pills">
            {SCALE_VALUES.map((choice, index) => (
              <label key={choice} className="rep-pill">
                <input
                  ref={(element) => {
                    if (index === 0) choiceRefs.current[row.key] = element
                  }}
                  type="radio"
                  name={`${baseId}-${row.key}`}
                  value={choice}
                  checked={values[row.fields[0].indicatorId] === String(choice)}
                  onChange={() =>
                    onChange(row.fields[0].indicatorId, String(choice))
                  }
                />
                <b>{choice}</b> <span>{strings.entry.scaleWords[index]}</span>
              </label>
            ))}
          </div>
          {errorLine}
          {trend}
        </div>
      ) : (
        <div
          className="rep-row__body"
          role={pair ? 'group' : undefined}
          aria-labelledby={pair ? nameId : undefined}
          aria-describedby={pair ? `${unitId} ${describedBy}`.trim() : undefined}
          aria-invalid={pair ? invalid : undefined}
        >
          <div className="rep-row__head">
            {title}
            {lastLine}
            {ctxControl}
            {stateLine}
          </div>
          {scope}

          {/* One field, one border: the value large on the left, the unit
              inside on the right. The blood pressure is the same field with
              two values, "120 / 80 mmHg", each its own entry. */}
          <span
            onClick={(event) => {
              if (event.target instanceof HTMLInputElement) return
              const inputs = event.currentTarget.querySelectorAll('input')
              inputs[event.target === event.currentTarget ? 0 : inputs.length - 1]?.focus()
            }}
            className={`rep-field${pair ? ' rep-field--pair' : ''}${invalid ? ' rep-field--invalid' : ''}`}>
            {row.fields.map((field, index) => (
              <span key={field.indicatorId} className="rep-field__part">
                {index > 0 && (
                  <span className="rep-field__slash" aria-hidden="true">
                    /
                  </span>
                )}
                {/* A single field is named by the visible title above it; a
                    second label would make a screen reader say the name
                    twice. The two blood pressure fields have no title of
                    their own, so each keeps a hidden one. */}
                {pair && (
                  <label
                    className="sr-only"
                    htmlFor={`${baseId}-${field.indicatorId}`}
                  >
                    {field.label}
                  </label>
                )}
                <input
                  ref={(element) => {
                    valueRefs.current[field.indicatorId] = element
                  }}
                  className="rep-field__input"
                  id={`${baseId}-${field.indicatorId}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="–"
                  value={values[field.indicatorId] ?? ''}
                  aria-invalid={invalid}
                  aria-describedby={`${unitId} ${describedBy}`.trim()}
                  onChange={(event) =>
                    onChange(field.indicatorId, event.target.value)
                  }
                  onKeyDown={onEnter}
                />
              </span>
            ))}
            <span className="rep-field__unit" id={unitId}>
              {row.unit}
            </span>
          </span>
          {errorLine}
          {trend}
        </div>
      )}
      {menuOpen && (
        <ContextChoices
          id={menuId}
          legend={strings.entry.rowContext(row.name)}
          name={`${baseId}-${row.key}-context`}
          value={context}
          onChoose={onContext}
          onClose={onToggleMenu}
          row
        />
      )}
    </li>
  )
}

// The four contexts as one segmented control of radios: the arrow keys change
// it like the scale. Escape closes it.
function ContextChoices({
  id,
  legend,
  name,
  value,
  onChoose,
  onClose,
  row = false,
}: {
  id: string
  legend: string
  name: string
  value: MeasurementContext
  onChoose: (choice: MeasurementContext) => void
  onClose: () => void
  row?: boolean
}) {
  return (
    <fieldset
      id={id}
      className={`rep-segment${row ? ' rep-segment--row' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="rep-segment__track">
        {MEASUREMENT_CONTEXTS.map((choice) => (
          <label key={choice} className="rep-segment__option">
            <input
              type="radio"
              name={name}
              value={choice}
              checked={value === choice}
              onChange={() => onChoose(choice)}
            />
            <span className="rep-segment__mark" aria-hidden="true">
              ✓
            </span>
            <span>{strings.entry.contextLabels[choice]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// The most recent reading of that row, in the words under its name: "last 72
// bpm". A pair is only complete when both of its readings exist.
// What the figures of one panel are drawn from: the value in the readout (or
// the last reading while it is empty), and the person's earlier readings of
// the first field in the panel's context, oldest first.
interface RowTelemetry {
  live: (number | null)[]
  history: number[]
  /** The typed value of the first field, when it is a number. */
  pending: number | null
}

/** How many earlier readings the small history shows: the baseline window. */
const HISTORY_POINTS = 14

function typedNumber(text: string | undefined): number | null {
  const trimmed = (text ?? '').trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function telemetryOf(
  row: ReadingRow,
  values: Record<string, string>,
  entries: EntryRecord[],
  context: MeasurementContext,
): RowTelemetry {
  const typed = row.fields.map((field) => typedNumber(values[field.indicatorId]))
  const live = row.fields.map((field, index) => {
    if (typed[index] !== null) return typed[index]
    const latest = latestEntry(
      entries.filter((entry) => entry.indicatorId === field.indicatorId),
    )
    return latest === null ? null : latest.value
  })
  const first = row.fields[0].indicatorId
  const history = newestFirst(
    entries.filter(
      (entry) => entry.indicatorId === first && entry.context === context,
    ),
  )
    .slice(0, HISTORY_POINTS)
    .map((entry) => entry.value)
    .reverse()
  return { live, history, pending: typed[0] }
}

// The four states, least to most serious: a pressure pair shows the worse of
// its two (docs/findings/bio2-01-pressure-state-rule.md).
const STATE_RANK = ['no_data', 'in_range', 'outside_range', 'needs_review']

function lastStatus(
  row: ReadingRow,
  entries: EntryRecord[],
  indicators: Indicator[],
  rules: AttentionRule[],
): Status | null {
  let worst: Status | null = null
  for (const field of row.fields) {
    const own = entries.filter((entry) => entry.indicatorId === field.indicatorId)
    const latest = latestEntry(own)
    const indicator = indicators.find((item) => item.id === field.indicatorId)
    if (latest === null || indicator === undefined) return null
    const status = statusFromLocal(
      localState(
        latest,
        own,
        rules.filter((rule) => rule.indicatorId === field.indicatorId),
        indicator.minSpread,
      ),
    )
    if (
      worst === null ||
      STATE_RANK.indexOf(status.state) > STATE_RANK.indexOf(worst.state)
    ) {
      worst = status
    }
  }
  return worst
}

// What happened to the readings of the last save, for the sentence under the
// form. With no server they stay on the device. With one they wait in the
// outbox, and the sentence changes once the outbox lets them go: sent, or not
// accepted when the server refused one of them meanwhile.
type SendState = 'device' | 'waiting' | 'sent' | 'refused'

const sendWords: Record<SendState, string> = {
  device: strings.entry.savedOnDevice,
  waiting: strings.entry.saved,
  sent: strings.entry.sent,
  refused: strings.entry.notAccepted,
}

type MaybeOutbox = EntryStore & Partial<Outbox>

function refusedCount(store: MaybeOutbox): number {
  const snapshot = store.getOutboxSnapshot?.()
  return snapshot === undefined
    ? 0
    : snapshot.conflictCount + snapshot.rejectedCount
}

// One string per state of the outbox, so the screen re-reads it on a change.
function outboxKey(store: MaybeOutbox): string {
  const snapshot = store.getOutboxSnapshot?.()
  return snapshot === undefined
    ? ''
    : `${snapshot.pendingCount}:${snapshot.conflictCount}:${snapshot.rejectedCount}`
}

function sendStateOf(
  store: MaybeOutbox,
  lastSave: { ids: string[]; refusedBefore: number } | null,
  serverConfigured: boolean,
): SendState | null {
  if (lastSave === null) return null
  if (!serverConfigured || store.pending === undefined) return 'device'
  const waiting = new Set(store.pending().map((entry) => entry.id))
  if (lastSave.ids.some((id) => waiting.has(id))) return 'waiting'
  return refusedCount(store) > lastSave.refusedBefore ? 'refused' : 'sent'
}

function lastReading(row: ReadingRow, entries: EntryRecord[]): string | null {
  const latest = row.fields.map((field) =>
    latestEntry(entries.filter((entry) => entry.indicatorId === field.indicatorId)),
  )
  if (latest.some((entry) => entry === null)) return null
  const values = latest.map((entry) => String(entry?.value))
  return strings.entry.lastValue(
    `${values.join(' / ')} ${strings.cardUnit(row.unit)}`,
  )
}

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p className="field__error" id={id}>
      <span className="field__error-icon">
        <StatusIcon kind="warning" size={16} />
      </span>
      <span>{children}</span>
    </p>
  )
}
