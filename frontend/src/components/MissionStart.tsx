import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { isIsoDate, todayIso } from '../data/missionStart'
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
 * Opens a small inline date field; Escape or Cancel closes it.
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
  const input = useRef<HTMLInputElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const id = useId()

  useEffect(() => {
    if (editing) input.current?.focus()
    else if (wasEditing.current) toggle.current?.focus()
    wasEditing.current = editing
  }, [editing])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isIsoDate(draft)) return
    onChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <form
        className="mission-start"
        onSubmit={submit}
        onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
      >
        <label className="mission-start__label" htmlFor={id}>
          {strings.mission.startLabel}
        </label>
        <input
          ref={input}
          id={id}
          className="mission-start__input"
          type="date"
          value={draft}
          max={todayIso()}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className="mission-start__button" disabled={!isIsoDate(draft)}>
          {strings.mission.save}
        </button>
        <button type="button" className="mission-start__button" onClick={() => setEditing(false)}>
          {strings.mission.cancel}
        </button>
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
        className="mission-start__button"
        onClick={() => {
          setDraft(start ?? todayIso())
          setEditing(true)
        }}
      >
        {start ? strings.mission.change : strings.mission.set}
      </button>
    </p>
  )
}
