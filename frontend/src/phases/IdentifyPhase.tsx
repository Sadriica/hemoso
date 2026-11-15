import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react'
import PhaseHeading from '../components/PhaseHeading'
import Notice from '../components/Notice'
import { loadFaces } from '../face/descriptors'
import type { AttemptFailure, SessionState } from '../hooks/useSession'
import { personInitials, personName, strings } from '../strings'
import './identify.css'

// The face panel is a chunk of its own, loaded the first time it opens. A page
// without ?face=1 never asks for it (REQ-14).
const FaceSignIn = lazy(() => import('../screens/FaceSignIn'))

/** The fieldset of crew members: the face panel sends the focus back here. */
export const CREW_PICKER_ID = 'crew-picker'

// A username is the person_id of the contract: lowercase snake_case.
const USERNAME = /^[a-z][a-z0-9_]{0,63}$/
// The PIN rule of the contract, checked here too so a mistyped PIN is a
// sentence and not a round trip.
const PIN = /^\d{4,8}$/

// Anything the sign-in form can say went wrong.
type Problem = AttemptFailure | 'username' | 'pin' | 'pinMismatch'

interface IdentifyPhaseProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  /** The crew ids of the demo data, the people who need no account. */
  personIds: string[]
  session: SessionState
  /** Face sign-in exists only on a page opened with ?face=1 (REQ-14). */
  faceEnabled: boolean
  onDone: () => void
}

