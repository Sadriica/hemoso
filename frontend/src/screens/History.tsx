import { useId, useState } from 'react'
import {
  comparisonFromBaseline,
  newestFirst,
  type HistoryComparison,
} from '../domain/entries'
import type { LoadedContent } from '../content/load'
import { createStateClient } from '../data/stateClient'
import type { AttentionRule, Entry } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { localState } from '../domain/state'
import { useEntries } from '../hooks/useEntries'
import { useIndicatorState } from '../hooks/useIndicatorState'
import { statusBadgeKind, statusText } from '../components/attentionText'
import { StatusIcon } from '../icons'
import { rowStatus } from './historyRows'
import TrendChart, { type TrendSeriesInput } from '../components/TrendChart'
import TrendControls from '../components/TrendControls'
import Notice from '../components/Notice'
import {
  bloodPressurePartner,
  contextCounts,
  trendBand,
  trendSeries,
  usualContext,
  type TrendWindow,
} from '../domain/trend'
import type { Indicator, MeasurementContext } from '../domain/types'
import { strings } from '../strings'
import './history-console.css'

// How many readings the table shows before "Show all".
const SHORT_TABLE = 14

// One indicator against the person's own earlier readings (REQ-12): a sentence
// with the latest value, the median of the earlier ones and the difference, a
// chart of the same numbers and a table of the newest readings. The status of
// each reading comes from the same rule as the indicator card (its own
// baseline, then the attention rows), written in words with the state icon,
// never a colour on its own (REQ-15).
export default function History({
  store,
  personId,
  data,
  indicatorId,
}: {
  store: EntryStore
  personId: string
  data: LoadedContent
  // The indicator the status card has selected. The panel opens on it and
  // follows it; the select below still lets the person look at another one.
  indicatorId?: string
}) {
  const entries = useEntries(store)
  const [chosenId, setChosenId] = useState(
    indicatorId ?? data.indicators[0]?.id ?? '',
  )
  // A new card selection moves the panel; compared during render so there is
  // no frame with the old indicator.
  const [followed, setFollowed] = useState(indicatorId)
  if (indicatorId !== followed) {
    setFollowed(indicatorId)
    if (indicatorId !== undefined) setChosenId(indicatorId)
  }
  // Built once from VITE_API_BASE_URL. Empty is the public demo: the sentence
  // compares the readings of this device.
  const [client] = useState(() => createStateClient())
  const headingId = useId()
  const selectId = useId()
  const summaryId = useId()
  const tableId = useId()
  const [showAll, setShowAll] = useState(false)
  // The person's own choice of context and window; null context means the
  // indicator's usual one. A new indicator starts again from its usual context.
  const [pick, setPick] = useState<{
    id: string
    context: MeasurementContext
  } | null>(null)
  const [trendWindow, setTrendWindow] = useState<TrendWindow>('last14')

  const indicator =
    data.indicators.find((item) => item.id === chosenId) ?? data.indicators[0]

  // The person's rows only: another person's readings never count, even when
  // both people share the browser.
  const rows =
    indicator === undefined
      ? []
      : newestFirst(
          entries.filter(
            (entry) =>
              entry.personId === personId &&
              entry.indicatorId === indicator.id,
          ),
        )
  const rules =
    indicator === undefined
      ? []
      : data.rules.filter((rule) => rule.indicatorId === indicator.id)
  // Blood pressure is two indicators on one chart: the partner's readings and
  // rules ride along.
  const partner = indicator === undefined ? undefined : partnerOf(data, indicator)
  const partnerRows =
    partner === undefined
      ? []
      : newestFirst(
          entries.filter(
            (entry) =>
              entry.personId === personId && entry.indicatorId === partner.id,
          ),
        )
  const partnerRules =
    partner === undefined
      ? []
      : data.rules.filter((rule) => rule.indicatorId === partner.id)
  const usual = usualContext(rows)
  const context =
    pick !== null && indicator !== undefined && pick.id === indicator.id
      ? pick.context
      : usual
  const trendInputs: TrendSeriesInput[] =
    indicator === undefined
      ? []
      : [
          seriesInput(indicator, rows, rules, context, trendWindow, partner !== undefined),
          ...(partner === undefined
            ? []
            : [seriesInput(partner, partnerRows, partnerRules, context, trendWindow, true)]),
        ].sort((x, y) => order(x.key) - order(y.key))
  const counts = contextCounts([...rows, ...partnerRows])
  const contextsWithReadings = (
    Object.keys(counts) as MeasurementContext[]
  )
    .filter((key) => counts[key] > 0)
    .map((key) => strings.entry.contextLabels[key])
  const latest = rows[0] ?? null
  // The backend median covers the window the state rule uses: the last 14
  // readings in the same context (docs/API.md). Without an answer, or without
  // a baseline there, the sentence uses the same rule on the readings of this
  // device, so it names the same usual value as the indicator card.
  const answer = useIndicatorState(
    client,
    latest === null || indicator === undefined
      ? null
      : {
          personId,
          indicatorId: indicator.id,
          value: latest.value,
          context: latest.context,
          missionDay: latest.missionDay,
          time: latest.time,
        },
  )
  const comparison =
    latest === null
      ? null
      : answer !== null && answer.median !== null
        ? comparisonFromBaseline(latest, answer.median, answer.n)
        : localComparison(latest, rows, rules, indicator?.minSpread ?? 0)

  const shown = showAll ? rows : rows.slice(0, SHORT_TABLE)

  if (indicator === undefined) {
    return (
      <section aria-labelledby={headingId} className="history">
        <h2 id={headingId} className="history__heading">
          {strings.history.heading}
        </h2>
        <Notice tone="info">{strings.entry.noIndicators}</Notice>
      </section>
    )
  }

  return (
    <section aria-labelledby={headingId} className="history">
      <h2 id={headingId} className="history__heading">
        {strings.history.heading}
      </h2>

      <div className="field history__indicator">
        <label className="field__label" htmlFor={selectId}>
          {strings.history.indicator}
        </label>
        <select
          className="field__select"
          id={selectId}
          value={indicator.id}
          onChange={(event) => setChosenId(event.target.value)}
        >
          {data.indicators.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Notice tone="info">{strings.history.noEntries}</Notice>
      ) : (
        <>
          {/* The chart takes this sentence as its accessible name, so the id
              lives here and is handed down. */}
          <SummarySentence
            id={summaryId}
            comparison={comparison}
            latest={latest}
          />
          <section
            className="hc"
            aria-label={strings.history.trend.heading}
          >
            <h3 className="hc__heading">{strings.history.trend.heading}</h3>
            <TrendControls
              context={context}
              onContext={(next) => setPick({ id: indicator.id, context: next })}
              window={trendWindow}
              onWindow={setTrendWindow}
              counts={counts}
            />
            {trendInputs.every((item) => item.points.length === 0) ? (
              <div className="hc__empty">
                <p>{strings.history.trend.noneInContext}</p>
                {contextsWithReadings.length > 0 && (
                  <p className="hc__empty-hint">
                    {strings.history.trend.readingsIn(
                      contextsWithReadings.join(', '),
                    )}
                  </p>
                )}
              </div>
            ) : (
              <TrendChart
                series={trendInputs}
                name={partner === undefined ? indicator.name : strings.entry.bloodPressure}
                labelledBy={summaryId}
                drawKey={`${indicator.id}:${context}:${trendWindow}`}
              />
            )}
          </section>
          <ReadingsTable
            indicator={indicator}
            rows={rows}
            rules={rules}
            shown={shown}
            tableId={tableId}
          />
          {partner !== undefined && partnerRows.length > 0 && (
            <ReadingsTable
              indicator={partner}
              rows={partnerRows}
              rules={partnerRules}
              shown={showAll ? partnerRows : partnerRows.slice(0, SHORT_TABLE)}
              tableId={`${tableId}-partner`}
            />
          )}
          {rows.length > SHORT_TABLE && (
            <button
              type="button"
              className="history__more"
              aria-expanded={showAll}
              aria-controls={
                partner !== undefined && partnerRows.length > 0
                  ? `${tableId} ${tableId}-partner`
                  : tableId
              }
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? strings.history.showFewer
                : strings.history.showAll(rows.length)}
            </button>
          )}
        </>
      )}
    </section>
  )
}

