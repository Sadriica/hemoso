import { useEffect, useRef, useState } from 'react'
import type { StateClient, StateQuery } from '../data/stateClient'
import type { IndicatorState } from '../domain/state'

// The key of one answer: the reading it belongs to. A new reading asks again;
// the old answer is not shown for it, without a state reset in the effect. The
// day and the time belong to the reading, so a new reading of the same value is
// a new question.
function keyOf(query: StateQuery): string {
  return [
    query.personId,
    query.indicatorId,
    query.value,
    query.context,
    query.missionDay ?? '',
    query.time ?? '',
  ].join('\u0000')
}

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

  const key = query === null ? null : keyOf(query)

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
    query?.missionDay,
    query?.time,
  ])

  return answer !== null && answer.key === key ? answer.state : null
}

// The backend answer for every indicator of the status screen, keyed by
// indicator id: one request per reading, all of them at once, and an answer
// for another reading is ignored without touching the others.
export function useIndicatorStates(
  client: StateClient,
  queries: Record<string, StateQuery | null>,
): Record<string, IndicatorState> {
  const [answers, setAnswers] = useState<
    Record<string, { key: string; state: IndicatorState }>
  >({})
  // The answers already in, read inside the effect without asking it again.
  const asked = useRef(answers)
  useEffect(() => {
    asked.current = answers
  }, [answers])

  const keys: Record<string, string> = {}
  for (const [id, query] of Object.entries(queries)) {
    keys[id] = query === null ? '' : keyOf(query)
  }
  const signature = Object.keys(keys)
    .sort()
    .map((id) => `${id}\u0001${keys[id]}`)
    .join('\u0000')

  useEffect(() => {
    if (!client.isConfigured()) return
    let live = true
    for (const [id, key] of Object.entries(keys)) {
      const query = queries[id]
      if (query === null || key === '' || asked.current[id]?.key === key) {
        continue
      }
      client
        .fetchState(query)
        .then((state) => {
          if (!live || state === null) return
          setAnswers((previous) => ({ ...previous, [id]: { key, state } }))
        })
        .catch(() => {
          // A client that throws where the contract says null is no answer.
        })
    }
    return () => {
      live = false
    }
    // `queries` is rebuilt on every render, so the effect follows its
    // signature: one indicator id and the reading asked for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, signature])

  const result: Record<string, IndicatorState> = {}
  for (const [id, key] of Object.entries(keys)) {
    const answer = answers[id]
    if (key !== '' && answer !== undefined && answer.key === key) {
      result[id] = answer.state
    }
  }
  return result
}
