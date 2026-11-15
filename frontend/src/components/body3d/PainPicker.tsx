// Where does it hurt: the pain mode of the 3D body with one row per chosen
// place (kind of mark, strength), an optional note, and a Save that writes the
// report to this device only (data/painStore.ts). No condition names, no
// "you have": the words say what was marked and that the CMO or flight surgeon
// reads it with the astronaut.

import './body3d.css'

import { lazy, Suspense, useId, useState } from 'react'
import {
  INJURY_KINDS,
  savePainReport,
  type InjuryKind,
  type PainRegionMark,
  type PainReport,
  type PainStorage,
} from '../../data/painStore'
import ErrorBoundary from '../ErrorBoundary'
import { bodyRegionName } from './regions'
import { bodyWords, injuryWords } from './words'

// The body is a chunk of its own: three.js never reaches the first load.
const Body3D = lazy(() => import('./Body3D'))

export interface PainPickerProps {
  personId: string
  missionDay: number
  time: string
  reducedMotion?: boolean
  /** The report as written, so the list beside the picker shows it at once. */
  onSaved?: (report: PainReport) => void
  /** Test seam: the browser storage when left out, none when null. */
  storage?: PainStorage | null
}

type Outcome = 'idle' | 'saved' | 'not-saved'

export default function PainPicker({
  personId,
  missionDay,
  time,
  reducedMotion = false,
  onSaved,
  storage,
}: PainPickerProps) {
  const fieldId = useId()
  const [marks, setMarks] = useState<PainRegionMark[]>([])
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('idle')
  const [missing, setMissing] = useState(false)

  function toggleRegion(regionId: string): void {
    setOutcome('idle')
    setMarks((current) =>
      current.some((mark) => mark.regionId === regionId)
        ? current.filter((mark) => mark.regionId !== regionId)
        : [...current, { regionId, kind: 'pain', intensity: 5 }],
    )
  }

  function changeKind(regionId: string, kind: InjuryKind): void {
    setMarks((current) =>
      current.map((mark) =>
        mark.regionId === regionId ? { ...mark, kind } : mark,
      ),
    )
  }

  function changeIntensity(regionId: string, intensity: number): void {
    setMarks((current) =>
      current.map((mark) =>
        mark.regionId === regionId ? { ...mark, intensity } : mark,
      ),
    )
  }

  function save(): void {
    if (marks.length === 0) {
      setMissing(true)
      return
    }
    const result = savePainReport(
      { personId, missionDay, time, regions: marks, note },
      storage,
    )
    setMissing(false)
    setOutcome(result.saved ? 'saved' : 'not-saved')
    onSaved?.(result.report)
    setMarks([])
    setNote('')
  }

  return (
    <section className="pain-picker" aria-labelledby={`${fieldId}-heading`}>
      <h3 id={`${fieldId}-heading`} className="pain-picker__heading">
        {injuryWords.heading}
      </h3>
      <p className="pain-picker__intro">{injuryWords.intro}</p>
      <div className="pain-picker__body">
        <ErrorBoundary
          fallback={<p className="pain-picker__error" role="alert">{bodyWords.failed}</p>}
        >
        <Suspense fallback={<div className="body3d-slot" aria-hidden="true" />}>
          <Body3D
            mode="pain"
            label={injuryWords.heading}
            selected={marks.map((mark) => mark.regionId)}
            marks={marks}
            reducedMotion={reducedMotion}
            onSelect={toggleRegion}
          />
        </Suspense>
        </ErrorBoundary>
        <div className="pain-picker__form">
          {marks.length === 0 ? (
            <p className="pain-picker__hint">{bodyWords.listHint}</p>
          ) : (
            <>
              <p className="pain-picker__scale">{injuryWords.intensityLegend}</p>
              <ul className="pain-picker__marks">
                {marks.map((mark) => {
                  const name = bodyRegionName(mark.regionId)
                  const kindId = `${fieldId}-kind-${mark.regionId}`
                  const intensityId = `${fieldId}-intensity-${mark.regionId}`
                  return (
                    <li key={mark.regionId} className="pain-picker__mark">
                      <h4 className="pain-picker__region">{name}</h4>
                      <div className="pain-picker__field">
                        <label htmlFor={kindId}>{injuryWords.kindLabel}</label>
                        <select
                          id={kindId}
                          aria-label={injuryWords.kindFor(name)}
                          value={mark.kind}
                          onChange={(event) =>
                            changeKind(mark.regionId, event.target.value as InjuryKind)
                          }
                        >
                          {INJURY_KINDS.map((kind) => (
                            <option key={kind} value={kind}>
                              {injuryWords.kinds[kind]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="pain-picker__field">
                        <label htmlFor={intensityId}>
                          {injuryWords.intensityFor(name)}
                        </label>
                        <input
                          id={intensityId}
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={mark.intensity}
                          onChange={(event) =>
                            changeIntensity(mark.regionId, Number(event.target.value))
                          }
                        />
                        <span className="pain-picker__value" aria-hidden="true">
                          {mark.intensity}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => toggleRegion(mark.regionId)}
                      >
                        {injuryWords.remove(name)}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <div className="pain-picker__field">
            <label htmlFor={`${fieldId}-note`}>{injuryWords.noteLabel}</label>
            <textarea
              id={`${fieldId}-note`}
              className="pain-picker__note"
              rows={2}
              maxLength={280}
              value={note}
              aria-describedby={`${fieldId}-note-hint`}
              onChange={(event) => setNote(event.target.value)}
            />
            <p id={`${fieldId}-note-hint`} className="pain-picker__hint">
              {injuryWords.noteHint}
            </p>
          </div>
          {missing && (
            <p className="pain-picker__error" role="alert">
              {injuryWords.empty}
            </p>
          )}
          <button type="button" className="button button--primary" onClick={save}>
            {injuryWords.save}
          </button>
          <p className="pain-picker__outcome" role="status">
            {outcome === 'saved'
              ? injuryWords.savedOnDevice
              : outcome === 'not-saved'
                ? injuryWords.notSaved
                : ''}
          </p>
        </div>
      </div>
      <p className="pain-picker__surgeon">{injuryWords.surgeon}</p>
    </section>
  )
}
