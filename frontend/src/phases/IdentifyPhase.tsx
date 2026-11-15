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
import { isUsername, normaliseUsername } from '../domain/username'
import PhaseHeading from '../components/PhaseHeading'
import Notice from '../components/Notice'
import { isIsoDate, setMissionStart, todayIso } from '../data/missionStart'
import { StatusIcon } from '../icons'
import { useCarry } from '../motion/carry'
import { loadFaces } from '../face/descriptors'
import type { AttemptFailure, SessionState } from '../hooks/useSession'
import { personInitials, personName, strings } from '../strings'
import './identify.css'

// The face panel is a chunk of its own, loaded the first time it opens, and
// the models behind it only when the person starts the camera: a plain page
// load asks for neither (REQ-14, REQ-36).
const FaceSignIn = lazy(() => import('../screens/FaceSignIn'))
const OrbitalScene = lazy(() => import('../components/orbital'))

/** The fieldset of crew members: the face panel sends the focus back here. */
export const CREW_PICKER_ID = 'crew-picker'

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
  onDone: () => void
  /** The top bar switch is on: the scene stands still. */
  still?: boolean
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
  onDone: switchPhase,
  still = false,
}: IdentifyPhaseProps) {
  // Starting the report first closes the ring and carries the avatar (src/motion/carry.ts).
  const carry = useCarry(still)
  // The "signed in" strip must not appear above the panel while the ring
  // closes: its visibility is fixed at the moment the carry starts.
  const [stripFrozen, setStripFrozen] = useState<boolean | null>(null)
  const onDone = () => {
    setStripFrozen((session.expiredFor ?? session.personId) !== null)
    carry.run(switchPhase)
  }
  const copy = strings.phases.identify
  const signInCopy = strings.signIn
  const [faceOpen, setFaceOpen] = useState(false)
  const [missing, setMissing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [startDate, setStartDate] = useState(() => todayIso())
  const [problem, setProblem] = useState<Problem | null>(null)
  const [busy, setBusy] = useState(false)
  // A face matched, or a session ended: the PIN of this person is asked for,
  // with the name already filled in. The phase is rebuilt when that changes, so
  // the name is set once, as this card opens.
  const [askedFor, setAskedFor] = useState<string | null>(session.expiredFor)
  const [username, setUsername] = useState(session.expiredFor ?? '')
  // A face is on this device when the screen opens: that is what makes it the
  // first way in (REQ-36).
  const [hasFace] = useState(() => loadFaces().length > 0)
  // After a PIN sign-in on a device with a camera and no face saved for that
  // person, the screen offers to add one before the report.
  const [offer, setOffer] = useState(false)
  const [offerDone, setOfferDone] = useState(false)
  const offerButtonRef = useRef<HTMLButtonElement>(null)
  // Sign in and Create an account are two tabs of one block that is always on
  // screen when the server has accounts; nothing waits behind a closed row.
  const focusPin = useRef(false)
  const focusUsername = useRef(false)
  const tabsId = useId()

  const faceButtonRef = useRef<HTMLButtonElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  const usernameId = useId()
  const pinId = useId()
  const startDateId = useId()
  const confirmPinId = useId()
  const faceTitleId = useId()
  const accountTitleId = useId()
  const demoTitleId = useId()
  const offerTitleId = useId()

  // A token the server stopped accepting: the PIN of that person, right here.
  // The notice stays until the person is in again.
  const expired = session.expiredFor
  useEffect(() => {
    if (expired !== null) focusPin.current = true
  }, [expired])
  // The PIN field takes the focus once the form is on screen.
  useEffect(() => {
    if (focusPin.current) {
      focusPin.current = false
      pinRef.current?.focus()
    }
    if (focusUsername.current) {
      focusUsername.current = false
      usernameRef.current?.focus()
    }
  })

  // Picking a tab moves the focus to the first field of its form.
  const chooseMode = (create: boolean) => {
    if (create === creating) return
    setCreating(create)
    setProblem(null)
    setPin('')
    setConfirmPin('')
    if (create) setAskedFor(null)
    focusUsername.current = true
  }

  const focusPicker = () => {
    const chosen = document.querySelector<HTMLInputElement>(
      `#${CREW_PICKER_ID} input:checked, #${CREW_PICKER_ID} input`,
    )
    chosen?.focus({ preventScroll: true })
  }

  const askPin = (personId: string) => {
    setAskedFor(personId)
    setUsername(personId)
    setPin('')
    setProblem(null)
    setCreating(false)
    focusPin.current = true
  }

  // A face matched a saved one: the stored session of that person opens it, or
  // the PIN is asked for (T-70).
  const faceMatched = (personId: string) => {
    setFaceOpen(false)
    if (session.openByFace(personId) === 'opened') {
      onDone()
      return
    }
    askPin(personId)
  }

  const pickName = (personId: string) => {
    setMissing(false)
    if (session.openByName(personId) === 'opened') {
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

  // A person is in with a PIN: the report comes next, unless the device has a
  // camera and no face of theirs, when adding one is offered first.
  const afterPinSignIn = (person: string) => {
    if (canUseCamera() && !loadFaces().some((face) => face.personId === person)) {
      setOffer(true)
      return
    }
    onDone()
  }

  const openDemo = () => {
    session.openDemo()
    onDone()
  }

  // A name the form cannot turn into an id: the sentence sits under the field,
  // the field is marked invalid and brought into view with the focus on it.
  function showUsernameProblem(): void {
    setProblem('username')
    const field = usernameRef.current
    field?.focus()
    field?.scrollIntoView?.({ block: 'center' })
  }

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const person = normaliseUsername(username)
    if (!isUsername(person)) {
      showUsernameProblem()
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
    afterPinSignIn(person)
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const person = normaliseUsername(username)
    if (!isUsername(person)) {
      showUsernameProblem()
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
    setMissionStart(person, isIsoDate(startDate) ? startDate : todayIso())
    setPin('')
    setConfirmPin('')
    afterPinSignIn(person)
  }

  const problemText = problem === null ? null : signInCopy.errors[problem]
  // The id the form will send, shown under the field as soon as it differs
  // from what was typed and can work ("Juan Perez" -> juan_perez).
  const normalisedUsername = normaliseUsername(username)
  const usernamePreview =
    normalisedUsername !== username && isUsername(normalisedUsername)
      ? normalisedUsername
      : null

  const facePanel = (
    <section className="identify__face" aria-labelledby={faceTitleId}>
      <h2 id={faceTitleId} className="identify__row-title">
        {signInCopy.faceHeading}
      </h2>
      <p className="identify__row-text">
        {hasFace ? signInCopy.faceNote : signInCopy.faceNone}
      </p>
      <button
        ref={faceButtonRef}
        type="button"
        className="identify__quiet"
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
      <div className="identify__head">
        <PhaseHeading
          ref={headingRef}
          eyebrow={copy.eyebrow}
          lines={copy.headline}
          intro={copy.intro}
        />
      </div>

      {/* The stage: a slot for the orbital object, with a CSS and SVG fallback
          so the layout stands alone. Decoration only. */}
      <div className="identify__scene" data-enter="scene" aria-hidden="true">
        <Suspense fallback={<SceneFallback />}>
          <OrbitalScene variant="identify" still={still} progress={carry.progress} />
        </Suspense>
      </div>

      <div className="identify__main">
        {(stripFrozen ?? (session.expiredFor !== null || session.personId !== null)) && (
          <div className="identify__status" data-enter="rest">
            {session.expiredFor !== null && (
              <Notice tone="warning">{signInCopy.expired}</Notice>
            )}
            {session.personId !== null && (
              <p className="signin__session capsule">
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
          </div>
        )}

        <div className="identify__panel panel panel--cut" data-enter="panel">
          {offer && session.personId !== null && (
              <section className="identify__offer" aria-labelledby={offerTitleId}>
                <h2 id={offerTitleId} className="capsule signin__title">
                  {signInCopy.faceOfferHeading}
                </h2>
                <p className="signin__text">{signInCopy.faceOfferNote}</p>
                {faceOpen && (
                  <Suspense fallback={<p role="status">{strings.face.opening}</p>}>
                    <FaceSignIn
                      personId={session.personId}
                      onPersonSelected={faceMatched}
                      onFocusPicker={() => offerButtonRef.current?.focus()}
                      onClose={() => {
                        setFaceOpen(false)
                        setOfferDone(
                          loadFaces().some((face) => face.personId === session.personId),
                        )
                      }}
                    />
                  </Suspense>
                )}
                {!faceOpen && (
                  <div className="signin__actions">
                    {offerDone ? (
                      <button type="button" className="journey-button journey-button--solid" onClick={onDone}>
                        <span>{copy.next}</span>
                        <span className="journey-button__arrow" aria-hidden="true">
                          →
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          ref={offerButtonRef}
                          type="button"
                          className="journey-button journey-button--solid"
                          onClick={() => setFaceOpen(true)}
                        >
                          <span>{signInCopy.faceOfferAction}</span>
                          <span className="journey-button__arrow" aria-hidden="true">
                            ◎
                          </span>
                        </button>
                        <button type="button" className="signin__link" onClick={onDone}>
                          {signInCopy.faceOfferSkip}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>
          )}
          {!offer && (
            <>
              <section className="identify__demo" aria-labelledby={demoTitleId}>
      <h2 id={demoTitleId} className="capsule signin__title">
                  {signInCopy.demoHeading}
                </h2>
                <p className="signin__text">{signInCopy.demoNote}</p>
                <button
                  type="button"
                  className="journey-button journey-button--solid identify__primary"
                  onClick={openDemo}
                >
                  <span>{signInCopy.demoAction}</span>
                  <span className="journey-button__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </section>

              <div className="identify__who">
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
                        <span className="crew-option__mark" aria-hidden="true">
                          <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M7 12.5l3.2 3.2L17 8.8" />
                          </svg>
                        </span>
                      </label>
                    ))}
                  </div>
                  {missing && (
                    <SigninError id="crew-missing">{copy.missing}</SigninError>
                  )}
                </fieldset>

                <button
                  type="button"
                  className="crew-begin signin__begin"
                  onClick={goOn}
                >
                  <span>{copy.next}</span>
                  <span className="journey-button__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>

              {facePanel}
            </>
          )}
        </div>

        {!offer && session.accountsOffered && (
          <div className="identify__more" data-enter="rest">
            <div
              className="identify__tabs"
              role="tablist"
              aria-label={signInCopy.accountHeading}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
                event.preventDefault()
                const next = event.key === 'ArrowRight'
                chooseMode(next)
                focusUsername.current = false
                document.getElementById(`${tabsId}-${next ? 'create' : 'signin'}`)?.focus()
              }}
            >
              <button
                type="button"
                role="tab"
                id={`${tabsId}-signin`}
                className="identify__tab"
                aria-selected={!creating}
                aria-controls={`${tabsId}-panel`}
                tabIndex={creating ? -1 : 0}
                disabled={busy}
                onClick={() => chooseMode(false)}
              >
                {signInCopy.signInTab}
              </button>
              <button
                type="button"
                role="tab"
                id={`${tabsId}-create`}
                className="identify__tab"
                aria-selected={creating}
                aria-controls={`${tabsId}-panel`}
                tabIndex={creating ? 0 : -1}
                disabled={busy}
                onClick={() => chooseMode(true)}
              >
                {signInCopy.createToggle}
              </button>
            </div>
            <div
              id={`${tabsId}-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-${creating ? 'create' : 'signin'}`}
              className="identify__more-body"
            >
              <h2 id={accountTitleId} className="report-form__heading">
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
                        aria-invalid={problem === 'username' ? true : undefined}
                        aria-describedby={
                          problem === 'username'
                            ? `${usernameId}-error`
                            : usernamePreview !== null
                              ? `${usernameId}-preview`
                              : undefined
                        }
                        onChange={(event) => {
                          setUsername(event.target.value)
                          if (problem === 'username') setProblem(null)
                        }}
                      />
                      {problem === 'username' ? (
                        <SigninError id={`${usernameId}-error`}>
                          {signInCopy.errors.username}
                        </SigninError>
                      ) : (
                        usernamePreview !== null && (
                          <p className="signin__hint" id={`${usernameId}-preview`}>
                            {signInCopy.willSignInAs(usernamePreview)}
                          </p>
                        )
                      )}
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
                    {creating && (
                      <div className="signin__field">
                        <label className="signin__label" htmlFor={startDateId}>
                          {strings.mission.startLabel}
                        </label>
                        <input
                          id={startDateId}
                          className="signin__input"
                          type="date"
                          max={todayIso()}
                          value={startDate}
                          disabled={busy}
                          onChange={(event) => setStartDate(event.target.value)}
                        />
                      </div>
                    )}
                    <div className="signin__actions">
                      <button
                        type="submit"
                        className="journey-button"
                        disabled={busy}
                      >
                        <span>
                          {creating ? signInCopy.createAction : signInCopy.action}
                        </span>
                        <span className="journey-button__arrow" aria-hidden="true">
                          →
                        </span>
                      </button>
                    </div>
                  </form>
              {problemText !== null && problem !== 'username' && (
                <SigninError>{problemText}</SigninError>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// An error of the sign-in: the attention icon, then the words (never colour
// alone), read out as soon as it appears.
function SigninError({ id, children }: { id?: string; children: string }) {
  return (
    <p id={id} className="signin__error" role="alert">
      <StatusIcon kind="warning" size={16} />
      <span>{children}</span>
    </p>
  )
}

// The stage fallback: arcs, a sphere and a glow in plain SVG, so the layout
// stands alone until the orbital object is mounted in its place.
function SceneFallback() {
  return (
    <svg
      className="identify__fallback"
      viewBox="0 0 400 400"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="identify-sphere" cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--color-interactive)" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle className="identify__arc" cx="200" cy="200" r="190" />
      <circle className="identify__arc identify__arc--dash" cx="200" cy="200" r="150" />
      <circle className="identify__arc" cx="200" cy="200" r="110" />
      <ellipse className="identify__arc identify__arc--tilt" cx="200" cy="200" rx="170" ry="60" />
      <circle cx="200" cy="200" r="46" fill="url(#identify-sphere)" />
      <circle className="identify__moon" cx="338" cy="148" r="8" />
      <circle className="identify__moon" cx="86" cy="262" r="5" />
    </svg>
  )
}

// A browser with a camera API: only then is adding a face offered.
function canUseCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

// The PIN field keeps digits only: a pasted space cannot make a PIN invalid.
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8)
}
