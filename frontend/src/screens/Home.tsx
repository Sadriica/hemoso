import { lazy, Suspense, useState } from 'react'
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
  type IndicatorState,
  type Status,
} from '../domain/state'
import AttentionBadge from '../components/AttentionBadge'
import { statusBadgeKind, statusText } from '../components/attentionText'
import Disclosure from '../components/Disclosure'
import IndicatorDetails from '../components/IndicatorDetails'
import Notice from '../components/Notice'
import type { LoadedContent } from '../content/load'
import { createStateClient, type StateQuery } from '../data/stateClient'
import { useIndicatorStates } from '../hooks/useIndicatorState'
import { IndicatorIcon, StatusIcon, systemColor, systemOf } from '../icons'
import { useCountUp, useMotionAllowed } from '../motion/motion'
import { strings } from '../strings'

// The three figures are chunks of their own, so the first load stays small.
// Each one waits in a box of its final size, so nothing moves when it arrives.
const Planetarium = lazy(() =>
  import('../components/planetarium').then((m) => ({ default: m.Planetarium })),
)
const Instrument = lazy(() => import('../components/instruments'))
const BodySilhouette = lazy(() =>
  import('../components/body').then((m) => ({ default: m.BodySilhouette })),
)

// One indicator with everything the screen draws from: its readings, its rules,
// and the one status the planetarium, the notice and the card all read.
interface Row {
  indicator: Indicator
  entries: Entry[]
  rules: AttentionRule[]
  latest: Entry | null
  content: IndicatorContent | undefined
  status: Status
}

// One screen: the status of each indicator and a clear next step (REQ-01).
export default function Home({
  personId,
  data,
  entries,
  motionReduced = false,
}: {
  personId: string
  data: LoadedContent
  // The entries from the store, so a reading saved on the Entry screen shows
  // here at once (REQ-02).
  entries: Entry[]
  // The top bar switch; the system setting is read as well.
  motionReduced?: boolean
}) {
  const personEntries = entries.filter((entry) => entry.personId === personId)
  const waitingFor = waitingForFrom(data)
  // Built once from VITE_API_BASE_URL. Empty is the public demo: every card
  // uses the local rule.
  const [client] = useState(() => createStateClient())
  // On a wide screen the overview opens in its orbit view, under 900 px as a list.
  const [initialView] = useState<'list' | 'orbits'>(() =>
    window.matchMedia?.('(min-width: 900px)').matches ? 'orbits' : 'list',
  )
  const [chosenId, setChosenId] = useState<string | null>(null)
  const selectedId =
    data.indicators.find((item) => item.id === chosenId)?.id ??
    data.indicators[0]?.id ??
    null

  // Every question the screen asks the state route, one per indicator with a
  // reading, all of them at once.
  const queries: Record<string, StateQuery | null> = {}
  for (const indicator of data.indicators) {
    const latest = latestEntry(
      personEntries.filter((entry) => entry.indicatorId === indicator.id),
    )
    queries[indicator.id] =
      latest === null
        ? null
        : {
            personId,
            indicatorId: indicator.id,
            value: latest.value,
            context: latest.context,
          }
  }
  const answers = useIndicatorStates(client, queries)

  const rows: Row[] = data.indicators.map((indicator) => {
    const own = personEntries.filter(
      (entry) => entry.indicatorId === indicator.id,
    )
    const rules = data.rules.filter((rule) => rule.indicatorId === indicator.id)
    const latest = latestEntry(own)
    return {
      indicator,
      entries: own,
      rules,
      latest,
      content: data.contents[indicator.id],
      status: statusFor(indicator, own, rules, latest, answers[indicator.id]),
    }
  })
  const reviewRows = rows.filter((row) => row.status.state === 'needs_review')
  const selected = rows.find((row) => row.indicator.id === selectedId)
  const selectedSystem = selected ? systemOf(selected.indicator.id) : null

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
      {reviewRows.length > 0 && (
        <Notice
          tone="review"
          action={
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setChosenId(reviewRows[0].indicator.id)}
            >
              {strings.board.showFirst}
            </button>
          }
        >
          {strings.board.needsReview(reviewRows.length)}
        </Notice>
      )}
      {rows.length > 0 && (
        <div className="board">
          <div className="board__orbit">
            <Suspense fallback={<BoardLoading />}>
              <Planetarium
                items={rows.map(({ indicator, latest, status }) => {
                  const kind = statusBadgeKind(status)
                  const system = systemOf(indicator.id)
                  return {
                    id: indicator.id,
                    name: indicator.name,
                    stateText: statusText(status),
                    state: kind,
                    valueText: latest
                      ? `${latest.value} ${strings.cardUnit(indicator.unit)}`
                      : strings.badge.noData,
                    icon: <IndicatorIcon indicatorId={indicator.id} />,
                    stateIcon: <StatusIcon kind={kind} size={16} />,
                    systemColor: system
                      ? systemColor(system)
                      : 'var(--color-text-muted)',
                  }
                })}
                labels={strings.board.planetarium}
                selectedId={selectedId}
                onSelect={setChosenId}
                reducedMotion={motionReduced}
                initialView={initialView}
              />
            </Suspense>
          </div>
        </div>
      )}
      {selected && (
        <div className="detail">
          <ul className="indicator-list">
            <IndicatorRow
              key={selected.indicator.id}
              indicator={selected.indicator}
              latest={selected.latest}
              status={selected.status}
              content={selected.content}
              motionReduced={motionReduced}
            />
          </ul>
          <div className="detail__body">
            <Suspense
              fallback={<div className="detail__body-slot" aria-hidden="true" />}
            >
              <BodySilhouette
                system={selectedSystem}
                label={
                  selectedSystem
                    ? strings.board.bodyLabel(selected.indicator.name)
                    : strings.board.bodyNone
                }
              />
            </Suspense>
          </div>
        </div>
      )}
    </section>
  )
}

