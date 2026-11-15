import { useId, useState } from 'react'
import {
  compareToOwnHistory,
  comparisonFromBaseline,
  newestFirst,
  type HistoryComparison,
} from '../domain/entries'
import type { LoadedContent } from '../content/load'
import { createStateClient } from '../data/stateClient'
import type { Entry } from '../domain/types'
import type { EntryStore } from '../data/entryStore'
import { useEntries } from '../hooks/useEntries'
import { useIndicatorState } from '../hooks/useIndicatorState'
import { statusBadgeKind, statusText } from '../components/attentionText'
import { StatusIcon } from '../icons'
import { rowStatus } from './historyRows'
import IndicatorChart from '../components/IndicatorChart'
import Notice from '../components/Notice'
import { strings } from '../strings'

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
}: {
  store: EntryStore
  personId: string
  data: LoadedContent
}) {
  const entries = useEntries(store)
  const [chosenId, setChosenId] = useState(data.indicators[0]?.id ?? '')
  // Built once from VITE_API_BASE_URL. Empty is the public demo: the sentence
  // compares the readings of this device.
  const [client] = useState(() => createStateClient())
  const headingId = useId()
  const selectId = useId()
  const summaryId = useId()
  const tableId = useId()
  const [showAll, setShowAll] = useState(false)

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
  const latest = rows[0] ?? null
  // The backend median covers the window the state rule uses: the last 14
  // readings in the same context (docs/API.md). Without an answer, or without
  // a baseline there, the sentence compares the readings of this device.
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
        : compareToOwnHistory(rows)

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
          <IndicatorChart
            entries={rows}
            unit={indicator.unit}
            rules={rules}
            comparison={comparison}
            labelledBy={summaryId}
          />
          {/* A scroll box needs a keyboard stop and a name, so a keyboard user
              can reach the columns that do not fit on a narrow screen. */}
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
          {rows.length > SHORT_TABLE && (
            <button
              type="button"
              className="history__more"
              aria-expanded={showAll}
              aria-controls={tableId}
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

function summarySentence(comparison: HistoryComparison): string {
  const { latest } = comparison
  const unit = strings.cardUnit(latest.unit)
  return strings.history.summary({
    value: String(latest.value),
    unit,
    day: latest.missionDay,
    time: latest.time,
    median: String(comparison.earlierMedian),
    count: comparison.earlierCount,
    difference: strings.history.signed(comparison.difference),
  })
}
