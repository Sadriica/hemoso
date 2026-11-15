import { useEffect, useId, useMemo, useState } from 'react'
import {
  orderConditions,
  scoreConditions,
  type Condition,
  type IndicatorSignal,
} from '../../domain/conditions'
import type {
  AttentionRule,
  ConditionRule,
  Entry,
  Indicator,
} from '../../domain/types'
import type { SymptomDef, SymptomReport } from '../../domain/symptoms'
import {
  createConditionsClient,
  type ConditionsClient,
} from '../../data/conditionsClient'
import { StatusIcon } from '../../icons'
import type { StatusKind } from '../../icons/meta'
import { strings } from '../../strings'
import Disclosure from '../Disclosure'
import { usePhone } from '../../hooks/usePhone'
import { agreementOf, orderUrgent, reportedRedFlags } from './urgentBoard'
import './conditions.css'

// The possible conditions of config/rules/conditions.csv (REQ-06). Each row is
// an evidence score from 0 to 1 with a three-step label, the readings behind
// it and its source. It says what the readings point to, never that the person
// has anything: no percentage, and the CMO or the flight surgeon confirms.
//
// The score is computed on this device from the stored readings, so the panel
// works with no server. When the conditions route answers and speaks about the
// same readings, its answer is shown instead: the rule is the same, and the
// server is the copy the ground reads.

export interface PossibleConditionsProps {
  personId: string
  /** The rows of conditions.csv; with none the panel is not shown. */
  conditions: ConditionRule[]
  indicators: Indicator[]
  rules: AttentionRule[]
  /** Every stored entry; only this person's count. */
  entries: Entry[]
  /** config/data/symptoms.csv; with none the symptom layer is off. */
  symptoms?: SymptomDef[]
  /** This person's symptom reports, any day; the newest day counts. */
  symptomReports?: SymptomReport[]
  /** Opens the card of an indicator, the same selection the overview uses. */
  onSelectIndicator?: (indicatorId: string) => void
  /** A test passes a fake; the screen builds the HTTP client. */
  client?: ConditionsClient
}

// The state icon that goes with each step, so the step is a shape and a word
// as well as a colour.
const ICON: Record<Condition['label'], StatusKind> = {
  urgent: 'review',
  review: 'review',
  possible: 'outside',
  low: 'in_range',
  no_data: 'no_data',
}

