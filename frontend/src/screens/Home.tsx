import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { attentionFor } from '../domain/attention'
import { latestEntry } from '../domain/entries'
import type {
  Attention,
  Entry,
  Indicator,
  IndicatorContent,
  Source,
} from '../domain/types'
import AttentionBadge from '../components/AttentionBadge'
import Disclosure from '../components/Disclosure'
import IndicatorDetails from '../components/IndicatorDetails'
import Notice from '../components/Notice'
import type { LoadedContent } from '../content/load'
import { IndicatorIcon, StatusIcon, systemColor, systemOf } from '../icons'
import { useCountUp, useMotionAllowed } from '../motion'
import { attentionText } from '../components/attentionText'
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

type StateKind = 'in_range' | 'review' | 'no_data'

// The visual state of an attention result. Only the states the app already
// computes are drawn: "outside your usual range" is not one of them yet.
function stateKind(attention: Attention): StateKind {
  if (attention.kind === 'in_range') return 'in_range'
  if (attention.kind === 'attention') return 'review'
  return 'no_data'
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
  const [chosenId, setChosenId] = useState<string | null>(null)
  const selectedId =
    data.indicators.find((item) => item.id === chosenId)?.id ??
    data.indicators[0]?.id ??
    null

  // One result per indicator, shared by the planetarium and the cards.
  const rows = data.indicators.map((indicator) => {
    const own = personEntries.filter((entry) => entry.indicatorId === indicator.id)
    const rules = data.rules.filter((rule) => rule.indicatorId === indicator.id)
    const latest = latestEntry(own)
    const attention: Attention = latest
      ? attentionFor(latest.value, rules)
      : { kind: 'no_data' }
    return { indicator, latest, attention, content: data.contents[indicator.id] }
  })
  const reviewRows = rows.filter((row) => row.attention.kind === 'attention')
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
                items={rows.map(({ indicator, latest, attention }) => {
                  const kind = stateKind(attention)
                  const system = systemOf(indicator.id)
                  return {
                    id: indicator.id,
                    name: indicator.name,
                    stateText: attentionText(attention),
                    state: kind,
                    valueText: latest
                      ? `${latest.value} ${strings.cardUnit(indicator.unit)}`
                      : strings.badge.noData,
                    icon: <IndicatorIcon indicatorId={indicator.id} />,
                    stateIcon: <StatusIcon kind={kind} size={16} />,
                    systemColor: system ? systemColor(system) : 'var(--color-text-muted)',
                  }
                })}
                labels={strings.board.planetarium}
                selectedId={selectedId}
                onSelect={setChosenId}
                reducedMotion={motionReduced}
              />
              <OrbitFirst />
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
              attention={selected.attention}
              content={selected.content}
              motionReduced={motionReduced}
            />
          </ul>
          <div className="detail__body">
            <Suspense fallback={<div className="detail__body-slot" aria-hidden="true" />}>
              <BodySilhouette
                system={selectedSystem}
                label={
                  selected && selectedSystem
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

// On a wide screen the overview opens in its orbit view. The planetarium keeps
// its view in its own state, so this presses its toggle once, after it mounts.
// Under 900 px, and with the list already chosen, it does nothing.
function OrbitFirst() {
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    done.current = true
    if (!window.matchMedia?.('(min-width: 900px)').matches) return
    const toggle = document.querySelector<HTMLButtonElement>('.planetarium__toggle')
    if (toggle && toggle.getAttribute('aria-pressed') === 'false') toggle.click()
  }, [])
  return null
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
  attention,
  content,
  motionReduced,
}: {
  indicator: Indicator
  latest: Entry | null
  attention: Attention
  content: IndicatorContent | undefined
  motionReduced: boolean
}) {
  const sources = sourcesFor(indicator, attention, content)
  const system = systemOf(indicator.id)

  return (
    <li
      className={`indicator-card indicator-card--${stateKind(attention)}`}
    >
      <div className="indicator-card__top">
        <span
          className="indicator-card__icon"
          style={{ color: system ? systemColor(system) : 'var(--color-text-muted)' }}
          aria-hidden="true"
        >
          <IndicatorIcon indicatorId={indicator.id} />
        </span>
        <h3 className="indicator-card__name">{indicator.name}</h3>
      </div>
      <div className="indicator-card__state">
        <AttentionBadge attention={attention} />
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
            <Suspense fallback={<span className="instrument-slot" aria-hidden="true" />}>
              <Instrument
                indicatorId={indicator.id}
                value={latest.value}
                reducedMotion={motionReduced}
              />
              <OrbitFirst />
            </Suspense>
          )}
        </div>
      )}
      <p className="indicator-card__next-step">
        {nextStepFor(attention, content)}
      </p>
      {attention.kind === 'attention' && (
        <p className="indicator-card__who-acts">
          {strings.whoActs[attention.rule.notify]}
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
  attention: Attention,
  content: IndicatorContent | undefined,
): string {
  if (attention.kind === 'in_range') return strings.nextStep.inRange
  if (attention.kind === 'no_rules') return strings.nextStep.noRules
  if (attention.kind === 'no_data') return strings.nextStep.noData
  return content?.statusAndNextSteps[attention.level] ?? strings.nextStep.missing
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
  attention: Attention,
  content: IndicatorContent | undefined,
): Source[] {
  const sources: Source[] = [...indicator.sources]
  if (attention.kind === 'attention') sources.push(...attention.rule.sources)
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
