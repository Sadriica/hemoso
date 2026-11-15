import { useEffect, useId, useMemo, useState } from 'react'
import type { Indicator } from '../domain/types'
import {
  createConditionsClient,
  psychologicalCondition,
  type Condition,
  type ConditionsClient,
} from './conditionsClient'
import { stateStrings } from './strings'
import './reaction.css'

// The current psychological state (REQ-38, REQ-06): the neuro-behavioural
// condition of config/rules/conditions.csv, shown as an evidence score with the
// signals behind it. It describes how the person is today and never labels,
// classifies or diagnoses them: no percentage, no disorder, no "you have".
// When the conditions route answers something other than 200 the block is not
// shown at all.

export interface PsychologicalStateProps {
  personId: string
  /** The indicators, for the plain name of each signal. */
  indicators: Indicator[]
  /** A test passes a fake; the screen builds the HTTP client. */
  client?: ConditionsClient
}

export default function PsychologicalState({
  personId,
  indicators,
  client,
}: PsychologicalStateProps) {
  const copy = stateStrings
  const [conditions] = useState(() => client ?? createConditionsClient())
  // The answer and the person it belongs to; a new person does not read the
  // previous answer while their own request is in flight.
  const [answer, setAnswer] = useState<{
    personId: string
    condition: Condition | null
  } | null>(null)
  const headingId = useId()

  useEffect(() => {
    if (!conditions.isConfigured()) return
    let alive = true
    void conditions.fetchConditions(personId).then((list) => {
      if (!alive) return
      setAnswer({
        personId,
        condition: list === null ? null : psychologicalCondition(list),
      })
    })
    return () => {
      alive = false
    }
  }, [conditions, personId])

  const names = useMemo(() => {
    const byId = new Map(indicators.map((item) => [item.id, item.name]))
    return (ids: string[]): string[] =>
      ids.map((id) => byId.get(id) ?? id)
  }, [indicators])

  // No server, no answer yet, an answer for another person, or a route that did
  // not answer 200: the block is not there.
  if (
    !conditions.isConfigured() ||
    answer === null ||
    answer.personId !== personId ||
    answer.condition === null
  ) {
    return null
  }
  const condition = answer.condition

  const pointing = condition.signals
    .filter((signal) => (signal.contribution ?? 0) > 0)
    .map((signal) => signal.indicatorId)
  const missing = condition.signals
    .filter((signal) => signal.contribution === null)
    .map((signal) => signal.indicatorId)
  const label = copy.label[condition.label] ?? copy.label.no_data
  const missingText = copy.missing(names(missing))

  return (
    <section className="psych" aria-labelledby={headingId}>
      <h2 id={headingId} className="psych__heading">
        {copy.heading}
      </h2>
      <p className="psych__name">{condition.name}</p>
      {condition.score !== null && (
        <>
          <div
            className="psych__bar"
            role="img"
            aria-label={copy.evidence(condition.score)}
          >
            <div
              className="psych__fill"
              style={{ width: `${Math.round(condition.score * 100)}%` }}
            />
          </div>
          <p className="psych__text">{copy.evidence(condition.score)}</p>
        </>
      )}
      <p className="psych__text">{label}</p>
      {pointing.length > 0 && (
        <p className="psych__text">{copy.pointing(names(pointing))}</p>
      )}
      {missingText !== '' && (
        <p className="psych__signals">{missingText}</p>
      )}
      <p className="psych__confirms">{copy.confirms}</p>
      <p className="psych__source">
        {copy.source}:{' '}
        {/^https?:\/\//.test(condition.source) ? (
          <a href={condition.source} target="_blank" rel="noreferrer">
            {condition.source}
          </a>
        ) : (
          copy.assumption
        )}
      </p>
    </section>
  )
}
