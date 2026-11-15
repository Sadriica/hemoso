import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { loadContent } from './content/load'
import { LocalEntryStore } from './data/entryStore'
import { createSyncClient } from './data/sync'
import { missionNow } from './domain/clock'
import { useEntries } from './hooks/useEntries'
import AppHeader, { PERSON_PICKER_ID } from './components/AppHeader'
import Notice from './components/Notice'
import ScreenTabs from './components/ScreenTabs'
import { TABS, type TabId } from './components/tabs'
import SkipLink from './components/SkipLink'
import Entry from './screens/Entry'
import History from './screens/History'
import Home from './screens/Home'
import { strings } from './strings'
import { LAYOUT } from './theme/tokens'

// The face panel is a chunk of its own, loaded the first time it opens. A page
// without ?face=1 never asks for it, so the public demo keeps the same bundle
// and the same data as before (REQ-14).
const FaceSignIn = lazy(() => import('./screens/FaceSignIn'))

export default function App() {
  const [data] = useState(() => loadContent())
  // One store for the tab: it seeds itself from the demo rows on the first run
  // and then holds every entry the person saves (REQ-02, REQ-28).
  const [store] = useState(
    () => new LocalEntryStore({ seedEntries: data.demoEntries }),
  )
  const entries = useEntries(store)
  // The sync client is built once, from VITE_API_BASE_URL. An empty value is
  // the public demo: nothing is sent and the header says so.
  const [client] = useState(() => createSyncClient())
  // Storage problems the astronaut has to know about: entries that live only in
  // this tab, or entries the app had to replace because it could not read them.
  const storageWarnings = [
    ...(store.isPersistent() ? [] : [strings.sync.notSaved]),
    ...(store.wasReset() ? [strings.sync.reset] : []),
  ]
  const personIds = useMemo(() => {
    // The demo rows keep their person in the picker even when the browser holds
    // entries of an earlier session for other people.
    const ids = new Set(data.demoEntries.map((entry) => entry.personId))
    for (const entry of entries) ids.add(entry.personId)
    return [...ids]
  }, [data, entries])
  const [personId, setPersonId] = useState('')
  const selectedPerson = personId || personIds[0] || ''
  const [activeTab, setActiveTab] = useState<TabId>(TABS[0].id)
  // Face sign-in is off unless the page is opened with ?face=1. REQ-14 forbids
  // real personal data in the app until Eng 1 records the exception, so the
  // button, the panel and the whole face module wait for that flag.
  const [faceEnabled] = useState(
    () => new URLSearchParams(window.location.search).get('face') === '1',
  )
  const [faceOpen, setFaceOpen] = useState(false)
  const faceButtonRef = useRef<HTMLButtonElement>(null)
  // The metadata line of the header: the latest mission day in the store and
  // the clock time now.
  const clock = missionNow(entries)

  return (
    <>
      <SkipLink />
      <AppHeader
        personIds={personIds}
        personId={selectedPerson}
        onPersonChange={setPersonId}
        clock={clock}
        store={store}
        client={client}
        faceEnabled={faceEnabled}
        faceOpen={faceOpen}
        onToggleFace={() => setFaceOpen((open) => !open)}
        faceButtonRef={faceButtonRef}
      />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          maxWidth: LAYOUT.containerWidth,
          mx: 'auto',
          px: {
            xs: `${LAYOUT.gutter.phone}px`,
            sm: `${LAYOUT.gutter.tablet}px`,
            md: `${LAYOUT.gutter.desktop}px`,
          },
          pt: { xs: 3, md: 5 },
          pb: 6,
        }}
      >
        {faceEnabled && faceOpen && (
          <Suspense
            fallback={
              <p className="face-panel__status" role="status">
                {strings.face.opening}
              </p>
            }
          >
            <FaceSignIn
              personId={selectedPerson}
              personIds={personIds}
              onPersonSelected={setPersonId}
              onFocusPicker={() =>
                document.getElementById(PERSON_PICKER_ID)?.focus()
              }
              onClose={() => {
                setFaceOpen(false)
                // Back to the control that opened the panel, as a dialog does.
                faceButtonRef.current?.focus()
              }}
            />
          </Suspense>
        )}
        {storageWarnings.length > 0 && (
          <Notice tone="warning">{storageWarnings.join(' ')}</Notice>
        )}
        <ScreenTabs activeTab={activeTab} onTabChange={setActiveTab} />
        {/* The panel holds the focusable controls, so it is not a tab stop of
            the tabs pattern. */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'home' && (
            <Home personId={selectedPerson} data={data} entries={entries} />
          )}
          {activeTab === 'entry' && (
            // A new person means a new form, with that person's day and time.
            <Entry
              key={selectedPerson}
              store={store}
              personId={selectedPerson}
              indicators={data.indicators}
              serverConfigured={client.isConfigured()}
              entries={entries.filter(
                (entry) => entry.personId === selectedPerson,
              )}
            />
          )}
          {activeTab === 'history' && (
            <History store={store} personId={selectedPerson} data={data} />
          )}
        </div>
      </Box>
    </>
  )
}
