import { useId, useState } from 'react'
import { missionClockFor } from '../../domain/clock'
import type {
  SymptomDef,
  SymptomReport,
  SymptomSeverity,
} from '../../domain/symptoms'
import type { Entry } from '../../domain/types'
import { getMissionStart } from '../../data/missionStart'
import { saveSymptomReports } from '../../data/symptomStore'
import { strings } from '../../strings'
import Disclosure from '../Disclosure'
import Notice from '../Notice'
import './symptoms.css'

// The optional symptom list of the Report (T-80): real checkboxes in a
// fieldset with a legend, plain names from config/data/symptoms.csv. A ticked
// symptom is saved on this device first and goes to the server through the
// outbox when the person has an account. A ticked red flag shows "Call your CMO
// now" at once, before the save and before any score.

export interface SymptomChecklistProps {
  personId: string
  defs: SymptomDef[]
  /** This person's readings, only to find the mission day they are on. */
  entries: Entry[]
}

export default function SymptomChecklist({
  personId,
  defs,
  entries,
}: SymptomChecklistProps) {
  const copy = strings.symptoms
  const statusId = useId()
  // The severity of each ticked symptom; a symptom that is not here is not ticked.
  const [ticked, setTicked] = useState<Record<string, SymptomSeverity>>({})
  const [message, setMessage] = useState<string | null>(null)
  // A red flag that was saved in this check keeps its line after the boxes clear.
  const [savedFlags, setSavedFlags] = useState<string[]>([])

  if (defs.length === 0) return null

  const flagged = defs
    .filter((def) => def.redFlag && (def.id in ticked || savedFlags.includes(def.id)))
    .map((def) => def.name)

  const toggle = (id: string, on: boolean) => {
    setMessage(null)
    setTicked((current) => {
      const next = { ...current }
      if (on) next[id] = 1
      else delete next[id]
      return next
    })
  }

  const save = () => {
    const ids = defs.filter((def) => def.id in ticked)
    if (ids.length === 0) {
      setMessage(copy.nothingTicked)
      return
    }
    const clock = missionClockFor(entries, personId, getMissionStart(personId))
    const reports: SymptomReport[] = ids.map((def) => ({
      personId,
      symptomId: def.id,
      severity: ticked[def.id],
      missionDay: clock.missionDay,
      time: clock.time,
    }))
    const added = saveSymptomReports(reports)
    if (added === 0 && reports.length > 0) {
      // Either storage is blocked or the same report is already stored.
      setMessage(copy.notSaved)
      return
    }
    setSavedFlags((current) => [
      ...current,
      ...ids.filter((def) => def.redFlag).map((def) => def.id),
    ])
    setTicked({})
    setMessage(copy.saved(added))
  }

  return (
    <div className="symptoms" data-enter="rest">
      <Disclosure label={copy.toggle}>
        <fieldset className="symptoms__set">
          <legend className="symptoms__legend">{copy.legend}</legend>
          <p className="symptoms__hint">{copy.hint}</p>
          <ul className="symptoms__list">
            {defs.map((def) => {
              const on = def.id in ticked
              return (
                <li key={def.id} className="symptoms__item">
                  <label className="symptoms__option">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(event) => toggle(def.id, event.target.checked)}
                    />
                    <span>{def.name}</span>
                  </label>
                  {on && (
                    <select
                      className="symptoms__strength"
                      aria-label={copy.strength(def.name)}
                      value={ticked[def.id]}
                      onChange={(event) =>
                        setTicked((current) => ({
                          ...current,
                          [def.id]: Number(event.target.value) as SymptomSeverity,
                        }))
                      }
                    >
                      {([1, 2, 3] as const).map((level) => (
                        <option key={level} value={level}>
                          {copy.severity[level]}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="symptoms__actions">
            <button
              type="button"
              className="button button--secondary"
              aria-describedby={statusId}
              onClick={save}
            >
              {copy.save}
            </button>
            <p id={statusId} className="symptoms__status" role="status">
              {message}
            </p>
          </div>
        </fieldset>
      </Disclosure>
      {/* Outside the disclosure so it stays when the list is closed. */}
      {flagged.length > 0 && (
        <div role="alert">
          <Notice tone="review">
            <strong>{copy.callCmo}</strong> {copy.callCmoWhy(flagged.join(', '))}{' '}
            {copy.confirms}
          </Notice>
        </div>
      )}
    </div>
  )
}
