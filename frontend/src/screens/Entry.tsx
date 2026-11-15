import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { missionClockFor, type MissionClock } from '../domain/clock'
import { getMissionStart } from '../data/missionStart'
import { MEASUREMENT_CONTEXTS, contextForTime } from '../domain/context'
import { latestEntry } from '../domain/entries'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { IndicatorIcon, StatusIcon, systemColor } from '../icons'
import Notice from '../components/Notice'
import {
  SCALE_VALUES,
  parseReport,
  readingRows,
  type ReadingRow,
} from './entryDraft'
import { strings } from '../strings'
import './entry.css'

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
  serverConfigured = false,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
  // True only when a server is set up. Without one nothing is sent, so the
  // saved message does not promise a send.
  serverConfigured?: boolean
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
      defaults={defaults}
      serverConfigured={serverConfigured}
    />
  )
}

function ReportForm({
  store,
  personId,
  indicators,
  entries,
  defaults,
  serverConfigured,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
  defaults: MissionClock
  serverConfigured: boolean
}) {
  const [rows] = useState(() => readingRows(indicators))
  const [values, setValues] = useState<Record<string, string>>({})
  const [missionDayText, setMissionDayText] = useState(
    String(defaults.missionDay),
  )
  const [timeText, setTimeText] = useState(defaults.time)
  // The routine prompt (REQ-09): the readings are taken at the clock time the
  // form opens with, so the context that fits that time is picked first.
  const [context, setContext] = useState(() => contextForTime(defaults.time))
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({})
  const [dayError, setDayError] = useState<string | undefined>()
  const [timeError, setTimeError] = useState<string | undefined>()
  const [status, setStatus] = useState('')

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
      setStatus(strings.entry.noReading)
      return
    }

    setValueErrors({})
    setDayError(undefined)
    setTimeError(undefined)

    for (const reading of draft.readings) {
      store.add({
        personId,
        indicatorId: reading.indicatorId,
        value: reading.value,
        unit: reading.unit,
        missionDay: draft.missionDay,
        time: draft.time,
        context,
      })
    }

    const saved = draft.readings.map((reading) =>
      strings.entry.reading(
        names.get(reading.indicatorId) ?? reading.indicatorId,
        `${reading.value} ${strings.cardUnit(reading.unit)}`,
      ),
    )
    setStatus(
      `${strings.entry.savedList(saved.join(', '))} ${
        serverConfigured ? strings.entry.saved : strings.entry.savedOnDevice
      }`,
    )

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
    <section aria-labelledby={`${baseId}-heading`} className="report-form rep">
      <h2 id={`${baseId}-heading`} className="report-form__heading">
        {strings.entry.heading}
      </h2>
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

          {/* What the person was doing when they took the readings, so each
              value is compared with readings of the same kind (FORMATS.md
              section 3). One segmented control of radios: the arrow keys
              change it like the scale. */}
          <fieldset className="rep-segment">
            <legend className="sr-only">{strings.entry.context}</legend>
            <div className="rep-segment__track">
              {MEASUREMENT_CONTEXTS.map((choice) => (
                <label key={choice} className="rep-segment__option">
                  <input
                    type="radio"
                    name={`${baseId}-context`}
                    value={choice}
                    checked={context === choice}
                    onChange={() => setContext(choice)}
                  />
                  <span className="rep-segment__mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>{strings.entry.contextLabels[choice]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <ul className="rep-rows">
          {rows.map((row) => (
            <ReadingRowField
              key={row.key}
              row={row}
              baseId={baseId}
              values={values}
              error={errorOf(row)}
              last={lastReading(row, entries)}
              onChange={onValueChange}
              valueRefs={valueRefs}
              choiceRefs={choiceRefs}
              onEnter={onEnter}
            />
          ))}
        </ul>

        <div className="rep-actions">
          <div className="rep-progress">
            <span className="rep-progress__dots" aria-hidden="true">
              {rows.map((row, index) => (
                <span
                  key={row.key}
                  className={`rep-progress__dot${index < filled ? ' rep-progress__dot--on' : ''}`}
                />
              ))}
            </span>
            {/* Not role="status": the save result below is the one status. */}
            <span id={progressId} aria-live="polite">
              {strings.entry.progress(filled, rows.length)}
            </span>
          </div>
          <button
            ref={saveRef}
            className="button button--primary rep-save"
            type="submit"
            aria-disabled={empty ? true : undefined}
            aria-describedby={empty ? reasonId : undefined}
          >
            {strings.entry.save}
          </button>
          {empty && (
            <p className="rep-actions__reason" id={reasonId}>
              {strings.entry.saveNeeds}
            </p>
          )}
        </div>
        {/* The live region stays in place so the text is read out when it appears. */}
        <p className="form__status" role="status">
          {status}
        </p>
      </form>
    </section>
  )
}

function ReadingRowField({
  row,
  baseId,
  values,
  error,
  last,
  onChange,
  valueRefs,
  choiceRefs,
  onEnter,
}: {
  row: ReadingRow
  baseId: string
  values: Record<string, string>
  error: string | undefined
  last: string | null
  onChange: (indicatorId: string, text: string) => void
  valueRefs: { current: Record<string, HTMLInputElement | null> }
  choiceRefs: { current: Record<string, HTMLInputElement | null> }
  onEnter: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  const unitId = `${baseId}-${row.key}-unit`
  const lastId = `${baseId}-${row.key}-last`
  const errorId = `${baseId}-${row.key}-error`
  const nameId = `${baseId}-${row.key}-name`
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

  return (
    <li
      className={`rep-row${row.scale ? ' rep-row--scale' : ''}`}
      style={style}
    >
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
          </div>
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
          </div>

          {/* One field, one border: the value large on the left, the unit
              inside on the right. The blood pressure is the same field with
              two values, "120 / 80 mmHg", each its own entry. */}
          <span className={`rep-field${pair ? ' rep-field--pair' : ''}${invalid ? ' rep-field--invalid' : ''}`}>
            {row.fields.map((field, index) => (
              <span key={field.indicatorId} className="rep-field__part">
                {index > 0 && (
                  <span className="rep-field__slash" aria-hidden="true">
                    /
                  </span>
                )}
                <label
                  className="sr-only"
                  htmlFor={`${baseId}-${field.indicatorId}`}
                >
                  {field.label}
                </label>
                <input
                  ref={(element) => {
                    valueRefs.current[field.indicatorId] = element
                  }}
                  className="rep-field__input"
                  id={`${baseId}-${field.indicatorId}`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder=" "
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
        </div>
      )}
    </li>
  )
}

// The most recent reading of that row, in the words under its name: "last 72
// bpm". A pair is only complete when both of its readings exist.
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
