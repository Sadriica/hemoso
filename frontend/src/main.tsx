import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './phases.css'
import App from './App.tsx'

// A deploy renames the lazy chunks, and a tab opened before it then asks for
// files that no longer exist (seen on the judges' path, Sun 09:20). Vite fires
// `vite:preloadError` for that case: reload once to get the new build, and not
// again within a minute, so a chunk that is really broken cannot loop.
const RELOAD_KEY = 'hemoso:chunk-reload'
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
