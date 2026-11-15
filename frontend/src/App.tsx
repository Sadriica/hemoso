import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { loadContent } from './content/load'
import { createAccountClient } from './data/accountClient'
import { LocalEntryStore } from './data/entryStore'
import { createHistoryClient } from './data/historyClient'
import { createSyncClient } from './data/sync'
import { missionClockFor } from './domain/clock'
import { setMissionStart, useMissionStart } from './data/missionStart'
import { useEntries } from './hooks/useEntries'
import { useHistorySync } from './hooks/useHistorySync'
import { isDemoPerson, useSession } from './hooks/useSession'
import ErrorBoundary from './components/ErrorBoundary'
import Notice from './components/Notice'
import PhaseRail from './components/PhaseRail'
import type { PhaseId } from './phases/phaseIds'
import SkipLink from './components/SkipLink'
import StageDepth from './components/StageDepth'
import Starfield from './components/Starfield'
import Topbar from './components/Topbar'
import IdentifyPhase from './phases/IdentifyPhase'
import ReportPhase from './phases/ReportPhase'
import StatusPhase from './phases/StatusPhase'
import PhaseTransition from './motion/PhaseTransition'
import { useReducedMotion } from './motion/motion'
import { strings } from './strings'

// The intro is a chunk of its own; it shows on every full page load.
const Intro = lazy(() => import('./motion/Intro'))

