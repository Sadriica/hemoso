import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { isIsoDate, todayIso } from '../data/missionStart'
import { StatusIcon } from '../icons'
import { strings } from '../strings'
import './mission-start.css'

// "2 Nov" for a YYYY-MM-DD date, in local calendar terms.
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * The signed-in line "Mission started 2 Nov · change". `start` is the saved
 * YYYY-MM-DD date (null: none yet); `onChange` receives the new valid date.
 * "change" opens a small form: the label "Day 1 was", one text field written
 * year-month-day, Save and Cancel. A date that is not real, or that has not
 * come yet, gets a sentence and is not saved. Escape or Cancel closes it and
 * focus goes back to the button that opened it.
 */
export default function MissionStart({
  start,
  onChange,
}: {
  start: string | null
  onChange: (date: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  useEffect(() => {
    if (editing) input.current?.focus()
    else if (wasEditing.current) toggle.current?.focus()
    wasEditing.current = editing
  }, [editing])

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = draft.trim()
    if (!isIsoDate(value)) {
      setProblem(strings.mission.dayOneInvalid)
      input.current?.focus()
      return
    }
    if (value > todayIso()) {
      setProblem(strings.mission.dayOneFuture)
      input.current?.focus()
      return
    }
    onChange(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        className="mission-start mission-start--editing"
        noValidate
        onSubmit={submit}
        onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
      >
        <label className="mission-start__label" htmlFor={id}>
          {strings.mission.dayOneLabel}
        </label>
        <div className="mission-start__row">
          <input
            ref={input}
            id={id}
            className="mission-start__input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={10}
            placeholder="YYYY-MM-DD"
            value={draft}
            aria-invalid={problem !== null}
            aria-describedby={problem ? `${hintId} ${errorId}` : hintId}
            onChange={(event) => {
              setDraft(event.target.value)
              setProblem(null)
            }}
          />
          <button type="submit" className="button button--secondary mission-start__save">
            {strings.mission.save}
          </button>
          <button type="button" className="mission-start__cancel" onClick={() => setEditing(false)}>
            {strings.mission.cancel}
          </button>
        </div>
        <p className="mission-start__hint" id={hintId}>
          {strings.mission.dayOneHint}
        </p>
        {problem && (
          <p className="mission-start__error" id={errorId} role="alert">
            <StatusIcon kind="warning" size={16} />
            <span>{problem}</span>
          </p>
        )}
      </form>
    )
  }
  return (
    <p className="mission-start">
      <span>{start ? strings.mission.started(shortDate(start)) : strings.mission.notSet}</span>
      <span aria-hidden="true">·</span>
      <button
        ref={toggle}
        type="button"
        className="mission-start__open"
        onClick={() => {
          setDraft(start ?? todayIso())
          setProblem(null)
          setEditing(true)
        }}
      >
        {start ? strings.mission.change : strings.mission.set}
      </button>
    </p>
  )
}