// The status of one indicator: the answer of the state route when it arrives,
// and the same rule run on the entries of this device before that, without a
// server or after an error (REQ-12).
function statusFor(
  indicator: Indicator,
  entries: Entry[],
  rules: AttentionRule[],
  latest: Entry | null,
  answer: IndicatorState | undefined,
): Status {
  if (answer !== undefined) return statusFromApi(answer)
  if (latest === null) return NO_DATA_STATUS
  return statusFromLocal(
    localState(latest, entries, rules, indicator.minSpread),
  )
}

// A box where the planetarium will be, in words, so the area is never blank.
function BoardLoading() {
  return (
    <p className="board__loading" role="status">
      {strings.board.loading}
    </p>
  )
}

// The value counts up from the old one when a new reading arrives, and shows
// the final number at once when motion is off.
function ReadingValue({
  value,
  unit,
  motionReduced,
}: {
  value: number
  unit: string
  motionReduced: boolean
}) {
  const allowed = useMotionAllowed(motionReduced)
  const decimals = String(value).split('.')[1]?.length ?? 0
  const shown = useCountUp(value, allowed, undefined, decimals)
  return (
    <span className="indicator-card__value">
      {shown}
      <span className="indicator-card__unit"> {strings.cardUnit(unit)}</span>
    </span>
  )
}

function IndicatorRow({
  indicator,
  latest,
  status,
  content,
  motionReduced,
}: {
  indicator: Indicator
  latest: Entry | null
  status: Status
  content: IndicatorContent | undefined
  motionReduced: boolean
}) {
  const sources = sourcesFor(indicator, status, content)
  const system = systemOf(indicator.id)
  const kind = statusBadgeKind(status)

  return (
    <li className={`indicator-card indicator-card--${kind}`}>
      <div className="indicator-card__top">
        <span
          className="indicator-card__icon"
          style={{
            color: system ? systemColor(system) : 'var(--color-text-muted)',
          }}
          aria-hidden="true"
        >
          <IndicatorIcon indicatorId={indicator.id} />
        </span>
        <h3 className="indicator-card__name">{indicator.name}</h3>
      </div>
      <div className="indicator-card__state">
        <AttentionBadge kind={kind} text={statusText(status)} />
      </div>
      {latest && (
        <div className="indicator-card__reading">
          <p className="indicator-card__figures">
            <ReadingValue
              value={latest.value}
              unit={indicator.unit}
              motionReduced={motionReduced}
            />
            <span className="indicator-card__time">
              {strings.timeLabel(latest.missionDay, latest.time)}
            </span>
          </p>
          {system && (
            <Suspense
              fallback={<span className="instrument-slot" aria-hidden="true" />}
            >
              <Instrument
                indicatorId={indicator.id}
                value={latest.value}
                reducedMotion={motionReduced}
              />
            </Suspense>
          )}
        </div>
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

// The text the astronaut reads for one state: the team's sentence from
// config/content/<indicator_id>.md when it is there (FORMATS.md section 3), and
// the app's short line when the file has none.
function nextStepFor(
  status: Status,
  content: IndicatorContent | undefined,
): string {
  const state = status.state
  if (state === 'needs_review') {
    if (status.level === null) return strings.nextStep.missing
    return contentText(content, status.level) ?? strings.nextStep.missing
  }
  const words =
    state === 'no_data'
      ? strings.nextStep.noData
      : state === 'in_range'
        ? strings.nextStep.inRange
        : strings.nextStep.outsideRange
  return contentText(content, state) ?? words
}

function contentText(
  content: IndicatorContent | undefined,
  state: string,
): string | undefined {
  const text = content?.statusAndNextSteps[state]?.trim()
  return text === undefined || text === '' ? undefined : text
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