// Phase 1: who is on duty. One centred column, one way in at a time, in the
// order a person reaches for them: the face kept on this device, the username
// and PIN, a new account, then the open demo of REQ-32 (REQ-37, REQ-36).
//
// The face is a quick way to pick a name, not a lock: the PIN form and the
// crew list of the demo always work without a camera.
export default function IdentifyPhase({
  headingRef,
  personIds,
  session,
  faceEnabled,
  onDone,
}: IdentifyPhaseProps) {
  const copy = strings.phases.identify
  const signInCopy = strings.signIn
  const [faceOpen, setFaceOpen] = useState(false)
  const [missing, setMissing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [problem, setProblem] = useState<Problem | null>(null)
  const [busy, setBusy] = useState(false)
  // A face matched, or a session ended: the PIN of this person is asked for,
  // with the name already filled in. The phase is rebuilt when that changes, so
  // the name is set once, as this card opens.
  const [askedFor, setAskedFor] = useState<string | null>(session.expiredFor)
  const [username, setUsername] = useState(session.expiredFor ?? '')
  // A face is on this device when the screen opens: that is what makes it the
  // first way in (REQ-36).
  const [hasFace] = useState(() => faceEnabled && loadFaces().length > 0)

  const faceButtonRef = useRef<HTMLButtonElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  const usernameId = useId()
  const pinId = useId()
  const confirmPinId = useId()
  const faceTitleId = useId()
  const accountTitleId = useId()
  const demoTitleId = useId()

  // A token the server stopped accepting: the PIN of that person, right here.
  // The notice stays until the person is in again.
  const expired = session.expiredFor
  useEffect(() => {
    if (expired !== null) pinRef.current?.focus()
  }, [expired])

  const focusPicker = () => {
    const chosen = document.querySelector<HTMLInputElement>(
      `#${CREW_PICKER_ID} input:checked, #${CREW_PICKER_ID} input`,
    )
    chosen?.focus()
  }

  const askPin = (personId: string) => {
    setAskedFor(personId)
    setUsername(personId)
    setPin('')
    setProblem(null)
    pinRef.current?.focus()
  }

  // A face matched a saved one: the stored session of that person opens it, or
  // the PIN is asked for (T-70).
  const faceMatched = (personId: string) => {
    setFaceOpen(false)
    if (session.openPerson(personId) === 'opened') {
      onDone()
      return
    }
    askPin(personId)
  }

  const pickName = (personId: string) => {
    setMissing(false)
    if (session.openPerson(personId) === 'opened') {
      setProblem(null)
      return
    }
    askPin(personId)
  }

  const goOn = () => {
    if (session.personId === null) {
      setMissing(true)
      focusPicker()
      return
    }
    if (session.kind === null) {
      askPin(session.personId)
      return
    }
    onDone()
  }

  const openDemo = () => {
    session.openDemo()
    onDone()
  }

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const person = username.trim()
    if (!USERNAME.test(person)) {
      setProblem('username')
      usernameRef.current?.focus()
      return
    }
    if (!PIN.test(pin)) {
      setProblem('pin')
      pinRef.current?.focus()
      return
    }
    setBusy(true)
    setProblem(null)
    const failure = await session.signIn(person, pin)
    setBusy(false)
    if (failure !== null) {
      setProblem(failure)
      setPin('')
      pinRef.current?.focus()
      return
    }
    setPin('')
    onDone()
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const person = username.trim()
    if (!USERNAME.test(person)) {
      setProblem('username')
      usernameRef.current?.focus()
      return
    }
    if (!PIN.test(pin)) {
      setProblem('pin')
      pinRef.current?.focus()
      return
    }
    if (pin !== confirmPin) {
      setProblem('pinMismatch')
      pinRef.current?.focus()
      return
    }
    setBusy(true)
    setProblem(null)
    const failure = await session.createAccount(person, pin)
    setBusy(false)
    if (failure !== null) {
      setProblem(failure)
      return
    }
    setPin('')
    setConfirmPin('')
    onDone()
  }

  const problemText = problem === null ? null : signInCopy.errors[problem]

  const facePanel = (
    <section className="signin__option" aria-labelledby={faceTitleId}>
      <h2 id={faceTitleId} className="signin__title">
        {signInCopy.faceHeading}
      </h2>
      <p className="signin__text">{signInCopy.faceNote}</p>
      <button
        ref={faceButtonRef}
        type="button"
        className={`journey-button${hasFace ? ' journey-button--solid' : ''}`}
        aria-expanded={faceOpen}
        onClick={() => setFaceOpen((open) => !open)}
      >
        <span>{strings.face.buttonLabel}</span>
        <span className="journey-button__arrow" aria-hidden="true">
          ◎
        </span>
      </button>
      {faceOpen && (
        <Suspense fallback={<p role="status">{strings.face.opening}</p>}>
          <FaceSignIn
            personId={session.personId ?? ''}
            onPersonSelected={faceMatched}
            onFocusPicker={focusPicker}
            onClose={() => {
              setFaceOpen(false)
              // Back to the control that opened the panel.
              faceButtonRef.current?.focus()
            }}
          />
        </Suspense>
      )}
    </section>
  )

  return (
    <section className="phase phase--identify" aria-labelledby="phase-heading">
      <PhaseHeading
        ref={headingRef}
        eyebrow={copy.eyebrow}
        lines={copy.headline}
        intro={copy.intro}
      />

      <div className="identify">
        {session.expiredFor !== null && (
          <Notice tone="warning">{signInCopy.expired}</Notice>
        )}

        {session.personId !== null && (
          <p className="signin__session">
            <span className="signin__who">
              {signInCopy.signedInAs(session.personId)}
            </span>
            <button
              type="button"
              className="signin__signout"
              onClick={session.signOut}
            >
              {signInCopy.signOut}
            </button>
          </p>
        )}

        {faceEnabled && hasFace && facePanel}

        {session.accountsOffered && (
          <section className="signin__option" aria-labelledby={accountTitleId}>
            <h2 id={accountTitleId} className="signin__title">
              {creating ? signInCopy.createHeading : signInCopy.pinHeading}
            </h2>
            {askedFor !== null && !creating && (
              <p className="signin__text">{signInCopy.askPin(askedFor)}</p>
            )}
            <form
              className="signin__form"
              onSubmit={creating ? submitCreate : submitPin}
              noValidate
            >
              <div className="signin__field">
                <label className="signin__label" htmlFor={usernameId}>
                  {signInCopy.username}
                </label>
                <input
                  ref={usernameRef}
                  id={usernameId}
                  className="signin__input"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  disabled={busy}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="signin__field">
                <label className="signin__label" htmlFor={pinId}>
                  {signInCopy.pin}
                </label>
                <input
                  ref={pinRef}
                  id={pinId}
                  className="signin__input signin__input--pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete={creating ? 'new-password' : 'current-password'}
                  pattern="[0-9]{4,8}"
                  maxLength={8}
                  aria-describedby={`${pinId}-hint`}
                  value={pin}
                  disabled={busy}
                  onChange={(event) => setPin(digitsOnly(event.target.value))}
                />
                <p className="signin__hint" id={`${pinId}-hint`}>
                  {signInCopy.pinHint}
                </p>
              </div>
              {creating && (
                <div className="signin__field">
                  <label className="signin__label" htmlFor={confirmPinId}>
                    {signInCopy.confirmPin}
                  </label>
                  <input
                    id={confirmPinId}
                    className="signin__input signin__input--pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    pattern="[0-9]{4,8}"
                    maxLength={8}
                    value={confirmPin}
                    disabled={busy}
                    onChange={(event) =>
                      setConfirmPin(digitsOnly(event.target.value))
                    }
                  />
                </div>
              )}
              <div className="signin__actions">
                <button
                  type="submit"
                  className="journey-button journey-button--solid"
                  disabled={busy}
                >
                  <span>
                    {creating ? signInCopy.createAction : signInCopy.action}
                  </span>
                  <span className="journey-button__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="signin__link"
                  aria-expanded={creating}
                  disabled={busy}
                  onClick={() => {
                    setCreating((open) => !open)
                    setProblem(null)
                  }}
                >
                  {creating ? signInCopy.createBack : signInCopy.createToggle}
                </button>
              </div>
            </form>
            {problemText !== null && (
              <p className="signin__error" role="alert">
                {problemText}
              </p>
            )}
          </section>
        )}

        <section className="signin__option" aria-labelledby={demoTitleId}>
          <h2 id={demoTitleId} className="signin__title">
            {signInCopy.demoHeading}
          </h2>
          <p className="signin__text">{signInCopy.demoNote}</p>
          <button
            type="button"
            className={`journey-button${hasFace ? '' : ' journey-button--solid'}`}
            onClick={openDemo}
          >
            <span>{signInCopy.demoAction}</span>
            <span className="journey-button__arrow" aria-hidden="true">
              →
            </span>
          </button>

          <fieldset
            id={CREW_PICKER_ID}
            className="crew-picker"
            aria-describedby={missing ? 'crew-missing' : undefined}
          >
            <legend className="signin__label">{copy.crewLabel}</legend>
            <div className="crew-picker__options">
              {personIds.map((id) => (
                <label key={id} className="crew-option">
                  <input
                    type="radio"
                    name="crew"
                    value={id}
                    // The name a screen reader hears is the person id, the same
                    // name the rest of the app uses.
                    aria-label={id}
                    checked={session.personId === id}
                    onChange={() => pickName(id)}
                  />
                  <span className="crew-option__avatar" aria-hidden="true">
                    {personInitials(id)}
                  </span>
                  <span className="crew-option__body" aria-hidden="true">
                    <span className="crew-option__name">{personName(id)}</span>
                    <span className="crew-option__role">
                      {signInCopy.crewRole}
                    </span>
                  </span>
                  <span className="crew-option__mark" aria-hidden="true" />
                </label>
              ))}
            </div>
            {missing && (
              <p id="crew-missing" className="signin__error" role="alert">
                {copy.missing}
              </p>
            )}
          </fieldset>

          <button
            type="button"
            className="journey-button journey-button--solid signin__begin"
            onClick={goOn}
          >
            <span>{copy.next}</span>
            <span className="journey-button__arrow" aria-hidden="true">
              →
            </span>
          </button>
        </section>

        {faceEnabled && !hasFace && facePanel}
      </div>
    </section>
  )
}

// The PIN field keeps digits only: a pasted space cannot make a PIN invalid.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}