// The short version of the table, with the id the chart points its
// `aria-labelledby` at. The id comes from the screen, so the sentence and the
// chart cannot drift apart; it is repeated as a data attribute for tests and
// for anything that looks the sentence up in the DOM.
function SummarySentence({
  id,
  comparison,
  latest,
}: {
  id: string
  comparison: HistoryComparison | null
  latest: Entry | null
}) {
  return (
    <p className="history__summary" id={id} data-summary-id={id}>
      {comparison !== null
        ? summarySentence(comparison)
        : latest === null
          ? strings.history.notEnough
          : strings.history.latestOnly({
              value: String(latest.value),
              unit: strings.cardUnit(latest.unit),
              day: latest.missionDay,
              time: latest.time,
            })}
    </p>
  )
}

// The card's own baseline on this device: the last readings in the context of
// the latest one. Null while there are too few of them.
function localComparison(
  latest: Entry,
  rows: Entry[],
  rules: AttentionRule[],
  minSpread: number,
): HistoryComparison | null {
  const local = localState(latest, rows, rules, minSpread)
  return local.median === null
    ? null
    : comparisonFromBaseline(latest, local.median, local.n)
}

function summarySentence(comparison: HistoryComparison): string {
  const { latest } = comparison
  const unit = strings.cardUnit(latest.unit)
  return strings.history.summary({
    value: String(latest.value),
    unit,
    day: latest.missionDay,
    time: latest.time,
    context: strings.trend.contextPhrase[latest.context],
    median: String(comparison.earlierMedian),
    count: comparison.earlierCount,
    difference: strings.history.signed(comparison.difference),
  })
}

