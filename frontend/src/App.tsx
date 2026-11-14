import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { loadContent } from './content/load'
import SyntheticNotice from './components/SyntheticNotice'
import Home from './screens/Home'
import { strings } from './strings'

const TABS = [{ id: 'home', label: strings.tabs.home }] as const

export default function App() {
  const [data] = useState(() => loadContent())
  const personIds = useMemo(() => {
    const ids = new Set(data.demoEntries.map((entry) => entry.personId))
    return [...ids]
  }, [data])
  const [personId, setPersonId] = useState('')
  const selectedPerson = personId || personIds[0] || ''
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

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
        <h1>{strings.appName}</h1>
        <SyntheticNotice />
        <div className="person-picker">
          <label htmlFor="person-picker">{strings.personPickerLabel}</label>
          <select
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
      </header>
      <main id="main-content" className="app-main" tabIndex={-1}>
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
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'home' && (
            <Home personId={selectedPerson} data={data} />
          )}
        </div>
      </main>
    </>
  )
}
