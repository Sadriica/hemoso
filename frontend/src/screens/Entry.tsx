import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { missionNow, type MissionClock } from '../domain/clock'
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
  const [defaults] = useState(() => missionNow(entries))
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

  return (
    <section aria-labelledby={`${baseId}-heading`} className="report-form">
      <h2 id={`${baseId}-heading`} className="report-form__heading">
        {strings.entry.heading}
      </h2>
      {/* noValidate: the messages next to the rows replace the browser bubbles. */}
      <form className="report-form__body" noValidate onSubmit={onSubmit}>
        <div className="report-meta">
          <div className="report-meta__field">
            <label className="field__label" htmlFor={dayId}>
              {strings.entry.missionDay}
            </label>
            <input
              ref={missionDayRef}
              className="field__input report-meta__day"
              id={dayId}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={missionDayText}
              aria-invalid={dayError === undefined ? undefined : true}
              aria-describedby={dayError === undefined ? undefined : dayErrorId}
              onChange={(event) => setMissionDayText(event.target.value)}
            />
            {dayError !== undefined && (
              <FieldError id={dayErrorId}>{dayError}</FieldError>
            )}
          </div>

          <div className="report-meta__field">
            <label className="field__label" htmlFor={timeId}>
              {strings.entry.time}
            </label>
            {/* The native time input follows the OS clock on screen (12-hour on
                an en-US system) but its value is always 24-hour HH:MM, which is
                what is stored and shown (STANDARDS.md section 4). Kept native
                for its keyboard control and time semantics. */}
            <input
              ref={timeRef}
              className="field__input report-meta__time"
              id={timeId}
              type="time"
              value={timeText}
              aria-invalid={timeError === undefined ? undefined : true}
              aria-describedby={
                timeError === undefined ? undefined : timeErrorId
              }
              onChange={(event) => setTimeText(event.target.value)}
            />
            {timeError !== undefined && (
              <FieldError id={timeErrorId}>{timeError}</FieldError>
            )}
          </div>

          {/* What the person was doing when they took the readings, so each
              value is compared with readings of the same kind (FORMATS.md
              section 3). Radios, so the arrow keys change it like the scale. */}
          <fieldset className="report-meta__context">
            <legend className="field__label">{strings.entry.context}</legend>
            <div className="report-meta__choices">
              {MEASUREMENT_CONTEXTS.map((choice) => (
                <label key={choice} className="report-meta__choice">
                  <input
                    type="radio"
                    name={`${baseId}-context`}
                    value={choice}
                    checked={context === choice}
                    onChange={() => setContext(choice)}
                  />
                  {strings.entry.contextLabels[choice]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <ul className="readings">
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
            />
          ))}
        </ul>

        <div className="form__actions">
          <button className="button button--secondary button--save" type="submit">
            {strings.entry.save}
          </button>
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
}: {
  row: ReadingRow
  baseId: string
  values: Record<string, string>
  error: string | undefined
  last: string | null
  onChange: (indicatorId: string, text: string) => void
  valueRefs: { current: Record<string, HTMLInputElement | null> }
  choiceRefs: { current: Record<string, HTMLInputElement | null> }
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

  return (
    <li className={`reading${row.scale ? ' reading--scale' : ''}`} style={style}>
      <span className="reading__icon">
        <IndicatorIcon
          indicatorId={row.iconId}
          colored={row.system !== null}
          size={24}
        />
      </span>

      {row.scale ? (
        <div
          className="reading__body"
          role="group"
          aria-labelledby={nameId}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        >
          <p className="reading__name" id={nameId}>
            {row.name}
          </p>
          <div className="reading__pills">
            {SCALE_VALUES.map((choice, index) => (
              <label key={choice} className="reading__pill">
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
          {last !== null && (
            <p className="reading__last" id={lastId}>
              {last}
            </p>
          )}
          {error !== undefined && <FieldError id={errorId}>{error}</FieldError>}
        </div>
      ) : (
        <div
          className="reading__body"
          role={pair ? 'group' : undefined}
          aria-labelledby={pair ? nameId : undefined}
          aria-describedby={pair ? `${unitId} ${describedBy}`.trim() : undefined}
          aria-invalid={pair ? invalid : undefined}
        >
          {pair ? (
            <p className="reading__name" id={nameId}>
              {row.name}
            </p>
          ) : (
            <label
              className="reading__name"
              htmlFor={`${baseId}-${row.fields[0].indicatorId}`}
            >
              {row.name}
            </label>
          )}

          <span className="reading__fields">
            {row.fields.map((field, index) => (
              <span key={field.indicatorId} className="reading__field">
                {index > 0 && (
                  <span className="reading__slash" aria-hidden="true">
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
                  className="reading__input"
                  id={`${baseId}-${field.indicatorId}`}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={values[field.indicatorId] ?? ''}
                  aria-invalid={invalid}
                  aria-describedby={`${unitId} ${describedBy}`.trim()}
                  onChange={(event) =>
                    onChange(field.indicatorId, event.target.value)
                  }
                />
                {/* The unit of a single reading sits inside its field; the two
                    blood pressures share one after both of them. */}
                {!pair && (
                  <span className="reading__unit" id={unitId}>
                    {row.unit}
                  </span>
                )}
              </span>
            ))}
            {pair && (
              <span className="reading__unit" id={unitId}>
                {row.unit}
              </span>
            )}
          </span>

          {last !== null && (
            <p className="reading__last" id={lastId}>
              {last}
            </p>
          )}
          {error !== undefined && <FieldError id={errorId}>{error}</FieldError>}
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