// The blood pressure pair: the other half of the chosen indicator, when the
// content has it.
function partnerOf(data: LoadedContent, indicator: Indicator): Indicator | undefined {
  const id = bloodPressurePartner(indicator.id)
  return id === null ? undefined : data.indicators.find((item) => item.id === id)
}

// Systolic is drawn first, whichever of the two the person chose.
function order(indicatorId: string): number {
  return indicatorId === 'bp_dia_mmhg' ? 1 : 0
}

function seriesInput(
  indicator: Indicator,
  rows: Entry[],
  rules: AttentionRule[],
  context: MeasurementContext,
  window: TrendWindow,
  named: boolean,
): TrendSeriesInput {
  return {
    key: indicator.id,
    label: !named
      ? null
      : indicator.id === 'bp_dia_mmhg'
        ? strings.entry.diastolic
        : indicator.id === 'bp_sys_mmhg'
          ? strings.entry.systolic
          : indicator.name,
    shortLabel: !named
      ? undefined
      : indicator.id === 'bp_dia_mmhg'
        ? strings.history.trend.diastolicShort
        : indicator.id === 'bp_sys_mmhg'
          ? strings.history.trend.systolicShort
          : undefined,
    unit: indicator.unit,
    rules,
    points: trendSeries(rows, context, window).map((entry) => ({
      entry,
      // Every reading is judged against the earlier ones, the same rule as the
      // table row and the card.
      status: rowStatus(entry, rows, rules, indicator.minSpread),
    })),
    band: trendBand(rows, context, rules, indicator.minSpread),
  }
}

// The table of one indicator: the full text of the numbers the chart draws.
// A scroll box needs a keyboard stop and a name, so a keyboard user can reach
// the columns that do not fit on a narrow screen.
function ReadingsTable({
  indicator,
  rows,
  rules,
  shown,
  tableId,
}: {
  indicator: Indicator
  rows: Entry[]
  rules: AttentionRule[]
  shown: Entry[]
  tableId: string
}) {
  return (
          <div
            className="history__table-wrap"
            role="region"
            tabIndex={0}
            aria-label={strings.history.tableRegion(indicator.name)}
          >
            <table className="history__table" id={tableId}>
              <caption className="history__caption">
                {strings.history.tableCaption(indicator.name)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{strings.history.columns.day}</th>
                  <th scope="col">{strings.history.columns.time}</th>
                  <th scope="col">{strings.history.columns.context}</th>
                  <th scope="col">{strings.history.columns.value}</th>
                  <th scope="col">{strings.history.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((entry) => {
                  const status = rowStatus(
                    entry,
                    rows,
                    rules,
                    indicator.minSpread,
                  )
                  return (
                    <tr key={entry.id}>
                      <td>{entry.missionDay}</td>
                      <td>{entry.time}</td>
                      <td>{strings.entry.contextLabels[entry.context]}</td>
                      <td className="history__value">
                        {entry.value}{' '}
                        <span className="history__unit">
                          {strings.cardUnit(entry.unit)}
                        </span>
                      </td>
                      <td>
                        <span className="history__status">
                          <StatusIcon kind={statusBadgeKind(status)} size={16} />
                          {statusText(status)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
  )
}
