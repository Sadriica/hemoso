import type {
  AttentionRule,
  Indicator,
  IndicatorContent,
  Source,
} from '../domain/types'
import SourceList from './SourceList'
import { hazardName, strings } from '../strings'

// Rows below the line first, then rows above it, each by threshold.
function orderRules(rules: AttentionRule[]): AttentionRule[] {
  return [...rules].sort((a, b) =>
    a.side === b.side
      ? a.threshold - b.threshold
      : a.side === 'below'
        ? -1
        : 1,
  )
}

// The panel behind "Details" on a Home card (T-47, REQ-01). It starts with
// what data/indicators.csv says about the indicator, because that file exists
// before any text does, then shows the sections of config/content/<id>.md.
// A section with no text is left out, never a blank heading.
export default function IndicatorDetails({
  indicator,
  content,
  sources,
  rules = [],
}: {
  indicator: Indicator
  content: IndicatorContent | undefined
  sources: Source[]
  // The rows of rules/attention.csv for this indicator (question 4).
  rules?: AttentionRule[]
}) {
  // A hazard with no plain name is a content problem (src/content/indicators
  // reports it), so it is dropped here instead of being written as an id.
  const hazards = indicator.hazards
    .map((id) => hazardName(id))
    .filter((name): name is string => name !== null)

  return (
    <div className="indicator-details">
      <p className="indicator-details__fact">
        <span className="indicator-details__label">
          {strings.details.measuredOnBoard}
        </span>{' '}
        {indicator.measuredOnBoard}
      </p>
      {hazards.length > 0 && (
        <p className="indicator-details__fact">
          <span className="indicator-details__label">
            {strings.details.hazards}
          </span>{' '}
          {hazards.join(', ')}
        </p>
      )}
      {content === undefined ? (
        <>
          <p className="indicator-details__missing">
            {strings.details.missing}
          </p>
          <AttentionSection rules={rules} unit={indicator.unit} />
        </>
      ) : (
        <ContentSections content={content} rules={rules} unit={indicator.unit} />
      )}
      <section className="indicator-details__section">
        <h4 className="indicator-details__heading">{strings.sources.label}</h4>
        <SourceList sources={sources} />
      </section>
    </div>
  )
}

// The text sections of one indicator, in the order of FORMATS.md section 3.
// "Status and next steps" stays on the card itself, so it is not repeated here.
function ContentSections({
  content,
  rules,
  unit,
}: {
  content: IndicatorContent
  rules: AttentionRule[]
  unit: string
}) {
  return (
    <>
      <TextSection
        heading={strings.details.sections.why}
        text={content.whyItMatters}
      />
      <TextSection
        heading={strings.details.sections.spaceflight}
        text={content.howSpaceflightAffectsIt}
      />
      <AttentionSection rules={rules} unit={unit} />
      {content.measurementSteps.length > 0 && (
        <section className="indicator-details__section">
          <h4 className="indicator-details__heading">
            {strings.details.sections.steps}
          </h4>
          <ol className="indicator-details__steps">
            {content.measurementSteps.map((step, index) => (
              // The steps of a file keep their order and can repeat words, so
              // the position is the key.
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      )}
      <TextSection
        heading={strings.details.sections.prevent}
        text={content.howToPrevent}
      />
    </>
  )
}

function TextSection({ heading, text }: { heading: string; text: string }) {
  if (text.trim() === '') return null

  return (
    <section className="indicator-details__section">
      <h4 className="indicator-details__heading">{heading}</h4>
      <p>{text}</p>
    </section>
  )
}

// Question 4: when a result needs attention, one line per row of
// attention.csv, each with its source or the word Assumption.
function AttentionSection({
  rules,
  unit,
}: {
  rules: AttentionRule[]
  unit: string
}) {
  if (rules.length === 0) return null

  return (
    <section className="indicator-details__section">
      <h4 className="indicator-details__heading">
        {strings.details.sections.attention}
      </h4>
      <ul className="indicator-details__rules">
        {orderRules(rules).map((rule) => (
          <li key={`${rule.side}-${rule.threshold}`}>
            {strings.details.rule(
              strings.details.ruleSide[rule.side],
              `${rule.threshold} ${strings.cardUnit(unit)}`,
              rule.attentionLevel,
            )}{' '}
            {strings.whoActs[rule.notify]}
            <SourceList sources={rule.sources} />
          </li>
        ))}
      </ul>
    </section>
  )
}
