import { useState } from 'react'
import { latestEntry } from '../domain/entries'
import type {
  AttentionRule,
  Entry,
  Indicator,
  IndicatorContent,
  Source,
} from '../domain/types'
import {
  NO_DATA_STATUS,
  localState,
  statusFromApi,
  statusFromLocal,
  type Status,
} from '../domain/state'
import AttentionBadge from '../components/AttentionBadge'
import { statusBadgeKind, statusText } from '../components/attentionText'
import Disclosure from '../components/Disclosure'
import IndicatorDetails from '../components/IndicatorDetails'
import Notice from '../components/Notice'
import type { LoadedContent } from '../content/load'
import { createStateClient, type StateClient } from '../data/stateClient'
import { useIndicatorState } from '../hooks/useIndicatorState'
import { strings } from '../strings'

// One screen: the status of each indicator and a clear next step (REQ-01).
export default function Home({
  personId,
  data,
  entries,
}: {
  personId: string
  data: LoadedContent
  // The entries from the store, so a reading saved on the Entry screen shows
  // here at once (REQ-02).
  entries: Entry[]
}) {
  const personEntries = entries.filter((entry) => entry.personId === personId)
  // Built once from VITE_API_BASE_URL. Empty is the public demo: every card
  // uses the local rule.
  const [client] = useState(() => createStateClient())
  const waitingFor = waitingForFrom(data)

  return (
    <section aria-labelledby="home-heading">
      <h2 id="home-heading" className="home__heading">
        {strings.personHeading(personId)}
      </h2>
      {data.usingPlaceholders && (
        <Notice tone="info">
          {waitingFor.length === 0
            ? strings.placeholderNotice
            : strings.waitingFor(waitingFor)}
        </Notice>
      )}
      {data.problems.length > 0 && (
        <Notice tone="warning">
          <Disclosure label={strings.problems.label}>
            <ul className="problems__list">
              {data.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Disclosure>
        </Notice>
      )}
      <ul className="indicator-list">
        {data.indicators.map((indicator) => (
          <IndicatorRow
            key={indicator.id}
            personId={personId}
            client={client}
            indicator={indicator}
            entries={personEntries.filter(
              (entry) => entry.indicatorId === indicator.id,
            )}
            rules={data.rules.filter(
              (rule) => rule.indicatorId === indicator.id,
            )}
            content={data.contents[indicator.id]}
          />
        ))}
      </ul>
    </section>
  )
}

function IndicatorRow({
  personId,
  client,
  indicator,
  entries,
  rules,
  content,
}: {
  personId: string
  client: StateClient
  indicator: Indicator
  entries: Entry[]
  rules: AttentionRule[]
  content: IndicatorContent | undefined
}) {
  const latest = latestEntry(entries)
  const answer = useIndicatorState(
    client,
    latest === null
      ? null
      : {
          personId,
          indicatorId: indicator.id,
          value: latest.value,
          context: latest.context,
        },
  )
  // The backend state wins when it answers; the local rule (the same rule, run
  // on the entries of this device) covers no server, an error and the moment
  // before the answer arrives.
  const status: Status =
    answer !== null
      ? statusFromApi(answer)
      : latest === null
        ? NO_DATA_STATUS
        : statusFromLocal(
            localState(latest, entries, rules, indicator.minSpread),
          )
  const sources = sourcesFor(indicator, status, content)
  const kind = statusBadgeKind(status)

  return (
    <li className={`indicator-card indicator-card--${kind}`}>
      <div className="indicator-card__top">
        <h3 className="indicator-card__name">{indicator.name}</h3>
        <AttentionBadge kind={kind} text={statusText(status)} />
      </div>
      {latest && (
        <p className="indicator-card__reading">
          <span className="indicator-card__value">
            {latest.value}
            <span className="indicator-card__unit">
              {' '}
              {strings.cardUnit(indicator.unit)}
            </span>
          </span>
          <span className="indicator-card__time">
            {strings.timeLabel(latest.missionDay, latest.time)}
          </span>
        </p>
      )}
      <p className="indicator-card__next-step">
        {nextStepFor(status, content)}
      </p>
      {status.state === 'needs_review' && status.notify !== null && (
        <p className="indicator-card__who-acts">
          {strings.whoActs[status.notify]}
        </p>
      )}
      <div className="indicator-card__actions">
        <Disclosure label={strings.details.label}>
          <IndicatorDetails
            indicator={indicator}
            content={content}
            sources={sources}
          />
        </Disclosure>
      </div>
    </li>
  )
}

function nextStepFor(
  status: Status,
  content: IndicatorContent | undefined,
): string {
  if (status.state === 'no_data') return strings.nextStep.noData
  if (status.state === 'in_range') return strings.nextStep.inRange
  if (status.state === 'outside_range') return strings.nextStep.outsideRange
  const level = status.level
  if (level === null) return strings.nextStep.missing
  return content?.statusAndNextSteps[level] ?? strings.nextStep.missing
}

// What the screens still lack, named instead of a generic "example content"
// sentence: an attention rule for an indicator, or its text file. The generic
// sentence stays for a first run, when config/ has no file at all.
function waitingForFrom(data: LoadedContent): string[] {
  const waiting: string[] = []
  const hasRule = (indicatorId: string) =>
    data.rules.some((rule) => rule.indicatorId === indicatorId)

  if (data.indicators.some((indicator) => !hasRule(indicator.id))) {
    waiting.push(strings.waitingForItem.attentionRules)
  }
  if (
    data.indicators.some(
      (indicator) => data.contents[indicator.id] === undefined,
    )
  ) {
    waiting.push(strings.waitingForItem.indicatorTexts)
  }
  return waiting
}

function sourcesFor(
  indicator: Indicator,
  status: Status,
  content: IndicatorContent | undefined,
): Source[] {
  const sources: Source[] = [...indicator.sources, ...status.sources]
  if (content) sources.push(...content.sources)
  return dedupeSources(sources)
}

function dedupeSources(sources: Source[]): Source[] {
  const result: Source[] = []
  for (const source of sources) {
    if (source === 'Assumption') {
      if (!result.includes('Assumption')) result.push(source)
    } else if (
      !result.some((entry) => entry !== 'Assumption' && entry.url === source.url)
    ) {
      result.push(source)
    }
  }
  return result
}
