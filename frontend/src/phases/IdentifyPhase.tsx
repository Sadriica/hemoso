import { lazy, Suspense, useRef, useState, type RefObject } from 'react'
import PhaseHeading from '../components/PhaseHeading'
import { strings } from '../strings'

// The face panel is a chunk of its own, loaded the first time it opens. A page
// without ?face=1 never asks for it (REQ-14).
const FaceSignIn = lazy(() => import('../screens/FaceSignIn'))

/** The fieldset of crew members: the face panel sends the focus back here. */
export const CREW_PICKER_ID = 'crew-picker'

interface IdentifyPhaseProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  personIds: string[]
  personId: string | null
  onPersonChange: (personId: string) => void
  /** Face sign-in exists only on a page opened with ?face=1 (REQ-14). */
  faceEnabled: boolean
  onDone: () => void
}

// Phase 1: who is on duty. The face is the quick way in; the list of crew
// members is always there, for a person with no camera, a blocked camera or a
// keyboard only. A recognised face goes straight on to the report.
export default function IdentifyPhase({
  headingRef,
  personIds,
  personId,
  onPersonChange,
  faceEnabled,
  onDone,
}: IdentifyPhaseProps) {
  const copy = strings.phases.identify
  const [faceOpen, setFaceOpen] = useState(false)
  const [missing, setMissing] = useState(false)
  const faceButtonRef = useRef<HTMLButtonElement>(null)

  const focusPicker = () => {
    const chosen = document.querySelector<HTMLInputElement>(
      `#${CREW_PICKER_ID} input:checked, #${CREW_PICKER_ID} input`,
    )
    chosen?.focus()
  }

  const goOn = () => {
    if (!personId) {
      setMissing(true)
      focusPicker()
      return
    }
    onDone()
  }

  return (
    <section className="phase phase--identify" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      <div className="identify">
        <fieldset
          id={CREW_PICKER_ID}
          className="crew-picker"
          aria-describedby={missing ? 'crew-missing' : undefined}
        >
          <legend className="field__label">{copy.crewLabel}</legend>
          <div className="crew-picker__options">
            {personIds.map((id) => (
              <label key={id} className="crew-option">
                <input
                  type="radio"
                  name="crew"
                  value={id}
                  checked={personId === id}
                  onChange={() => {
                    onPersonChange(id)
                    setMissing(false)
                  }}
                />
                <span className="crew-option__mark" aria-hidden="true" />
                <span className="crew-option__name">{id}</span>
              </label>
            ))}
          </div>
          {missing && (
            <p id="crew-missing" className="field__error" role="alert">
              {strings.phases.identify.missing}
            </p>
          )}
        </fieldset>

        <button type="button" className="journey-button journey-button--solid" onClick={goOn}>
          <span>{copy.next}</span>
          <span className="journey-button__arrow" aria-hidden="true">→</span>
        </button>

        {faceEnabled && (
          <div className="identify__face">
            <p className="identify__or" aria-hidden="true">
              <span className="hairline" /> {copy.or} <span className="hairline" />
            </p>
            <button
              ref={faceButtonRef}
              type="button"
              className="journey-button"
              aria-expanded={faceOpen}
              onClick={() => setFaceOpen((open) => !open)}
            >
              <span>{strings.face.buttonLabel}</span>
              <span className="journey-button__arrow" aria-hidden="true">◎</span>
            </button>
            {faceOpen && (
              <Suspense fallback={<p role="status">{strings.face.opening}</p>}>
                <FaceSignIn
                  personId={personId ?? ''}
                  personIds={personIds}
                  onPersonSelected={(id) => {
                    onPersonChange(id)
                    setFaceOpen(false)
                    onDone()
                  }}
                  onFocusPicker={focusPicker}
                  onClose={() => {
                    setFaceOpen(false)
                    // Back to the control that opened the panel, as a dialog does.
                    faceButtonRef.current?.focus()
                  }}
                />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
