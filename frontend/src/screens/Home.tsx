import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { attentionFor } from '../domain/attention'
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
  type LocalState,
  statusFromApi,
  statusFromLocal,
  type IndicatorState,
  type Status,
} from '../domain/state'
import AttentionBadge from '../components/AttentionBadge'
import {
  statusBadgeKind,
  statusText,
  type BadgeKind,
} from '../components/attentionText'
import { BodySilhouette, BODY_ZONES } from '../components/body'
import type { BodySystem } from '../components/body/zones'
import Disclosure from '../components/Disclosure'
import ErrorBoundary from '../components/ErrorBoundary'
import IndicatorDetails from '../components/IndicatorDetails'
import { sourceLabel } from '../components/sourceLabel'
import Notice from '../components/Notice'
import TrendRow, { type Baseline } from '../components/TrendRow'
import type { LoadedContent } from '../content/load'
import { createStateClient, type StateQuery } from '../data/stateClient'
import { useIndicatorStates } from '../hooks/useIndicatorState'
import { IndicatorIcon, StatusIcon, systemColor, systemOf } from '../icons'
import { useCountUp, useMotionAllowed } from '../motion/motion'
import { strings } from '../strings'
// The slot of the lazy 3D body has its size here, so nothing moves when the
// chunk arrives.
import '../components/body3d/body3d.css'

// The three figures are chunks of their own, so the first load stays small.
// Each one waits in a box of its final size, so nothing moves when it arrives.
const Planetarium = lazy(() =>
  import('../components/planetarium').then((m) => ({ default: m.Planetarium })),
)
const Instrument = lazy(() => import('../components/instruments'))
// The body is a chunk of its own: three.js never reaches the first load.
// One more try when the chunk does not arrive: a tab opened before a deploy
// asks for a file name that is gone, and a weak link drops a request.
const Body3D = lazy(() =>
  import('../components/body3d/Body3D').catch(
    () => import('../components/body3d/Body3D'),
  ),
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
  // What the trend row compares the latest value with; null without a reading.
  baseline: Baseline | null
}