export default function PossibleConditions({
  personId,
  conditions,
  indicators,
  rules,
  entries,
  symptoms,
  symptomReports,
  onSelectIndicator,
  client,
}: PossibleConditionsProps) {
  const copy = strings.conditions
  const headingId = useId()
  const urgentId = useId()
  const phone = usePhone()
  const [http] = useState(() => client ?? createConditionsClient())
  // The server's answer and the person it belongs to: a new person never reads
  // the previous one's answer while their own request is in flight.
  const [answer, setAnswer] = useState<{
    personId: string
    list: Condition[]
  } | null>(null)

  const local = useMemo(
    () =>
      scoreConditions(
        conditions,
        entries.filter((entry) => entry.personId === personId),
        indicators,
        rules,
        { defs: symptoms ?? [], reports: symptomReports ?? [] },
      ),
    [conditions, entries, personId, indicators, rules, symptoms, symptomReports],
  )

  // Asked again when the readings change, so a new reading is scored by the
  // server as soon as it has it.
  const readingCount = entries.length
  useEffect(() => {
    if (!http.isConfigured()) return
    let alive = true
    void http.fetchConditions(personId).then((list) => {
      if (alive && list !== null) setAnswer({ personId, list })
    })
    return () => {
      alive = false
    }
  }, [http, personId, readingCount])

  if (conditions.length === 0) return null

  const shown =
    answer !== null &&
    answer.personId === personId &&
    sameReadings(answer.list, local)
      ? answer.list
      : local
  const ordered = orderConditions(shown)
  const urgentRows = orderUrgent(ordered)
  const others = ordered.filter((condition) => condition.label !== 'urgent')
  const scored = others.filter((condition) => condition.label !== 'no_data')
  const waiting = others.filter((condition) => condition.label === 'no_data')
  // On a phone only what needs action stays open; the quieter groups wait
  // behind one line with their count.
  const open = phone
    ? scored.filter((condition) => condition.label === 'review')
    : scored
  const folded = phone
    ? [
        ...scored.filter((condition) => condition.label !== 'review'),
        ...waiting,
      ]
    : waiting
  const needsAction =
    urgentRows.length > 0 || scored.some((item) => item.label === 'review')
  const nameOf = (indicatorId: string): string =>
    indicators.find((item) => item.id === indicatorId)?.name ?? indicatorId
  const symptomName = (symptomId: string): string =>
    (symptoms ?? []).find((item) => item.id === symptomId)?.name ?? symptomId

  const flagged = reportedRedFlags(urgentRows, symptoms ?? [])
  const row = (condition: Condition) => (
    <ConditionRow
      key={condition.id}
      condition={condition}
      quiet={condition.label === 'urgent' && agreementOf(condition) === 2}
      nameOf={nameOf}
      symptomName={symptomName}
      onSelectIndicator={onSelectIndicator}
    />
  )

  return (
    <section className="conditions panel" aria-labelledby={headingId}>
      <p className="conditions__eyebrow">{copy.eyebrow}</p>
      <h2 id={headingId} className="conditions__heading">
        {copy.heading}
      </h2>
      <p className="conditions__intro">{copy.intro}</p>
      {urgentRows.length > 0 && (
        <div className="conditions__urgent-block" aria-labelledby={urgentId} role="group">
          <h3 id={urgentId} className="conditions__urgent-heading">
            <StatusIcon kind="review" size={20} />
            <span>{copy.urgentHeading}</span>
          </h3>
          <p className="conditions__urgent-action">{copy.sentence.urgent}</p>
          {flagged.length > 0 && (
            <p className="conditions__urgent-why">
              {strings.symptoms.callCmoWhy(flagged.join(', '))}
            </p>
          )}
          <p className="conditions__overlap">{copy.overlap}</p>
        </div>
      )}
      {urgentRows.length > 0 && (
        <ul className="conditions__list conditions__list--urgent">
          {urgentRows.map(row)}
        </ul>
      )}
      {open.length > 0 && <ul className="conditions__list">{open.map(row)}</ul>}
      {folded.length > 0 && (
        <Disclosure
          label={phone ? copy.showMore(folded.length) : copy.notEnough(folded.length)}
        >
          <ul className="conditions__list">{folded.map(row)}</ul>
        </Disclosure>
      )}
      {phone && needsAction && (
        <p className="urgent-bar" role="note">
          <StatusIcon kind="review" size={20} />
          <span>
            {urgentRows.length > 0 ? copy.sentence.urgent : copy.sentence.review}
          </span>
        </p>
      )}
      <p className="conditions__confirms">{copy.confirms}</p>
    </section>
  )
}

// The server speaks about the same readings as this device when every signal
// carries the same newest value. A reading still waiting in the outbox makes
// the two differ, and then the local score is the one that is up to date.
function sameReadings(remote: Condition[], local: Condition[]): boolean {
  if (remote.length !== local.length) return false
  return local.every((mine) => {
    const theirs = remote.find((item) => item.id === mine.id)
    if (theirs === undefined || theirs.signals.length !== mine.signals.length) {
      return false
    }
    if (mine.label === 'urgent' !== (theirs.label === 'urgent')) return false
    return mine.signals.every((signal, index) => {
      const other = theirs.signals[index]
      if (signal.kind === 'symptom') {
        // A report still waiting in the outbox is not on the server yet.
        return (
          other.kind === 'symptom' &&
          other.symptomId === signal.symptomId &&
          (other.contribution === null) === (signal.contribution === null)
        )
      }
      return (
        other.kind !== 'symptom' &&
        other.indicatorId === signal.indicatorId &&
        other.value === signal.value
      )
    })
  })
}

// The link text of a source: the site it is on. The path is left out on
// purpose: a path can carry words this panel never says about a person.
function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return strings.conditions.source
  }
}

/** The score as the panel writes it: two decimals at most, no trailing zero. */
function scoreText(score: number): string {
  return String(Number(score.toFixed(2)))
}