// The app is one guided check in three phases, always in this order: identify,
// report, status. There is no free menu: each phase has its own way forward
// and back, and the rail at the bottom only shows where the check is.
export default function App() {
  const [data] = useState(() => loadContent())
  // One store for the tab: it seeds itself from the demo rows on the first run
  // and then holds every entry the person saves (REQ-02, REQ-28).
  const [store] = useState(
    () => new LocalEntryStore({ seedEntries: data.demoEntries }),
  )
  const entries = useEntries(store)
  // Built once from VITE_API_BASE_URL. Empty is the public demo: nothing is
  // sent and the top bar says so.
  const [client] = useState(() => createSyncClient())
  // The same base URL for reading back what the server kept: a second device
  // then shows the readings the first one made (REQ-27).
  const [historyClient] = useState(() => createHistoryClient())
  // Accounts live on the server (REQ-37). With no base URL there are none, and
  // the demo astronaut is the only way in.
  const [accounts] = useState(() => createAccountClient())
  const session = useSession(accounts)
  const personId = session.personId
  // Motion is off when the top bar switch says so or when the system asks for
  // less motion; the system setting is followed live (src/motion/motion.ts).
  const [still, setStill] = useState(false)
  const reduction = useReducedMotion()
  const motionReduced = still || reduction

  // The intro opens on the first load of a tab, unless motion is off. Until
  // its chunk arrives, a solid page-colour layer of the same size covers the
  // screen, so the first phase never flashes under it.
  const [introOpen, setIntroOpen] = useState(() => !motionReduced)
  const [requestedPhase, setPhase] = useState<PhaseId>('identify')
  const indicatorIds = useMemo(
    () => data.indicators.map((indicator) => indicator.id),
    [data],
  )
  // The person chosen here, or already chosen when the page loads: the history
  // of every indicator comes from the server once, and the screens then show
  // the same readings on any device (REQ-27).
  useHistorySync(historyClient, store, personId, indicatorIds)

  const accountsOffered = session.accountsOffered
  const personIds = useMemo(() => {
    const ids = new Set(data.demoEntries.map((entry) => entry.personId))
    for (const entry of entries) ids.add(entry.personId)
    // The list is the crew of the demo data. A person with an account signs in
    // with a PIN, and is never picked from a list (REQ-37).
    return [...ids].filter((id) => !accountsOffered || isDemoPerson(id))
  }, [data, entries, accountsOffered])
  const personEntries = useMemo(
    () => entries.filter((entry) => entry.personId === personId),
    [entries, personId],
  )

  // Storage problems the astronaut has to know about, on every phase.
  const storageWarnings = [
    ...(store.isPersistent() ? [] : [strings.sync.notSaved]),
    ...(store.wasReset() ? [strings.sync.reset] : []),
  ]

  // A token the server stopped accepting brings the check back to the PIN form
  // of that person (T-70), whatever phase asked for it. Their entries wait in
  // the outbox meanwhile, and signing in again returns to the same phase.
  const expiredFor = session.expiredFor
  const phase: PhaseId = expiredFor === null ? requestedPhase : 'identify'

  // A new phase starts at the top, with focus on its heading, so a screen
  // reader announces where the person is. The page load keeps the focus where
  // the browser puts it: only a real change of phase moves it.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shownPhase = useRef(phase)
  useEffect(() => {
    if (shownPhase.current === phase) return
    shownPhase.current = phase
    window.scrollTo?.({ top: 0 })
    headingRef.current?.focus()
  }, [phase])
  // ?team=1 is the team's view: it adds the content problems the astronaut
  // never needs to read (and never sees in the demo video).
  const [teamView] = useState(
    () => new URLSearchParams(window.location.search).get('team') === '1',
  )

  // Day and clock belong to the signed-in person: nothing before sign-in.
  const missionStart = useMissionStart(personId)
  const clock =
    phase !== 'identify' && personId ? missionClockFor(entries, personId, missionStart) : null

  return (
    <div className={`app${motionReduced ? ' app--still' : ''}`}>
      <Starfield still={motionReduced} />
      <StageDepth still={motionReduced} />
      <SkipLink />
      {introOpen && (
        <Suspense fallback={<div className="intro-cover" aria-hidden="true" />}>
          <Intro
            still={motionReduced}
            onDone={() => setIntroOpen(false)}
            clockText={clock ? strings.header.metadata(clock.missionDay, clock.time) : undefined}
            skipLabel={strings.intro.skip}
          />
        </Suspense>
      )}
      <Topbar
        clock={clock}
        personId={clock && personId}
        missionStart={missionStart}
        onChangeMissionStart={
          personId && !isDemoPerson(personId)
            ? (date) => setMissionStart(personId, date)
            : undefined
        }
        store={store}
        client={client}
        motionReduced={motionReduced}
        onToggleMotion={() => setStill((value) => !value)}
      />
      <main id="main-content" className="stage" tabIndex={-1}>
        {storageWarnings.length > 0 && (
          <Notice tone="warning">{storageWarnings.join(' ')}</Notice>
        )}
        {/* The transition stays mounted across phases, so it knows which way
            the check moved; the boundary inside it is the one per phase. */}
        <PhaseTransition phase={phase} still={motionReduced}>
        {/* One boundary per phase: a part that fails to draw shows a sentence
            and a way back, never an empty page. A new phase starts clean. */}
        <ErrorBoundary
          key={phase}
          fallback={
            <Notice
              tone="warning"
              action={
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => window.location.reload()}
                >
                  {strings.screenFailed.reload}
                </button>
              }
            >
              {strings.screenFailed.message}
            </Notice>
          }
        >
        {phase === 'identify' && (
          <IdentifyPhase
            key={expiredFor ?? 'identify'}
            headingRef={headingRef}
            personIds={personIds}
            session={session}
            still={motionReduced}
            onDone={() => setPhase('report')}
          />
        )}
        {phase === 'report' && personId && (
          // A new person means a new form, with that person's day and time.
          <ReportPhase
            key={personId}
            headingRef={headingRef}
            store={store}
            personId={personId}
            indicators={data.indicators}
            rules={data.rules}
            entries={personEntries}
            serverConfigured={client.isConfigured()}
            onBack={() => setPhase('identify')}
            onDone={() => setPhase('status')}
            still={motionReduced}
          />
        )}
        {phase === 'status' && personId && (
          <StatusPhase
            headingRef={headingRef}
            store={store}
            personId={personId}
            data={teamView ? data : { ...data, problems: [] }}
            entries={entries}
            motionReduced={motionReduced}
            onBack={() => setPhase('report')}
            onRestart={() => {
              session.reset()
              setPhase('identify')
            }}
          />
        )}
        </ErrorBoundary>
        </PhaseTransition>
      </main>
      <PhaseRail current={phase} />
    </div>
  )
}
