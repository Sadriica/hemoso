import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { statusBadgeKind, type BadgeKind } from './attentionText'
import { readoutText } from './trendText'
import {
  citedThresholds,
  flightTime,
  nearestIndex,
  stepIndex,
  type TrendBand,
} from '../domain/trend'
import type { Status } from '../domain/state'
import type { AttentionRule, Entry } from '../domain/types'
import { SCALE_UNIT, strings } from '../strings'

// One indicator over Flight Days, as a telemetry trace (REQ-15, REQ-27): the
// person's readings as marks joined by a line, their usual band as a soft
// strip, and the attention thresholds that have a link as a source as thin
// labelled lines. A mark carries its state in its shape as well as its colour.
// Two series (blood pressure) share one chart and tell apart by shape family
// and by line.
//
// The table under the chart in the History screen holds every number, so the
// chart is never the only place a value is written. A hover, a tap or the
// arrow keys put one reading in the readout above the plot; the readout sits
// outside the drawing, so it never covers a point.
//
// Motion is CSS only (history-console.css): the line draws and the series
// rises on mount and on a filter change, and it all stops under reduced
// motion, with the app switch and while the tab is hidden.

export interface TrendPointInput {
  entry: Entry
  status: Status
}

export interface TrendSeriesInput {
  key: string
  // The series name shown beside a value; null when the chart has one series.
  label: string | null
  // A short form of the name for the threshold labels, where room is tight.
  shortLabel?: string
  unit: string
  rules: AttentionRule[]
  // Oldest first.
  points: TrendPointInput[]
  band: TrendBand | null
}

const DEFAULT_WIDTH = 480
const MIN_WIDTH = 240
const HEIGHT = 260
const PADDING = { top: 26, right: 14, bottom: 40, left: 50 }
const INSET = 8
const Y_TICKS = 4
const LABEL_GAP = 13
const LABEL_MIN_GAP = 44

interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

type Family = 'a' | 'b'
type Active = { series: string; id: string } | null

// The four marks of a family, one per state: family A is round, family B is
// square-based, so two series never share a shape in any state.
const MARK_SIZE = 5.5

