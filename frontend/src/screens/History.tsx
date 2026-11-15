import { useId, useState } from 'react'
import { attentionFor } from '../domain/attention'
import {
  compareToOwnHistory,
  comparisonFromBaseline,
  newestFirst,
  type HistoryComparison,
} from '../domain/entries'
import type { LoadedContent } from '../content/load'
import { createStateClient } from '../data/stateClient'
import type { EntryStore } from '../data/entryStore'
import { useEntries } from '../hooks/useEntries'
import { useIndicatorState } from '../hooks/useIndicatorState'
import { attentionText } from '../components/attentionText'
import IndicatorChart from '../components/IndicatorChart'
import Notice from '../components/Notice'
import { strings } from '../strings'

// One indicator against the person's own earlier readings (REQ-12): a sentence
// with the latest value, the median of the earlier ones and the difference, a
// chart of the same numbers and a table with every reading newest first. The
// status of each reading comes from the same attention rules as Home, and is
// written in words, never a colour on its own (REQ-15).
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
        },
  )
  const comparison =
    latest === null
      ? null
      : answer !== null && answer.median !== null
        ? comparisonFromBaseline(latest, answer.median, answer.n)
        : compareToOwnHistory(rows)

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
          <SummarySentence id={summaryId} comparison={comparison} />
          <IndicatorChart
            entries={rows}
            unit={indicator.unit}
            rules={rules}
            comparison={comparison}
            labelledBy={summaryId}
          />
          <div className="history__table-wrap">
            <table className="history__table">
              <caption className="history__caption">
                {strings.history.tableCaption(indicator.name)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{strings.history.columns.day}</th>
                  <th scope="col">{strings.history.columns.time}</th>
                  <th scope="col">{strings.history.columns.value}</th>
                  <th scope="col">{strings.history.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.missionDay}</td>
                    <td>{entry.time}</td>
                    <td className="history__value">
                      {entry.value}{' '}
                      <span className="history__unit">
                        {strings.cardUnit(entry.unit)}
                      </span>
                    </td>
                    <td>{attentionText(attentionFor(entry.value, rules))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
}: {
  id: string
  comparison: HistoryComparison | null
}) {
  return (
    <p className="history__summary" id={id} data-summary-id={id}>
      {comparison === null
        ? strings.history.notEnough
        : summarySentence(comparison)}
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
