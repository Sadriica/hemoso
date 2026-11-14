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
import type { LoadedContent } from '../content/load'
import { strings } from '../strings'

// One screen: the status of each indicator and a clear next step (REQ-01).
export default function Home({
  personId,
  data,
}: {
  personId: string
  data: LoadedContent
}) {
  const entries = data.demoEntries.filter((entry) => entry.personId === personId)

  return (
    <section aria-labelledby="home-heading">
      <h2 id="home-heading" className="home-heading">
        {strings.personHeading(personId)}
      </h2>
      {data.usingPlaceholders && (
        <p className="app-note">{strings.placeholderNotice}</p>
      )}
      {data.problems.length > 0 && (
        <Disclosure label={strings.problems.label}>
          <ul className="problems__list">
            {data.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Disclosure>
      )}
      <ul className="indicator-list">
        {data.indicators.map((indicator) => (
          <IndicatorRow
            key={indicator.id}
            indicator={indicator}
            entries={entries.filter(
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
    <li className="indicator-row">
      <div className="indicator-row__header">
        <span className="indicator-row__name">{indicator.name}</span>
        {latest && (
          <span className="indicator-row__reading">
            <span className="indicator-row__value">
              {latest.value} {indicator.unit}
            </span>
            <span className="indicator-row__time">
              {strings.timeLabel(latest.missionDay, latest.time)}
            </span>
          </span>
        )}
        <AttentionBadge attention={attention} />
      </div>
      <p className="indicator-row__next-step">
        {nextStepFor(attention, content)}
      </p>
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
    </li>
  )
}

function nextStepFor(
  attention: Attention,
  content: IndicatorContent | undefined,
): string {
  if (attention.kind === 'in_range') return strings.nextStep.inRange
  if (attention.kind === 'no_data') return strings.nextStep.noData
  return content?.statusAndNextSteps[attention.level] ?? strings.nextStep.missing
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
