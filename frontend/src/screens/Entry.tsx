import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { missionNow, type MissionClock } from '../domain/clock'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import Notice from '../components/Notice'
import { parseDraft, type DraftErrors } from './entryDraft'
import { strings } from '../strings'

// The entry screen: one measurement for one person (REQ-02). Every field has a
// visible label, the unit appears in the label and next to the field, and each
// problem is written under its field and linked to it. Focus moves to the
// first field that needs a fix.

export default function Entry({
  store,
  personId,
  indicators,
  entries,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
}) {
  // Day and time belong to the moment the form opens for this person; the
  // screen is keyed by person in App, so they are read once.
  const [defaults] = useState(() => missionNow(entries))
  const headingId = useId()

  if (indicators.length === 0) {
    return (
      <section aria-labelledby={headingId} className="entry">
        <h2 id={headingId} className="entry__heading">
          {strings.entry.heading}
        </h2>
        <Notice tone="info">{strings.entry.noIndicators}</Notice>
      </section>
    )
  }

  return (
    <EntryForm
      store={store}
      personId={personId}
      indicators={indicators}
      defaults={defaults}
    />
  )
}

function EntryForm({
  store,
  personId,
  indicators,
  defaults,
}: {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  defaults: MissionClock
}) {
  const [indicatorId, setIndicatorId] = useState(indicators[0].id)
  const [valueText, setValueText] = useState('')
  const [missionDayText, setMissionDayText] = useState(
    String(defaults.missionDay),
  )
  const [timeText, setTimeText] = useState(defaults.time)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [status, setStatus] = useState('')

  const baseId = useId()
  const valueRef = useRef<HTMLInputElement>(null)
  const missionDayRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef<HTMLInputElement>(null)

  const indicator =
    indicators.find((item) => item.id === indicatorId) ?? indicators[0]
  const indicatorFieldId = `${baseId}-indicator`
  const valueId = `${baseId}-value`
  const dayId = `${baseId}-mission-day`
  const timeId = `${baseId}-time`

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const draft = parseDraft({
      value: valueText,
      missionDay: missionDayText,
      time: timeText,
    })
    if (!draft.ok) {
      setErrors(draft.errors)
      setStatus('')
      if (draft.errors.value !== undefined) valueRef.current?.focus()
      else if (draft.errors.missionDay !== undefined)
        missionDayRef.current?.focus()
      else timeRef.current?.focus()
      return
    }

    setErrors({})
    store.add({
      personId,
      indicatorId: indicator.id,
      value: draft.value,
      unit: indicator.unit,
      missionDay: draft.missionDay,
      time: draft.time,
    })
    setStatus(strings.entry.saved)
    // The day and the time usually repeat; only the reading changes.
    setValueText('')
  }

  return (
    <section aria-labelledby={`${baseId}-heading`} className="entry">
      <h2 id={`${baseId}-heading`} className="entry__heading">
        {strings.entry.heading}
      </h2>
      {/* noValidate: the messages under the fields replace the browser bubbles. */}
      <form className="form" noValidate onSubmit={onSubmit}>
        <div className="field">
          <label className="field__label" htmlFor={indicatorFieldId}>
            {strings.entry.indicator}
          </label>
          <select
            className="field__select"
            id={indicatorFieldId}
            value={indicator.id}
            onChange={(event) => setIndicatorId(event.target.value)}
          >
            {indicators.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={valueId}>
            {strings.entry.value(indicator.unit)}
          </label>
          <div className="field__control">
            <input
              ref={valueRef}
              className="field__input"
              id={valueId}
              type="number"
              step="any"
              value={valueText}
              aria-invalid={errors.value === undefined ? undefined : true}
              aria-describedby={
                errors.value === undefined ? undefined : `${valueId}-error`
              }
              onChange={(event) => setValueText(event.target.value)}
            />
            {/* The label already reads the unit, so this copy is decoration. */}
            <span className="field__unit" aria-hidden="true">
              {indicator.unit}
            </span>
          </div>
          {errors.value !== undefined && (
            <FieldError id={`${valueId}-error`}>{errors.value}</FieldError>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={dayId}>
            {strings.entry.missionDay}
          </label>
          <input
            ref={missionDayRef}
            className="field__input"
            id={dayId}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={missionDayText}
            aria-invalid={errors.missionDay === undefined ? undefined : true}
            aria-describedby={
              errors.missionDay === undefined ? undefined : `${dayId}-error`
            }
            onChange={(event) => setMissionDayText(event.target.value)}
          />
          {errors.missionDay !== undefined && (
            <FieldError id={`${dayId}-error`}>{errors.missionDay}</FieldError>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor={timeId}>
            {strings.entry.time}
          </label>
          <input
            ref={timeRef}
            className="field__input"
            id={timeId}
            type="time"
            value={timeText}
            aria-invalid={errors.time === undefined ? undefined : true}
            aria-describedby={
              errors.time === undefined ? undefined : `${timeId}-error`
            }
            onChange={(event) => setTimeText(event.target.value)}
          />
          {errors.time !== undefined && (
            <FieldError id={`${timeId}-error`}>{errors.time}</FieldError>
          )}
        </div>

        <div className="form__actions">
          <button className="button button--primary" type="submit">
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

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="field__error" id={id}>
      <svg
        className="field__error-icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 3.5L21 19.5H3L12 3.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 9.5v4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.2" fill="currentColor" />
      </svg>
      <span>{children}</span>
    </p>
  )
}
