import { useEffect, useState } from 'react'
import type { StateClient, StateQuery } from '../data/stateClient'
import type { IndicatorState } from '../domain/state'

// The backend answer for one reading, or null while there is none: no server,
// an error, the answer not yet in, or an answer that belongs to another
// reading. The screens show the local rule until this returns something
// (REQ-12).
export function useIndicatorState(
  client: StateClient,
  query: StateQuery | null,
): IndicatorState | null {
  const [answer, setAnswer] = useState<{
    key: string
    state: IndicatorState | null
  } | null>(null)

  // The reading this answer belongs to. A new reading asks again; the old
  // answer is not shown for it, without a state reset in the effect.
  const key =
    query === null
      ? null
      : [query.personId, query.indicatorId, query.value, query.context].join(
          '\u0000',
        )

  useEffect(() => {
    if (query === null || key === null || !client.isConfigured()) return
    let live = true
    client
      .fetchState(query)
      .then((state) => {
        if (live) setAnswer({ key, state })
      })
      .catch(() => {
        // A client that throws where the contract says null is still no
        // answer for this screen.
      })
    return () => {
      live = false
    }
    // `query` is rebuilt on every render, so the effect follows its parts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    client,
    key,
    query?.personId,
    query?.indicatorId,
    query?.value,
    query?.context,
  ])

  return answer !== null && answer.key === key ? answer.state : null
}
