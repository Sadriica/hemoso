import { useEffect, useState } from 'react'
import type { SyncClient } from '../data/sync'
import { UtilityIcon } from '../icons'
import { strings } from '../strings'

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/**
 * A full-width note under the bar while the browser is offline and a server is
 * set up (REQ-28). Without a server there is nothing to wait for, so it stays
 * out. It renders nothing when online, so the page does not reserve space.
 */
export default function OfflineNotice({ client }: { client: SyncClient }) {
  const [online, setOnline] = useState(isOnline)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online || !client.isConfigured()) return null
  return (
    <div className="notice notice--warning offline-notice" role="status">
      <span className="notice__icon" aria-hidden="true">
        <UtilityIcon kind="wifi-off" size={18} />
      </span>
      <div className="notice__body">{strings.sync.offlineNotice}</div>
    </div>
  )
}
