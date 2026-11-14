import {
  lazy,
  Suspense,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { loadContent } from './content/load'
import { LocalEntryStore } from './data/entryStore'
import { createSyncClient } from './data/sync'
import { useEntries } from './hooks/useEntries'
import Notice from './components/Notice'
import SyncStatus from './components/SyncStatus'
import SyntheticNotice from './components/SyntheticNotice'
import Entry from './screens/Entry'
import History from './screens/History'
import Home from './screens/Home'
import { strings } from './strings'

const TABS = [
  { id: 'home', label: strings.tabs.home },
  { id: 'entry', label: strings.tabs.entry },
  { id: 'history', label: strings.tabs.history },
] as const

type TabId = (typeof TABS)[number]['id']

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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  // Face sign-in is off unless the page is opened with ?face=1. REQ-14 forbids
  // real personal data in the app until Eng 1 records the exception, so the
  // button, the panel and the whole face module wait for that flag.
  const [faceEnabled] = useState(
    () => new URLSearchParams(window.location.search).get('face') === '1',
  )
  const [faceOpen, setFaceOpen] = useState(false)
  const faceButtonRef = useRef<HTMLButtonElement>(null)
  const pickerRef = useRef<HTMLSelectElement>(null)

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((tab) => tab.id === activeTab)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    else return

    event.preventDefault()
    const target = TABS[next]
    setActiveTab(target.id)
    tabRefs.current[next]?.focus()
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        {strings.skipToMain}
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__bar">
            <h1 className="app-header__brand">{strings.appName}</h1>
            <div className="app-header__account">
              <div className="person-picker">
                <label htmlFor="person-picker">
                  {strings.personPickerLabel}
                </label>
                <select
                  ref={pickerRef}
                  id="person-picker"
                  value={selectedPerson}
                  onChange={(event) => setPersonId(event.target.value)}
                >
                  {personIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              {faceEnabled && (
                <button
                  ref={faceButtonRef}
                  className="button button--secondary app-header__face"
                  type="button"
                  aria-expanded={faceOpen}
                  aria-controls={faceOpen ? 'face-panel' : undefined}
                  onClick={() => setFaceOpen((open) => !open)}
                >
                  {strings.face.buttonLabel}
                </button>
              )}
            </div>
          </div>
          <SyntheticNotice />
          <SyncStatus store={store} client={client} />
        </div>
      </header>
      <main id="main-content" className="app-main" tabIndex={-1}>
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
              onFocusPicker={() => pickerRef.current?.focus()}
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
        <div role="tablist" aria-label={strings.tabs.label} className="tabs">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={onTabKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
      </main>
    </>
  )
}
