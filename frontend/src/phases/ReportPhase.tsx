import { lazy, Suspense, useState, type RefObject } from 'react'
import PhaseHeading from '../components/PhaseHeading'
import type { EntryStore } from '../data/entryStore'
import type { Indicator, Entry as EntryRecord } from '../domain/types'
import Entry from '../screens/Entry'
import ReactionCheck from '../reaction/ReactionCheck'
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
  /** This person's entries, live from the store. */
  entries: EntryRecord[]
  serverConfigured: boolean
  onBack: () => void
  onDone: () => void
}

// Phase 2: today's readings, one at a time with the entry form (REQ-02). The
// count of readings logged in this check tells the person the save worked;
// nothing has to be logged to go on, a reading that was not taken is skipped.
export default function ReportPhase({
  headingRef,
  store,
  personId,
  indicators,
  entries,
  serverConfigured,
  onBack,
  onDone,
}: ReportPhaseProps) {
  const copy = strings.phases.report
  // Entries present when the phase opened; the rest were logged in this check.
  const [startCount] = useState(entries.length)
  const logged = Math.max(entries.length - startCount, 0)
  // One primary at a time: Save while values wait, the way on once a save is
  // done and nothing new is typed.
  const [unsaved, setUnsaved] = useState(0)
  const ready = logged > 0 && unsaved === 0

  return (
    <section className="phase phase--report" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      <div className="scene-band scene-band--report" data-enter="scene" aria-hidden="true">
        <Suspense fallback={null}>
          <OrbitalScene variant="report" />
        </Suspense>
      </div>

      <div className="report">
        <div className="report__panel panel panel--cut" data-enter="panel">
          <Entry
            store={store}
            personId={personId}
            indicators={indicators}
            entries={entries}
            serverConfigured={serverConfigured}
            onFilledChange={setUnsaved}
          />
        </div>
        <p className="report__count" role="status">
          {copy.logged(logged)}
        </p>
      </div>

      {/* Optional and skippable: the way on to the status never waits for it. */}
      <ReactionCheck
        store={store}
        personId={personId}
        indicators={indicators}
        entries={entries}
        serverConfigured={serverConfigured}
      />

      <div className="phase__actions" data-enter="rest">
        <button type="button" className="text-link" onClick={onBack}>
          <span aria-hidden="true">←</span> {copy.back}
        </button>
        <button type="button" className={`journey-button${ready ? ' journey-button--solid' : ''}`} onClick={onDone}>
          <span>{copy.next}</span>
          <span className="journey-button__arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
