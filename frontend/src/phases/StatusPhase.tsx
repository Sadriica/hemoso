import {
  lazy,
  Suspense,
  useCallback,
  useState,
  type RefObject,
} from 'react'
import PhaseHeading from '../components/PhaseHeading'
import { bodyRegionName } from '../components/body3d/regions'
import { bodyWords, injuryWords } from '../components/body3d/words'
import type { LoadedContent } from '../content/load'
import { missionNow } from '../domain/clock'
import { readPainReports, removePainReport } from '../data/painStore'
import type { EntryStore } from '../data/entryStore'
import type { Entry } from '../domain/types'
import Notice from '../components/Notice'
import Disclosure from '../components/Disclosure'
import './status.css'
import './status-console.css'
import Home from '../screens/Home'
import PossibleConditions from '../components/conditions/PossibleConditions'
import { strings } from '../strings'
import '../screens/scene-grammar.css'

// The history (chart and the full table) is a chunk of its own: it loads when
// the person opens it, never on the first screen. The pain picker brings the
// 3D body, so it is a chunk too, and it loads on the tap that opens it.
// The quiet scene band beside the heading: decoration only, its own chunk.
const OrbitalScene = lazy(() => import('../components/orbital'))
const History = lazy(() => import('../screens/History'))
const PainPicker = lazy(() => import('../components/body3d/PainPicker'))

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
// The 3D body answers "where does it hurt": the picker writes a report on this
// device only, and the reports saved for this person are listed beside it.
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
  const clock = missionNow(entries)
  const [painOpen, setPainOpen] = useState(false)
  // The indicator the card shows; the History panel follows it.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // A signal of a possible condition opens the card of its indicator: the same
  // selection the overview makes, and the card is brought into view because
  // the panel sits below it.
  const showIndicator = useCallback(
    (indicatorId: string) => {
      setSelectedId(indicatorId)
      requestAnimationFrame(() => {
        document.querySelector('.home__detail')?.scrollIntoView?.({
          block: 'center',
          behavior: motionReduced ? 'auto' : 'smooth',
        })
      })
    },
    [motionReduced],
  )
  // The reports of the person on duty, newest first (data/painStore.ts). The
  // read is local and small, so the list is read from the store on every
  // render: no second copy of it to keep in step. A saved report bumps the
  // version, which is what makes the next render read it.
  const [, setReportsVersion] = useState(0)
  const reports = readPainReports(personId)
  const refreshReports = useCallback(
    () => setReportsVersion((count) => count + 1),
    [],
  )

  return (
    <section className="phase phase--status" aria-labelledby="phase-heading">
      <PhaseHeading ref={headingRef} eyebrow={copy.eyebrow} lines={copy.headline} intro={copy.intro} />

      <div className="scene-band scene-band--status" data-enter="scene" aria-hidden="true">
        <Suspense fallback={null}>
          <OrbitalScene variant="status" still={motionReduced} />
        </Suspense>
      </div>

      <div className="status">
        <Home
          personId={personId}
          data={data}
          entries={entries}
          motionReduced={motionReduced}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <PossibleConditions
          personId={personId}
          conditions={data.conditions}
          indicators={data.indicators}
          rules={data.rules}
          entries={entries}
          onSelectIndicator={showIndicator}
        />
        <div className="status__history">
          <Disclosure label={copy.historyToggle}>
            <Suspense fallback={<Notice tone="info">{strings.board.loading}</Notice>}>
              <History
                store={store}
                personId={personId}
                data={data}
                indicatorId={selectedId ?? undefined}
              />
            </Suspense>
          </Disclosure>
        </div>
      </div>

      <div className="pain">
        <button
          type="button"
          className="button button--secondary"
          aria-expanded={painOpen}
          aria-controls="pain-panel"
          onClick={() => setPainOpen((open) => !open)}
        >
          {painOpen ? injuryWords.close : injuryWords.open}
        </button>
        {painOpen && (
          <div id="pain-panel">
            <Suspense fallback={<Notice tone="info">{bodyWords.loading}</Notice>}>
              <PainPicker
                personId={personId}
                missionDay={clock.missionDay}
                time={clock.time}
                reducedMotion={motionReduced}
                onSaved={refreshReports}
              />
            </Suspense>
          </div>
        )}
        <section className="pain-reports" aria-labelledby="pain-reports-heading">
          <h2 id="pain-reports-heading" className="pain-reports__heading">
            {injuryWords.reportsHeading}
          </h2>
          {reports.length === 0 ? (
            <p className="pain-reports__empty">{injuryWords.noReports}</p>
          ) : (
            <ul className="pain-reports__list">
              {reports.map((report) => (
                <li key={report.id} className="pain-reports__report">
                  <p className="pain-reports__when">
                    {injuryWords.reportWhen(report.missionDay, report.time)}
                  </p>
                  <ul className="pain-reports__marks">
                    {report.regions.map((mark) => (
                      <li key={mark.regionId}>
                        {injuryWords.markLine(
                          bodyRegionName(mark.regionId),
                          injuryWords.kinds[mark.kind],
                          mark.intensity,
                        )}
                      </li>
                    ))}
                  </ul>
                  {report.note !== '' && (
                    <p className="pain-reports__note">{report.note}</p>
                  )}
                  <button
                    type="button"
                    className="text-link pain-reports__remove"
                    aria-label={injuryWords.removeReport(
                      injuryWords.reportWhen(report.missionDay, report.time),
                    )}
                    onClick={() => {
                      removePainReport(report.id)
                      refreshReports()
                    }}
                  >
                    {injuryWords.removeReportShort}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="phase__actions">
        <button type="button" className="text-link" onClick={onBack}>
          <span aria-hidden="true">←</span> {copy.back}
        </button>
        <button
          type="button"
          className="journey-button journey-button--solid"
          onClick={onRestart}
        >
          <span>{copy.restart}</span>
          <span className="journey-button__arrow" aria-hidden="true">↺</span>
        </button>
      </div>
    </section>
  )
}
