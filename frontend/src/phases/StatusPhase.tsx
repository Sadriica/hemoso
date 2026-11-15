import type { RefObject } from 'react'
import PhaseHeading from '../components/PhaseHeading'
import type { LoadedContent } from '../content/load'
import type { EntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'
import History from '../screens/History'
import Home from '../screens/Home'
import { strings } from '../strings'

interface StatusPhaseProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  store: EntryStore
  personId: string
  data: LoadedContent
  entries: Entry[]
  onBack: () => void
  onRestart: () => void
}

// Phase 3: the result. First the status of every indicator with its next step
// (REQ-01), then the history against the person's own earlier values (REQ-12).
// A new check starts again from phase 1.
export default function StatusPhase({
  headingRef,
  store,
  personId,
  data,
  entries,
  onBack,
  onRestart,
}: StatusPhaseProps) {
  const copy = strings.phases.status

  return (
    <section className="phase phase--status" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      <div className="status">
        <Home personId={personId} data={data} entries={entries} />
        <section className="status__history" aria-label={copy.historyHeading}>
          <History store={store} personId={personId} data={data} />
        </section>
      </div>

      <div className="phase__actions">
        <button type="button" className="text-link" onClick={onBack}>
          <span aria-hidden="true">←</span> {copy.back}
        </button>
        <button type="button" className="journey-button" onClick={onRestart}>
          <span>{copy.restart}</span>
          <span className="journey-button__arrow" aria-hidden="true">↺</span>
        </button>
      </div>
    </section>
  )
}