function ConditionRow({
  condition,
  quiet = false,
  nameOf,
  symptomName,
  onSelectIndicator,
}: {
  condition: Condition
  /** An urgent row whose measured readings go the other way. */
  quiet?: boolean
  nameOf: (indicatorId: string) => string
  symptomName: (symptomId: string) => string
  onSelectIndicator?: (indicatorId: string) => void
}) {
  const copy = strings.conditions
  const label = copy.label[condition.label]
  const urgent = condition.label === 'urgent'
  // "Call your CMO now" comes before any score: an urgent row shows no bar.
  const text =
    condition.score === null || urgent ? null : scoreText(condition.score)

  return (
    <li
      className={`condition condition--${condition.label}${quiet ? ' condition--quiet' : ''}`}
    >
      {urgent && !quiet && (
        <p className="condition__urgent">{copy.sentence.urgent}</p>
      )}
      <div className="condition__head">
        <h3 className="condition__name">{condition.name}</h3>
        <p className="condition__label">
          <StatusIcon kind={ICON[condition.label]} size={16} />
          <span>{label}</span>
        </p>
      </div>
      {condition.score !== null && text !== null && (
        <div className="condition__evidence">
          <div
            className="condition__meter"
            role="meter"
            aria-label={copy.meterName(condition.name)}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={condition.score}
            aria-valuetext={copy.evidenceSpoken(text, label)}
          >
            <span
              className="condition__fill"
              style={{ transform: `scaleX(${condition.score})` }}
            />
          </div>
          <p className="condition__score">{copy.evidence(text)}</p>
        </div>
      )}
      {quiet && <p className="condition__sentence">{copy.bySymptom}</p>}
      {!urgent && (
        <p className="condition__sentence">{copy.sentence[condition.label]}</p>
      )}
      <ul
        className="condition__signals"
        aria-label={copy.signalsLabel(condition.name)}
      >
        {condition.signals.map((signal) =>
          signal.kind === 'symptom' ? (
            <li key={`symptom:${signal.symptomId}`}>
              <span
                className={`condition__signal${(signal.contribution ?? 0) > 0 ? ' condition__signal--pointing' : ''}`}
              >
                <span className="condition__arrow" aria-hidden="true">
                  {(signal.contribution ?? 0) > 0 ? '↑' : '·'}
                </span>
                <span>
                  {signal.contribution === null
                    ? copy.symptom.notReported(symptomName(signal.symptomId))
                    : copy.symptom.reported(symptomName(signal.symptomId))}
                </span>
              </span>
            </li>
          ) : (
            <li key={`${signal.indicatorId}:${signal.side ?? ''}`}>
              <SignalChip
                signal={signal}
                text={signalText(signal, nameOf(signal.indicatorId))}
                onSelectIndicator={onSelectIndicator}
              />
            </li>
          ),
        )}
      </ul>
      <p className="condition__source">
        {copy.source}{' '}
        {/^https?:\/\//.test(condition.source) ? (
          <a
            href={condition.source}
            title={condition.source}
            target="_blank"
            rel="noreferrer noopener"
          >
            {sourceHost(condition.source)}
          </a>
        ) : (
          <span className="sources__assumption">{strings.sources.assumption}</span>
        )}
      </p>
    </li>
  )
}

// What the newest reading of one signal says about the condition, in words.
function signalText(signal: IndicatorSignal, name: string): string {
  const copy = strings.conditions
  if (signal.value === null) return copy.signal.noReading(name)
  if (signal.side === null || signal.contribution === null) {
    return copy.signal.notComparable(name)
  }
  const side = copy.side[signal.side]
  if (signal.contribution >= 1) return copy.signal.limit(name, side)
  if (signal.contribution > 0) return copy.signal.outside(name, side)
  return copy.signal.inside(name, side)
}

// One signal. With a way to open the card it is a button; a reading that
// points at the condition is marked by an arrow and a stronger edge, not by
// colour alone.
function SignalChip({
  signal,
  text,
  onSelectIndicator,
}: {
  signal: IndicatorSignal
  text: string
  onSelectIndicator?: (indicatorId: string) => void
}) {
  const pointing = (signal.contribution ?? 0) > 0
  const className = `condition__signal${pointing ? ' condition__signal--pointing' : ''}`
  const content = (
    <>
      <span className="condition__arrow" aria-hidden="true">
        {pointing ? (signal.side === 'below' ? '↓' : '↑') : '·'}
      </span>
      <span>{text}</span>
    </>
  )
  if (onSelectIndicator === undefined) {
    return <span className={className}>{content}</span>
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={strings.conditions.openCard(text)}
      onClick={() => onSelectIndicator(signal.indicatorId)}
    >
      {content}
    </button>
  )
}