export default function TrendChart({
  series,
  name,
  labelledBy,
  drawKey,
}: {
  series: TrendSeriesInput[]
  name: string
  // The History summary sentence: the group is described by it.
  labelledBy: string
  // Changes with the context, the window and the indicator, so the figure
  // draws again.
  drawKey: string
}) {
  const figureRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [active, setActive] = useState<Active>(null)
  const [hidden, setHidden] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  )
  const hintId = useId()
  const readoutId = useId()

  useLayoutEffect(() => {
    const node = figureRef.current
    if (node === null) return
    const measure = (): void => {
      const style = getComputedStyle(node)
      const padding =
        (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0)
      const inner = node.clientWidth - padding
      if (inner > 0) setWidth(Math.max(MIN_WIDTH, Math.round(inner)))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // No animation while the tab is hidden: the CSS pauses it with this class.
  useEffect(() => {
    const onVisibility = (): void =>
      setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const plot: Plot = {
    left: PADDING.left,
    right: width - PADDING.right,
    top: PADDING.top,
    bottom: HEIGHT - PADDING.bottom,
  }
  const model = buildModel(series, plot)

  // The selected reading, if it is still on the chart.
  const activeSeries = series.find((item) => item.key === active?.series)
  const activeIndex =
    activeSeries === undefined
      ? -1
      : activeSeries.points.findIndex((p) => p.entry.id === active?.id)
  const activePoint =
    activeSeries !== undefined && activeIndex >= 0
      ? activeSeries.points[activeIndex]
      : null

  const select = (seriesKey: string, id: string): void =>
    setActive({ series: seriesKey, id })

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const key = event.key
    const horizontal =
      key === 'ArrowLeft' ||
      key === 'ArrowRight' ||
      key === 'Home' ||
      key === 'End'
    const vertical = key === 'ArrowUp' || key === 'ArrowDown'
    if (key === 'Escape') {
      setActive(null)
      return
    }
    if (!horizontal && !vertical) return
    event.preventDefault()
    const current = activeSeries ?? series[0]
    if (current === undefined || current.points.length === 0) return
    if (activePoint === null) {
      // First key press: land on the newest reading of the first series.
      const last = current.points[current.points.length - 1]
      select(current.key, last.entry.id)
      return
    }
    if (horizontal) {
      const next = stepIndex(activeIndex, current.points.length, key)
      select(current.key, current.points[next].entry.id)
      return
    }
    // Up and down move to the other series of a pair, at the nearest time.
    if (series.length < 2) return
    const here = series.indexOf(current)
    const other =
      series[(here + (key === 'ArrowDown' ? 1 : series.length - 1)) % series.length]
    if (other.points.length === 0) return
    const nearest = nearestIndex(
      other.points.map((p) => flightTime(p.entry)),
      flightTime(activePoint.entry),
    )
    select(other.key, other.points[nearest].entry.id)
  }

  const states = legendStates(series)
  const hasPair = series.length > 1
  const empty = model.points.length === 0
  const readout =
    activePoint === null || activeSeries === undefined
      ? null
      : readoutText(activeSeries, activePoint)

  const first = series[0]
  const newestPoint =
    first === undefined ? undefined : first.points[first.points.length - 1]
  const newest =
    first === undefined || newestPoint === undefined
      ? null
      : readoutText(first, newestPoint)

  return (
    <div
      className={`tc${hidden ? ' tc--hidden' : ''}`}
      data-draw={drawKey}
      ref={figureRef}
    >
      {/* The visible readout is hidden from the accessibility tree; the group
          still points at it as its description. What a screen reader hears
          when the person moves is the hidden live line below, which only
          holds a reading that was picked, so opening the panel or changing a
          filter announces nothing. */}
      <p className="tc__readout" id={readoutId} aria-hidden="true">
        {readout === null ? (
          newest === null ? (
            <span className="tc__readout-idle">
              {strings.history.trend.pickReading}
            </span>
          ) : (
            // Nothing selected yet: the newest reading, named as such, so the
            // block always holds real values.
            <>
              <span className="tc__readout-main">{newest}</span>
              <span className="tc__readout-count">
                {strings.history.trend.newest}
              </span>
            </>
          )
        ) : (
          <>
            <span className="tc__readout-main">{readout}</span>
            <span className="tc__readout-count">
              {strings.history.trend.point({
                index: activeIndex + 1,
                count: activeSeries?.points.length ?? 0,
              })}
            </span>
          </>
        )}
      </p>

      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {readout === null || activeSeries === undefined
          ? ''
          : `${readout}. ${strings.history.trend.point({
              index: activeIndex + 1,
              count: activeSeries.points.length,
            })}`}
      </span>

      <div
        className="tc__focus"
        role="group"
        tabIndex={empty ? -1 : 0}
        aria-label={strings.history.trend.chartName(name)}
        aria-describedby={`${labelledBy} ${hintId} ${readoutId}`}
        onKeyDown={onKeyDown}
      >
        <svg
          className="tc__svg"
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          focusable="false"
        >
          {model.yTicks.map((tick) => (
            <g key={tick.key}>
              <line
                className="tc__grid"
                x1={plot.left}
                x2={plot.right}
                y1={tick.position}
                y2={tick.position}
              />
              <text
                className="tc__tick"
                x={plot.left - 8}
                y={tick.position + 4}
                textAnchor="end"
              >
                {tick.text}
              </text>
            </g>
          ))}
          <line
            className="tc__axis"
            x1={plot.left}
            x2={plot.left}
            y1={plot.top}
            y2={plot.bottom}
          />
          <line
            className="tc__axis"
            x1={plot.left}
            x2={plot.right}
            y1={plot.bottom}
            y2={plot.bottom}
          />
          {model.xTicks.map((tick) => (
            <g key={tick.key}>
              <line
                className="tc__axis"
                x1={tick.position}
                x2={tick.position}
                y1={plot.bottom}
                y2={plot.bottom + 4}
              />
              <text
                className="tc__tick"
                x={tick.position}
                y={plot.bottom + 18}
                textAnchor="middle"
              >
                {tick.text}
              </text>
            </g>
          ))}
          <text className="tc__unit" x={plot.left} y={PADDING.top - 12}>
            {model.unit}
          </text>
          <text className="tc__axis-name" x={plot.right} y={HEIGHT - 6} textAnchor="end">
            {strings.history.columns.day}
          </text>

          {/* The person's usual band and median, under everything else. */}
          <g key={`band:${drawKey}`} className="tc__layer">
            {model.series.map((item) =>
              item.band === null ? null : (
                <g key={item.key} className={`tc__band tc__band--${item.family}`}>
                  <rect
                    x={plot.left}
                    y={item.band.top}
                    width={plot.right - plot.left}
                    height={Math.max(1, item.band.bottom - item.band.top)}
                  />
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={item.band.medianY}
                    y2={item.band.medianY}
                    strokeDasharray="6 4"
                  />
                </g>
              ),
            )}
          </g>

          {model.thresholds.map((threshold) => (
            <g key={threshold.key}>
              <line
                className="tc__threshold"
                x1={plot.left}
                x2={plot.right}
                y1={threshold.y}
                y2={threshold.y}
                strokeDasharray="2 4"
              />
              <text
                className="tc__threshold-label"
                x={plot.right - 4}
                y={threshold.labelY}
                textAnchor="end"
              >
                {threshold.text}
              </text>
            </g>
          ))}

          {activePoint !== null && (
            <line
              className="tc__guide"
              x1={model.positionOf(activePoint.entry).x}
              x2={model.positionOf(activePoint.entry).x}
              y1={plot.top}
              y2={plot.bottom}
            />
          )}

          {model.series.map((item) => (
            <g
              key={`${item.key}:${drawKey}`}
              className={`tc__series tc__series--${item.family}`}
            >
              <polyline
                className={`tc__line tc__line--${item.family}`}
                points={item.line}
                pathLength={1}
              />
              {item.points.map((point) => {
                const isActive =
                  active?.series === item.key && active.id === point.entry.id
                return (
                  <g
                    key={point.entry.id}
                    className="tc__pt"
                    data-state={point.kind}
                    data-series={item.key}
                    data-entry={point.entry.id}
                    transform={`translate(${point.x} ${point.y})`}
                    onPointerEnter={() => select(item.key, point.entry.id)}
                    onClick={() => select(item.key, point.entry.id)}
                  >
                    <circle className="tc__hit" r={13} />
                    {isActive && <circle className="tc__ring" r={MARK_SIZE + 5} />}
                    <Mark kind={point.kind} family={item.family} />
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>

      <p className="tc__hint" id={hintId}>
        {strings.history.trend.hint}
        {hasPair ? ` ${strings.history.trend.hintPair}` : ''}
      </p>

      <ul className="tc__legend" aria-label={strings.history.trend.markLegend}>
        {series.map((item, index) =>
          states.map((kind) => (
            <li key={`${item.key}:${kind}`} className="tc__legend-item">
              <svg viewBox="-9 -9 18 18" width={18} height={18} aria-hidden="true" focusable="false">
                <g className={`tc__pt`} data-state={kind}>
                  <Mark kind={kind} family={index === 0 ? 'a' : 'b'} />
                </g>
              </svg>
              <span>
                {item.label === null ? '' : `${item.label}: `}
                {legendWord(kind)}
              </span>
            </li>
          )),
        )}
      </ul>
      {series.some((item) => item.band === null) && (
        <p className="tc__note">{strings.history.trend.noBand}</p>
      )}
    </div>
  )
}

// The shape of one state in one family. The state colour is a class; the shape
// is what keeps the state readable without it.
function Mark({ kind, family }: { kind: BadgeKind; family: Family }) {
  const s = MARK_SIZE
  const className = `tc__mark tc__mark--${kind}`
  if (family === 'a') {
    if (kind === 'outside') {
      return <polygon className={className} points={`0,${-s - 1} ${s + 1},0 0,${s + 1} ${-s - 1},0`} />
    }
    if (kind === 'review') {
      return <polygon className={className} points={`0,${-s - 1} ${s + 1},${s} ${-s - 1},${s}`} />
    }
    return <circle className={className} r={s} />
  }
  if (kind === 'outside') {
    const a = 1.9
    const b = s + 1
    return (
      <polygon
        className={className}
        points={`${-a},${-b} ${a},${-b} ${a},${-a} ${b},${-a} ${b},${a} ${a},${a} ${a},${b} ${-a},${b} ${-a},${a} ${-b},${a} ${-b},${-a} ${-a},${-a}`}
      />
    )
  }
  if (kind === 'review') {
    return <polygon className={className} points={`0,${s + 1} ${s + 1},${-s} ${-s - 1},${-s}`} />
  }
  return <rect className={className} x={-s} y={-s} width={s * 2} height={s * 2} />
}

// The states that have a mark in this chart, in a fixed order, so the legend
// lists only what can appear.
function legendStates(series: TrendSeriesInput[]): BadgeKind[] {
  const present = new Set<BadgeKind>()
  for (const item of series) {
    for (const point of item.points) present.add(statusBadgeKind(point.status))
  }
  return (['in_range', 'outside', 'review', 'no_data'] as const).filter((kind) =>
    present.has(kind),
  )
}

function legendWord(kind: BadgeKind): string {
  if (kind === 'in_range') return strings.badge.inRange
  if (kind === 'outside') return strings.badge.outsideRange
  if (kind === 'review') return strings.badge.needsReview
  return strings.badge.noData
}

interface ModelPoint {
  entry: Entry
  kind: BadgeKind
  x: number
  y: number
}

interface ModelSeries {
  key: string
  family: Family
  points: ModelPoint[]
  line: string
  band: { top: number; bottom: number; medianY: number } | null
}

interface Tick {
  key: string
  position: number
  text: string
}

interface ThresholdLine {
  key: string
  text: string
  y: number
  labelY: number
}

interface Model {
  series: ModelSeries[]
  points: ModelPoint[]
  thresholds: ThresholdLine[]
  yTicks: Tick[]
  xTicks: Tick[]
  unit: string
  positionOf: (entry: Entry) => { x: number; y: number }
}

function buildModel(series: TrendSeriesInput[], plot: Plot): Model {
  const cited = series.flatMap((item) =>
    citedThresholds(item.rules).map((rule) => ({ item, rule })),
  )
  const marks: number[] = [
    ...series.flatMap((item) => item.points.map((p) => p.entry.value)),
    ...cited.map(({ rule }) => rule.threshold),
  ]
  // The usual band is clipped to the plot instead of stretching the value axis:
  // a wide band (three spreads, with the noise floor) would flatten the line.
  const times = series.flatMap((item) =>
    item.points.map((p) => flightTime(p.entry)),
  )

  const low = marks.length === 0 ? 0 : Math.min(...marks)
  const high = marks.length === 0 ? 1 : Math.max(...marks)
  const span = high === low ? Math.abs(high) * 0.2 || 1 : high - low
  // The 1 to 5 scales (mood, appetite) always draw their whole scale: 1 to 5,
  // one tick per step, never a value outside it.
  const scale =
    series.length > 0 && series.every((item) => item.unit === SCALE_UNIT)
  const step = scale ? 1 : niceStep(span, Y_TICKS)
  const yMin = scale ? 1 : Math.floor((low - span * 0.08) / step) * step
  const yMax = scale ? 5 : Math.ceil((high + span * 0.08) / step) * step
  const decimals = Math.max(
    decimalsOf(step),
    ...series.flatMap((item) => item.points.map((p) => decimalsOf(p.entry.value))),
    0,
  )
  const yPosition = (value: number): number =>
    plot.bottom - ((value - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)

  // The axis starts at the start of the first reading's Flight Day, so that
  // day's label sits inside the plot, not left of it.
  const first =
    times.length === 0
      ? 0
      : times.length === 1
        ? times[0]
        : Math.floor(Math.min(...times))
  const last = times.length === 0 ? 0 : Math.max(...times)
  const xPosition = (time: number): number =>
    last === first
      ? (plot.left + plot.right) / 2
      : plot.left +
        INSET +
        ((time - first) / (last - first)) * (plot.right - plot.left - INSET * 2)

  const positions = new Map<string, { x: number; y: number }>()
  const modelSeries: ModelSeries[] = series.map((item, index) => {
    const points = item.points.map((p) => {
      const x = xPosition(flightTime(p.entry))
      const y = yPosition(p.entry.value)
      positions.set(p.entry.id, { x, y })
      return { entry: p.entry, kind: statusBadgeKind(p.status), x, y }
    })
    const clamp = (value: number): number =>
      Math.min(plot.bottom, Math.max(plot.top, yPosition(value)))
    return {
      key: item.key,
      family: index === 0 ? 'a' : 'b',
      points,
      line: points.map((p) => `${p.x},${p.y}`).join(' '),
      band:
        item.band === null
          ? null
          : {
              top: clamp(item.band.high),
              bottom: clamp(item.band.low),
              medianY: clamp(item.band.median),
            },
    }
  })

  const ticks = Math.max(1, Math.round((yMax - yMin) / step))
  const yTicks: Tick[] = []
  for (let index = 0; index <= ticks && index <= 20; index += 1) {
    const value = yMin + index * step
    yTicks.push({
      key: `y:${index}`,
      position: yPosition(value),
      text: value.toFixed(decimals),
    })
  }

  const days = [...new Set(times.map((time) => Math.floor(time)))].sort(
    (a, b) => a - b,
  )
  const xTicks = dayLabels(days, plot.right - plot.left).map((day) => ({
    key: `x:${day}`,
    position: xPosition(day),
    text: String(day),
  }))

  const thresholds = thresholdLines(
    cited.map(({ item, rule }) => ({
      key: `${item.key}:${rule.attentionLevel}:${rule.side}:${rule.threshold}`,
      text: strings.history.trend.thresholdLabel(
        item.shortLabel ?? item.label,
        rule.attentionLevel,
      ),
      y: yPosition(rule.threshold),
      above: rule.side === 'above',
    })),
    plot,
  )

  return {
    series: modelSeries,
    points: modelSeries.flatMap((item) => item.points),
    thresholds,
    yTicks,
    xTicks,
    unit: series[0] === undefined ? '' : strings.cardUnit(series[0].unit),
    positionOf: (entry) => positions.get(entry.id) ?? { x: plot.left, y: plot.bottom },
  }
}

function thresholdLines(
  lines: { key: string; text: string; y: number; above: boolean }[],
  plot: Plot,
): ThresholdLine[] {
  const placed = lines.map((line) => ({
    key: line.key,
    text: line.text,
    y: line.y,
    labelY: Math.min(
      plot.bottom - 4,
      Math.max(plot.top + 10, line.above ? line.y - 5 : line.y + 13),
    ),
  }))
  let previous = Number.NEGATIVE_INFINITY
  return placed
    .sort((a, b) => a.labelY - b.labelY)
    .map((line) => {
      const labelY = Math.max(line.labelY, previous + LABEL_GAP)
      previous = labelY
      return { ...line, labelY }
    })
}

function niceStep(span: number, target: number): number {
  const rough = span / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const multiple = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return multiple * magnitude
}

function dayLabels(days: number[], plotWidth: number): number[] {
  if (days.length === 0) return []
  const room = Math.max(1, Math.floor(plotWidth / LABEL_MIN_GAP))
  const step = Math.max(1, Math.ceil(days.length / room))
  const kept = days.filter((_, index) => index % step === 0)
  const last = days[days.length - 1]
  // The newest day always keeps its label; an older label that would sit too
  // close to it gives way.
  if (!kept.includes(last)) {
    const lastKept = kept[kept.length - 1]
    if (days.indexOf(last) - days.indexOf(lastKept) < step) kept.pop()
    kept.push(last)
  }
  return kept
}

function decimalsOf(value: number): number {
  const [mantissa, exponent] = String(value).split('e-')
  const dot = mantissa.indexOf('.')
  const fraction = dot === -1 ? 0 : mantissa.length - dot - 1
  return exponent === undefined ? fraction : fraction + Number(exponent)
}