// One screen: the status of each indicator and a clear next step (REQ-01).
export default function Home({
  personId,
  data,
  entries,
  motionReduced = false,
  selectedId: controlledId,
  onSelect,
}: {
  personId: string
  data: LoadedContent
  // The entries from the store, so a reading saved on the Entry screen shows
  // here at once (REQ-02).
  entries: Entry[]
  // The top bar switch; the system setting is read as well.
  motionReduced?: boolean
  // The selected indicator, when the parent keeps it (so the History panel can
  // follow the card). Left out, this screen keeps its own choice.
  selectedId?: string | null
  onSelect?: (id: string) => void
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
  // The body sits in a column of its own that only exists from 900 px up
  // (phases.css). Under that width it is not mounted at all, so a phone never
  // downloads the three.js chunk of a figure it cannot show.
  const wide = useWideScreen()
  const [ownId, setOwnId] = useState<string | null>(null)
  const chosenId = onSelect === undefined ? ownId : (controlledId ?? null)
  // Set only by a person's pick, so the first render and a change that comes
  // from the parent never move the page.
  const scrollAfterPick = useRef(false)
  const detailRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const smooth = useMotionAllowed(motionReduced)
  const setChosenId = (id: string): void => {
    scrollAfterPick.current = true
    if (onSelect === undefined) setOwnId(id)
    else onSelect(id)
  }
  const selectedId =
    data.indicators.find((item) => item.id === chosenId)?.id ??
    data.indicators[0]?.id ??
    null

  // On a narrow screen the card sits far below the list. After a pick, bring it
  // into view; `nearest` leaves the page alone when it is already all in view.
  // Focus stays where it was. The rail and the top edge are kept clear with
  // scroll margins in CSS.
  useEffect(() => {
    if (!scrollAfterPick.current) return
    scrollAfterPick.current = false
    const card = detailRef.current
    if (card === null || typeof card.scrollIntoView !== 'function') return
    card.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }, [selectedId, smooth])

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
            missionDay: latest.missionDay,
            time: latest.time,
          }
  }
  const answers = useIndicatorStates(client, queries)

  const rows: Row[] = data.indicators.map((indicator) => {
    const own = personEntries.filter(
      (entry) => entry.indicatorId === indicator.id,
    )
    const rules = data.rules.filter((rule) => rule.indicatorId === indicator.id)
    const latest = latestEntry(own)
    const answer = answers[indicator.id]
    const local =
      latest === null
        ? null
        : localState(latest, own, rules, indicator.minSpread)
    return {
      indicator,
      entries: own,
      rules,
      latest,
      content: data.contents[indicator.id],
      status: statusFor(latest, local, answer),
      baseline:
        answer !== undefined
          ? { median: answer.median, spread: answer.spread, n: answer.n }
          : local === null
            ? null
            : { median: local.median, spread: local.spread, n: local.n },
    }
  })
  const reviewRows = rows.filter((row) => statusBadgeKind(row.status) === 'review')
  const selected = rows.find((row) => row.indicator.id === selectedId)
  const selectedSystem = selected ? systemOf(selected.indicator.id) : null

  // The flat body: what the centre of the orbits shows before the 3D figure
  // arrives and whenever it cannot be drawn.
  // Drawn the same bare way as the 3D figure: the outline alone, with no tile
  // behind it, so the centre of the orbits looks the same in both themes.
  const flatBody = (
    <div className="body3d body3d--bare body3d--flat">
      <BodySilhouette
        system={flatSystem(selectedSystem)}
        label={strings.board.planetarium.center}
      />
    </div>
  )

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
      {personEntries.length === 0 && (
        <Notice tone="info">{strings.board.noReadings}</Notice>
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
      <div ref={panelRef} className="status-panel panel panel--cut" data-enter="panel">
      {rows.length > 0 && <SystemStrip rows={rows} />}
      {rows.length > 0 && (
        <div className="board">
          <div className="board__orbit">
            <ErrorBoundary
              fallback={<Notice tone="warning">{strings.board.overviewFailed}</Notice>}
            >
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
                    // Empty without a reading: the state text already says it.
                    valueText: latest
                      ? `${latest.value} ${strings.cardUnit(indicator.unit)}`
                      : '',
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
                center={
                  wide ? (
                    // The body stands in the centre of the orbits and lights
                    // the zone of the selected indicator. It is never an empty
                    // space: while the 3D chunk loads, or when it cannot be
                    // loaded or drawn, the flat body takes its place.
                    <ErrorBoundary fallback={flatBody}>
                      <Suspense fallback={flatBody}>
                        <Body3D
                          bare
                          mode="status"
                          system={selectedSystem}
                          state={selected ? statusBadgeKind(selected.status) : null}
                          reducedMotion={motionReduced}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  ) : undefined
                }
                centerText={
                  selected && selectedSystem
                    ? strings.board.bodyLabel(
                        strings.board.systemNames[selectedSystem],
                        selected.indicator.name,
                      )
                    : undefined
                }
              />
            </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
      {selected && (
        <>
        <StatusLink
          panelRef={panelRef}
          selectedId={selected.indicator.id}
          kind={statusBadgeKind(selected.status)}
          still={motionReduced}
        />
        <div className="detail home__detail" ref={detailRef}>
          <ul className="indicator-list">
            <IndicatorRow
              key={selected.indicator.id}
              indicator={selected.indicator}
              latest={selected.latest}
              baseline={selected.baseline}
              rules={selected.rules}
              status={selected.status}
              content={selected.content}
              motionReduced={motionReduced}
            />
          </ul>
        </div>
        </>
      )}
      </div>
    </section>
  )
}

// The system strip of the console: how many channels there are and how many
// of them are in each state right now. Counted from the same statuses the
// cards show; a state with no channel is left out.
const STRIP_ORDER: BadgeKind[] = ['review', 'outside', 'in_range', 'no_data']

function SystemStrip({ rows }: { rows: Row[] }) {
  const copy = strings.board.strip
  const counts = new Map<BadgeKind, number>()
  for (const row of rows) {
    const kind = statusBadgeKind(row.status)
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return (
    <ul className="sys-strip" aria-label={copy.label}>
      <li className="sys-strip__item sys-strip__item--total">
        {copy.channels(rows.length)}
      </li>
      {STRIP_ORDER.filter((kind) => counts.has(kind)).map((kind) => (
        <li key={kind} className={`sys-strip__item sys-strip__item--${kind}`}>
          <StatusIcon kind={kind} size={16} />
          <span>{copy.count[kind](counts.get(kind) ?? 0)}</span>
        </li>
      ))}
    </ul>
  )
}

// The system of the selected indicator as the flat body names its zones, or
// null when it has no zone there.
function flatSystem(system: string | null): BodySystem | null {
  return system !== null && (BODY_ZONES as readonly string[]).includes(system)
    ? (system as BodySystem)
    : null
}

// True from 900 px up, the width at which the body column appears (phases.css).
// Read once and followed on resize, so the figure mounts exactly when the
// layout has room for it.
function useWideScreen(): boolean {
  const [wide, setWide] = useState(
    () => window.matchMedia?.('(min-width: 900px)').matches ?? false,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(min-width: 900px)')
    const update = (): void => setWide(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return wide
}

// The status of one indicator: the answer of the state route when it arrives,
// and the same rule run on the entries of this device before that, without a
// server or after an error (REQ-12).
function statusFor(
  latest: Entry | null,
  local: LocalState | null,
  answer: IndicatorState | undefined,
): Status {
  // The server still decides the baseline before the limits. A limit with a
  // link that is crossed needs review even with no baseline yet (phys-02), so
  // the local answer wins over the server's "no data" in that one case.
  if (
    answer !== undefined &&
    !(
      answer.state === 'no_data' &&
      local !== null &&
      local.state === 'needs_review'
    )
  ) {
    return statusFromApi(answer)
  }
  if (latest === null || local === null) return NO_DATA_STATUS
  return statusFromLocal(local)
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
  baseline,
  rules,
  status,
  content,
  motionReduced,
}: {
  indicator: Indicator
  latest: Entry | null
  baseline: Baseline | null
  rules: AttentionRule[]
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
              {strings.timeLabel(
                latest.missionDay,
                latest.time,
                strings.entry.contextLabels[latest.context],
              )}
            </span>
          </p>
          {system && (
            <ErrorBoundary
              fallback={<span className="instrument-slot" aria-hidden="true" />}
            >
            <Suspense
              fallback={<span className="instrument-slot" aria-hidden="true" />}
            >
              <Instrument
                indicatorId={indicator.id}
                value={latest.value}
                reducedMotion={motionReduced}
                state={kind}
              />
            </Suspense>
            </ErrorBoundary>
          )}
        </div>
      )}
      {latest && baseline && (
        <TrendRow
          value={latest.value}
          unit={indicator.unit}
          baseline={baseline}
          context={latest.context}
        />
      )}
      <p className="indicator-card__next-step">
        {nextStepFor(status, content)}
      </p>
      {status.state === 'needs_review' && latest && (
        <LimitCrossed
          latest={latest}
          unit={indicator.unit}
          rules={rules}
          fallback={status.sources}
        />
      )}
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
            rules={rules}
          />
        </Disclosure>
      </div>
    </li>
  )
}

// Which limit the reading crossed and where it comes from, taken from the
// matching row of config/rules/attention.csv. The row also names the source, so
// a card never asks the astronaut to trust a bare level name.
function LimitCrossed({
  latest,
  unit,
  rules,
  fallback,
}: {
  latest: Entry
  unit: string
  rules: AttentionRule[]
  fallback: Source[]
}) {
  const hintId = useId()
  const match = attentionFor(latest.value, rules)
  if (match.kind !== 'attention') return null
  const sources = match.rule.sources.length > 0 ? match.rule.sources : fallback
  return (
    <p className="indicator-card__limit">
      {/* The new-tab hint describes the link, so its name stays the label. */}
      <span id={hintId} className="sr-only">
        {strings.sources.opensNewTab}
      </span>
      {strings.board.limitCrossed(
        match.rule.side,
        match.rule.threshold,
        strings.cardUnit(unit),
      )}{' '}
      {strings.board.limitSource}{' '}
      {sources.map((source, index) => (
        <span key={source === 'Assumption' ? 'assumption' : source.url}>
          {index > 0 && ', '}
          {source === 'Assumption' ? (
            source
          ) : (
            <a
              href={source.url}
              title={source.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-describedby={hintId}
            >
              {sourceLabel(source)}
            </a>
          )}
        </span>
      ))}
    </p>
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

// The line from the selected body of the planetarium to the top of its card: a
// thin path measured from the two elements, drawn in on each selection, with a
// dot in the state colour where it lands. In the list view there is no body to
// start from, so a short stub marks the link instead. Decoration only.
function StatusLink({
  panelRef,
  selectedId,
  kind,
  still,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  selectedId: string
  kind: string
  still: boolean
}) {
  const [geo, setGeo] = useState<{ d: string; x: number; y: number } | null>(null)
  const allowed = useMotionAllowed(still)

  // After the commit, so the panel's ref is set (a child's layout effect runs
  // before its parent's ref is attached).
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const measure = () => {
      const orb = panel.querySelector<HTMLElement>(
        '.planetarium__stage button[aria-pressed="true"]',
      )
      const card = panel.querySelector<HTMLElement>('.indicator-card')
      if (!orb || !card) {
        setGeo(null)
        return
      }
      const base = panel.getBoundingClientRect()
      const a = orb.getBoundingClientRect()
      const b = card.getBoundingClientRect()
      const x1 = a.left + a.width / 2 - base.left
      const y1 = a.bottom - base.top
      const x2 = Math.min(Math.max(x1, b.left - base.left + 32), b.right - base.left - 32)
      const y2 = b.top - base.top
      const mid = (y2 - y1) / 2
      const round = (n: number) => Math.round(n * 10) / 10
      setGeo({
        d: `M${round(x1)} ${round(y1)} C${round(x1)} ${round(y1 + mid)} ${round(x2)} ${round(y2 - mid)} ${round(x2)} ${round(y2)}`,
        x: round(x2),
        y: round(y2),
      })
    }
    measure()
    // The planetarium loads on its own and the view can change inside the
    // panel, so the line is measured again when the panel resizes or its
    // content changes (one frame at most).
    let frame = 0
    const later = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(later) : null
    observer?.observe(panel)
    const mutations = new MutationObserver(later)
    mutations.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed'] })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [panelRef, selectedId])

  if (geo === null) {
    return <div className={`status-link status-link--${kind}`} aria-hidden="true" />
  }
  return (
    <svg
      key={selectedId}
      className={`status-path status-link--${kind}${allowed ? '' : ' status-path--still'}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={geo.d} pathLength={1} data-draw="" />
      <circle cx={geo.x} cy={geo.y} r="4" />
    </svg>
  )
}
