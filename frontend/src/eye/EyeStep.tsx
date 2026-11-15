import { lazy, Suspense } from 'react'
import Disclosure from '../components/Disclosure'
import type { EntryStore } from '../data/entryStore'
import type { Entry as EntryRecord, Indicator } from '../domain/types'
import { eyeEnabled, hasEyeIndicators, withTestIndicators } from './enabled'
import { BLINK_RATE_ID, EYE_CLOSURE_ID } from './ids'
import { eyeStrings } from './strings'

// The face code and the screen are a chunk of their own: nothing of the eye
// check is in the first load, and nothing is fetched until the line is opened.
const EyeCheck = lazy(() => import('./EyeCheck'))

interface EyeStepProps {
  store: EntryStore
  personId: string
  indicators: Indicator[]
  entries: EntryRecord[]
  /** The entries logged in this check, for the closed line. */
  fresh: EntryRecord[]
  serverConfigured: boolean
}

// The optional eye check line of the report. It renders nothing while
// EYE_CHECK_ENABLED is false, and nothing while a row of the two indicators is
// missing from config/data/indicators.csv.
export default function EyeStep({
  store,
  personId,
  indicators,
  entries,
  fresh,
  serverConfigured,
}: EyeStepProps) {
  const search = window.location.search
  if (!eyeEnabled(search)) return null
  const rows = withTestIndicators(indicators, search)
  if (!hasEyeIndicators(rows)) return null

  const closure = fresh.find((entry) => entry.indicatorId === EYE_CLOSURE_ID)
  const blinks = fresh.find((entry) => entry.indicatorId === BLINK_RATE_ID)
  const label =
    closure === undefined || blinks === undefined
      ? eyeStrings.optional
      : eyeStrings.done(eyeStrings.result(closure.value, blinks.value))

  return (
    <div className="report__reaction" data-enter="rest">
      <Disclosure label={label}>
        <Suspense fallback={null}>
          <EyeCheck
            store={store}
            personId={personId}
            indicators={rows}
            entries={entries}
            serverConfigured={serverConfigured}
          />
        </Suspense>
      </Disclosure>
    </div>
  )
}
