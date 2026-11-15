import { useId } from 'react'
import { TREND_CONTEXTS, type TrendWindow } from '../domain/trend'
import type { MeasurementContext } from '../domain/types'
import { strings } from '../strings'

// The two segmented controls over the trend chart: the context of the
// readings (the NASA labels of the Entry screen) and how many of them to draw.
// Real radio buttons in a fieldset, so the arrow keys, the group name and the
// checked state come from the browser and are read the same way by a screen
// reader; the segments are only their look.
export default function TrendControls({
  context,
  onContext,
  window,
  onWindow,
  counts,
}: {
  context: MeasurementContext
  onContext: (context: MeasurementContext) => void
  window: TrendWindow
  onWindow: (window: TrendWindow) => void
  // Readings per context, so a segment can say it is empty without hiding.
  counts: Record<MeasurementContext, number>
}) {
  const name = useId()
  const windowName = useId()
  const words = strings.history.trend

  return (
    <div className="hc-controls">
      <fieldset className="hc-seg hc-seg--context">
        <legend className="hc-seg__legend">{words.contextLegend}</legend>
        <div className="hc-seg__row">
          {TREND_CONTEXTS.map((item) => (
            <label
              key={item}
              className={`hc-seg__item${counts[item] === 0 ? ' hc-seg__item--empty' : ''}`}
            >
              <input
                type="radio"
                name={name}
                value={item}
                checked={context === item}
                onChange={() => onContext(item)}
              />
              <span>{strings.entry.contextLabels[item]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="hc-seg hc-seg--window">
        <legend className="hc-seg__legend">{words.windowLegend}</legend>
        <div className="hc-seg__row">
          {(['last14', 'all'] as const).map((item) => (
            <label key={item} className="hc-seg__item">
              <input
                type="radio"
                name={windowName}
                value={item}
                checked={window === item}
                onChange={() => onWindow(item)}
              />
              <span>{item === 'last14' ? words.last14 : words.all}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
