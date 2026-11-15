import { useCallback, useEffect, useRef } from 'react'
import type { PainClient } from '../data/painClient'
import { sendPendingPain, subscribePainOutbox } from '../data/painOutbox'
import { mergeServerPainReports } from '../data/painStore'

// The pain reports of a person with an account travel (REQ-37, B-3): the ones
// waiting in the outbox go to POST /people/{id}/pain, and the ones the server
// holds come back through GET, so the phone and the PC show the same reports.
// One round at a time and in the background, so the picker never waits for the
// server. The demo astronaut has no account: no request is made for them.
export function usePainSync(
  client: PainClient,
  personId: string | null,
  kind: 'demo' | 'account' | null,
): void {
  const running = useRef(false)
  // A report saved while a round is running is one more round, not a lost
  // trigger: the round that is already sending read the outbox before it.
  const again = useRef(false)
  // The routes of a person need their account: a demo person has none.
  const person = personId !== null && kind === 'account' ? personId : null

  const sendNow = useCallback(() => {
    if (person === null || !client.isConfigured()) return
    if (running.current) {
      again.current = true
      return
    }
    running.current = true
    void (async () => {
      do {
        again.current = false
        await sendPendingPain(client, person)
      } while (again.current)
    })().finally(() => {
      running.current = false
    })
  }, [client, person])

  // Signing in: the reports the server holds join this device's store first, so
  // a report made elsewhere is shown, and then whatever waits here goes out.
  useEffect(() => {
    if (person === null || !client.isConfigured()) return
    let live = true
    void client
      .fetchReports(person)
      .then((rows) => {
        // null is no server, no connection or an answer the contract does not
        // name: the device keeps the reports it has and shows no error.
        if (!live || rows === null) return
        mergeServerPainReports(rows)
      })
      .catch(() => {
        // Same as null.
      })
    sendNow()
    return () => {
      live = false
    }
  }, [client, person, sendNow])

  // A report just saved, a report the server answered for, and the browser
  // coming back on line start a round. The next round is the next of these:
  // what a dropped connection left behind waits for it.
  useEffect(() => subscribePainOutbox(sendNow), [sendNow])
  useEffect(() => {
    window.addEventListener('online', sendNow)
    return () => window.removeEventListener('online', sendNow)
  }, [sendNow])
}
