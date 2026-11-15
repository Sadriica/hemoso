import { lazy, Suspense, type RefObject } from 'react'
import PhaseHeading from '../components/PhaseHeading'
import type { LoadedContent } from '../content/load'
import type { EntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'
import Notice from '../components/Notice'
import Disclosure from '../components/Disclosure'
import Home from '../screens/Home'
import { strings } from '../strings'

// The history (chart and the full table) is a chunk of its own: it loads when
// the person opens it, never on the first screen.
const History = lazy(() => import('../screens/History'))

interface StatusPhaseProps {
  headingRef: RefObject<HTMLHeadingElement | null>
  store: EntryStore
  personId: string
  data: LoadedContent
  entries: Entry[]
  onBack: () => void
  onRestart: () => void
  motionReduced?: boolean
}

// Phase 3: the result. First the status of every indicator with its next step
// (REQ-01). The history against the person's own earlier values (REQ-12) is
// behind a closed Disclosure.
// A new check starts again from phase 1.
export default function StatusPhase({
  headingRef,
  store,
  personId,
  data,
  entries,
  onBack,
  onRestart,
  motionReduced = false,
}: StatusPhaseProps) {
  const copy = strings.phases.status

  return (
    <section className="phase phase--status" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      <div className="status">
        <Home
          personId={personId}
          data={data}
          entries={entries}
          motionReduced={motionReduced}
        />
        <div className="status__history">
          <Disclosure label={copy.historyToggle}>
            <Suspense fallback={<Notice tone="info">{strings.board.loading}</Notice>}>
              <History store={store} personId={personId} data={data} />
            </Suspense>
          </Disclosure>
        </div>
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
