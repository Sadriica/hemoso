import { attentionFor } from '../domain/attention'
import { latestEntry } from '../domain/entries'
import type {
  Attention,
  AttentionRule,
  Entry,
  Indicator,
  IndicatorContent,
  Source,
} from '../domain/types'
import AttentionBadge from '../components/AttentionBadge'
import Disclosure from '../components/Disclosure'
import Notice from '../components/Notice'
import type { LoadedContent } from '../content/load'
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
  indicator,
  entries,
  rules,
  content,
}: {
  indicator: Indicator
  entries: Entry[]
  rules: AttentionRule[]
  content: IndicatorContent | undefined
}) {
  const latest = latestEntry(entries)
  const attention: Attention = latest
    ? attentionFor(latest.value, rules)
    : { kind: 'no_data' }
  const sources = sourcesFor(indicator, attention, content)

  return (
    <li className={`indicator-card indicator-card--${attention.kind}`}>
      <div className="indicator-card__top">
        <h3 className="indicator-card__name">{indicator.name}</h3>
        <AttentionBadge attention={attention} />
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
        {nextStepFor(attention, content)}
      </p>
      <div className="indicator-card__actions">
        <Disclosure label={strings.sources.label}>
          {sources.length === 0 ? (
            <p className="sources__empty">{strings.sources.empty}</p>
          ) : (
            <ul className="sources__list">
              {sources.map((source) => (
                <li key={source === 'Assumption' ? 'Assumption' : source.url}>
                  {source === 'Assumption' ? (
                    <span>{strings.sources.assumption}</span>
                  ) : (
                    <a href={source.url} rel="noreferrer">
                      {source.title}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
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
