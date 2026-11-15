import type { TrendPointInput, TrendSeriesInput } from './TrendChart'
import { statusText } from './attentionText'
import { strings } from '../strings'

// The words of the readout for one reading: value with its unit, Flight Day,
// GMT time, context and state in words. Kept apart from the chart so a test
// can read the sentence without drawing anything.
export function readoutText(
  series: Pick<TrendSeriesInput, 'label'>,
  point: TrendPointInput,
): string {
  const { entry } = point
  return strings.history.trend.readout({
    series: series.label,
    value: String(entry.value),
    unit: strings.cardUnit(entry.unit),
    day: entry.missionDay,
    time: entry.time,
    context: strings.entry.contextLabels[entry.context],
    state: statusText(point.status),
  })
}
