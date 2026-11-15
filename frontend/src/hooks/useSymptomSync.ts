import { useCallback, useEffect, useRef } from 'react'
import type { SymptomClient } from '../data/symptomClient'
import { sendPendingSymptoms, subscribeSymptomOutbox } from '../data/symptomOutbox'
import { mergeServerSymptomReports } from '../data/symptomStore'

// The symptom reports of a person with an account travel (T-80): the ones
// waiting in the outbox go to POST /people/{id}/symptoms, and the ones the
// server holds come back through GET on sign-in. One round at a time and in
// the background, so the Report never waits for the server. The demo
// astronaut has no account: no request is made for them.
export function useSymptomSync(
  client: SymptomClient,
  personId: string | null,
  kind: 'demo' | 'account' | null,
): void {
  const running = useRef(false)
  // A report saved while a round is running is one more round, not a lost trigger.
  const again = useRef(false)
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
        await sendPendingSymptoms(client, person)
      } while (again.current)
    })().finally(() => {
      running.current = false
    })
  }, [client, person])

  useEffect(() => {
    if (person === null || !client.isConfigured()) return
    let live = true
    void client
      .fetchReports(person)
      .then((rows) => {
        if (!live || rows === null) return
        mergeServerSymptomReports(rows)
      })
      .catch(() => {
        // Same as null: the device keeps the reports it has.
      })
    sendNow()
    return () => {
      live = false
    }
  }, [client, person, sendNow])

  useEffect(() => subscribeSymptomOutbox(sendNow), [sendNow])
  useEffect(() => {
    window.addEventListener('online', sendNow)
    return () => window.removeEventListener('online', sendNow)
  }, [sendNow])
}
