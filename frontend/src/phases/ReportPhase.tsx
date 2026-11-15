import { lazy, Suspense, useCallback, useState, type RefObject } from 'react'
import FaceOffer from '../components/FaceOffer'
import { isDemoPerson } from '../hooks/useSession'
import { SERVER_ID_PREFIX } from '../data/historyClient'
import PhaseHeading from '../components/PhaseHeading'
import type { EntryStore } from '../data/entryStore'
import type {
  AttentionRule,
  Indicator,
  Entry as EntryRecord,
} from '../domain/types'
import Disclosure from '../components/Disclosure'
import Entry from '../screens/Entry'
import ReactionCheck from '../reaction/ReactionCheck'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from '../reaction/ids'
import { reactionStrings } from '../reaction/strings'
import { strings } from '../strings'
import '../screens/scene-grammar.css'

// The quiet scene band of the report: a chunk of its own, never on the first
// screen's critical path, decoration only.
const OrbitalScene = lazy(() => import('../components/orbital'))

interface ReportPhaseProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  store: EntryStore
  personId: string
  indicators: Indicator[]
  // The attention rows, for the state of the last reading on each panel.
  rules?: AttentionRule[]
  /** This person's entries, live from the store. */
  entries: EntryRecord[]
  serverConfigured: boolean
  onBack: () => void
  onDone: () => void
  /** The top bar switch is on: the scene stands still. */
  still?: boolean
}

// Phase 2: today's readings, one at a time with the entry form (REQ-02). The
// count of readings logged in this check tells the person the save worked;
// nothing has to be logged to go on, a reading that was not taken is skipped.
export default function ReportPhase({
  headingRef,
  store,
  personId,
  indicators,
  rules,
  entries,
  serverConfigured,
  onBack,
  onDone,
  still = false,
}: ReportPhaseProps) {
  const copy = strings.phases.report
  // Entries present when the phase opened; the rest were logged in this check.
  // A reading the server sends back while the phase is open (the history of
  // the person, read once after sign-in) was not logged here, so it is left
  // out: it carries a server id.
  const [openIds] = useState(() => new Set(entries.map((entry) => entry.id)))
  const logged = entries.filter(
    (entry) => !openIds.has(entry.id) && !entry.id.startsWith(SERVER_ID_PREFIX),
  ).length
  // How many rows are done in this check, for the ring of the scene.
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const onProgress = useCallback(
    (done: number, total: number) => setProgress({ done, total }),
    [],
  )
  // The optional reaction check stays one closed line. When it has run in this
  // check, the line says the result; the demo run saves nothing, so it never
  // does.
  const fresh = entries.filter(
    (entry) => !openIds.has(entry.id) && !entry.id.startsWith(SERVER_ID_PREFIX),
  )
  const median = fresh.find((entry) => entry.indicatorId === REACTION_MEDIAN_ID)
  const lapses = fresh.find((entry) => entry.indicatorId === REACTION_LAPSES_ID)
  // Without both rows in the indicator file the check has nowhere to save, and
  // shows nothing; the line is left out with it.
  const hasReaction = [REACTION_MEDIAN_ID, REACTION_LAPSES_ID].every((id) =>
    indicators.some((item) => item.id === id),
  )
  const reactionLabel =
    lapses === undefined
      ? copy.reactionOptional
      : copy.reactionDone(reactionStrings.result(median?.value ?? null, lapses.value))

  return (
    <section className="phase phase--report" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      {/* Signed in with a PIN: adding the face for next time is one quiet line
          here, not a step before the check. The demo astronaut has no account. */}
      {serverConfigured && !isDemoPerson(personId) && (
        <FaceOffer personId={personId} />
      )}

      <div className="scene-band scene-band--report" data-enter="scene" aria-hidden="true">
        <Suspense fallback={null}>
          <OrbitalScene
            variant="report"
            still={still}
            progress={progress.total === 0 ? undefined : progress.done / progress.total}
          />
        </Suspense>
      </div>

      <div className="report">
        <div className="report__panel panel panel--cut" data-enter="panel">
          <Entry
            store={store}
            personId={personId}
            indicators={indicators}
            entries={entries}
            rules={rules}
            serverConfigured={serverConfigured}
            onProgress={onProgress}
            onNext={onDone}
          />
        </div>
        <p className="report__count" role="status">
          {copy.logged(logged)}
        </p>
      </div>

      {/* Optional and skippable: the way on to the status never waits for it. */}
      {hasReaction && (
      <div className="report__reaction" data-enter="rest">
        <Disclosure label={reactionLabel}>
          <ReactionCheck
            store={store}
            personId={personId}
            indicators={indicators}
            entries={entries}
            serverConfigured={serverConfigured}
          />
        </Disclosure>
      </div>
      )}

      <div className="phase__actions" data-enter="rest">
        <button type="button" className="text-link" onClick={onBack}>
          <span aria-hidden="true">←</span> {copy.back}
        </button>
        {/* The solid primary is Save, then the button inside the form panel; this
            one stays as the plain way on for the keyboard path. */}
        <button type="button" className="journey-button" onClick={onDone}>
          <span>{copy.next}</span>
          <span className="journey-button__arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
