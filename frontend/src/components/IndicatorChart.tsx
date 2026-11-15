import { useLayoutEffect, useRef, useState } from 'react'
import type { HistoryComparison } from '../domain/entries'
import type { AttentionRule, Entry } from '../domain/types'
import { strings } from '../strings'

// One indicator over mission time (REQ-12, REQ-15): one point per reading, the
// person's earlier median as a dashed line and every attention threshold of the
// indicator as a dotted line with its level name. Plain SVG, no library, so the
// figure follows the box it sits in. Screen readers get the summary sentence of
// the screen as the accessible name; the table under the chart is the full text
// version of the same numbers, so nothing here is the only source of a value.
//
// Thresholds come only from the indicator's attention rules. An indicator with
// no rule draws no threshold line and keeps no "in range" band: without a
// threshold the app has nothing to say about a value.
//
// The chart fits its box instead of scrolling. The drawing box is measured and
// one unit is one CSS pixel, so the axis text keeps its size on a phone and the
// figure never needs a scroll container; a narrow box gets fewer day labels.

// Width before the box has been measured, and in a test without layout.
const DEFAULT_WIDTH = 480
// Below this the plot has no room for a line; the figure then scales down a
// little, which no real screen does (a 320 px wide phone leaves about 280 px).
const MIN_WIDTH = 240
const HEIGHT = 250
const PADDING = { top: 30, right: 16, bottom: 40, left: 56 }
// Points and day labels sit a little inside the axis lines, so the first and
// last reading are not cut in half by them.
const INSET = 6
// About how many ticks the value axis carries; the step then picks a round
// number.
const Y_TICKS = 4
// Smallest gap between two threshold labels, so two close lines stay readable.
const LABEL_GAP = 14
const LABEL_OFFSET = 6
// A label under its line sits lower: the text hangs from its baseline.
const LABEL_BELOW = 14
// Smallest gap between two day labels, in pixels: below it the axis keeps every
// other day instead of printing unreadable numbers.
const LABEL_MIN_GAP = 44

interface Plot {
  left: number
  right: number
  top: number
  bottom: number
}

interface Point {
  id: string
  x: number
  y: number
}

interface ThresholdLine {
  key: string
  level: string
  y: number
  labelY: number
}

interface Tick {
  key: string
  position: number
  text: string
}

interface ChartModel {
  points: Point[]
  line: string
  medianY: number | null
  thresholds: ThresholdLine[]
  yTicks: Tick[]
  xTicks: Tick[]
  unit: string
}

export default function IndicatorChart({
  entries,
  unit,
  rules,
  comparison,
  labelledBy,
}: {
  entries: Entry[]
  unit: string
  rules: AttentionRule[]
  comparison: HistoryComparison | null
  labelledBy: string
}) {
  const figureRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)

  useLayoutEffect(() => {
    const node = figureRef.current
    if (node === null) return
    const measure = (): void => {
      const style = getComputedStyle(node)
      const padding =
        (Number.parseFloat(style.paddingLeft) || 0) +
        (Number.parseFloat(style.paddingRight) || 0)
      const inner = node.clientWidth - padding
      // A box without layout (a test, or a hidden tab) keeps the default width.
      if (inner > 0) setWidth(Math.max(MIN_WIDTH, Math.round(inner)))
    }
    measure()
    // jsdom has no ResizeObserver; there the figure is measured once.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // History only draws the chart next to a table, so an empty list cannot
  // happen there; returning nothing keeps the maths below free of empty ranges.
  if (entries.length === 0) return null

  const plot = plotOf(width)
  const model = buildChart(entries, rules, comparison, unit, plot)

  return (
    <div className="history__chart" ref={figureRef}>
      <svg
        className="chart"
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-labelledby={labelledBy}
        preserveAspectRatio="xMidYMid meet"
      >
        {model.yTicks.map((tick) => (
          <g key={tick.key}>
            <line
              className="chart__grid"
              x1={plot.left}
              x2={plot.right}
              y1={tick.position}
              y2={tick.position}
            />
            <text
              className="chart__tick"
              x={plot.left - 8}
              y={tick.position + 4}
              textAnchor="end"
            >
              {tick.text}
            </text>
          </g>
        ))}

        {/* Axis lines: the left one carries the values, the bottom one the days. */}
        <line
          className="chart__axis"
          x1={plot.left}
          x2={plot.left}
          y1={plot.top}
          y2={plot.bottom}
        />
        <line
          className="chart__axis"
          x1={plot.left}
          x2={plot.right}
          y1={plot.bottom}
          y2={plot.bottom}
        />

        {model.xTicks.map((tick) => (
          <g key={tick.key}>
            <line
              className="chart__axis"
              x1={tick.position}
              x2={tick.position}
              y1={plot.bottom}
              y2={plot.bottom + 4}
            />
            <text
              className="chart__tick chart__tick--day"
              x={tick.position}
              y={plot.bottom + 18}
              textAnchor="middle"
            >
              {tick.text}
            </text>
          </g>
        ))}

        {/* The unit once, in its own spelling, never uppercased. */}
        <text className="chart__unit" x={plot.left} y={PADDING.top - 14}>
          {model.unit}
        </text>
        <text
          className="chart__axis-name"
          x={plot.left}
          y={HEIGHT - 8}
          textAnchor="start"
        >
          {strings.history.columns.day}
        </text>

        {model.thresholds.map((threshold) => (
          <g key={threshold.key}>
            <line
              className="chart__threshold"
              x1={plot.left}
              x2={plot.right}
              y1={threshold.y}
              y2={threshold.y}
              strokeDasharray="2 4"
            />
            <text
              className="chart__threshold-label"
              x={plot.right - 4}
              y={threshold.labelY}
              textAnchor="end"
            >
              {threshold.level}
            </text>
          </g>
        ))}

        {model.medianY !== null && (
          <line
            className="chart__median"
            x1={plot.left}
            x2={plot.right}
            y1={model.medianY}
            y2={model.medianY}
            strokeDasharray="6 4"
          />
        )}

        <polyline className="chart__line" points={model.line} />
        {model.points.map((point) => (
          <circle
            className="chart__point"
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={4}
          />
        ))}
      </svg>
    </div>
  )
}

function plotOf(width: number): Plot {
  return {
    left: PADDING.left,
    right: width - PADDING.right,
    top: PADDING.top,
    bottom: HEIGHT - PADDING.bottom,
  }
}

function buildChart(
  entries: Entry[],
  rules: AttentionRule[],
  comparison: HistoryComparison | null,
  unit: string,
  plot: Plot,
): ChartModel {
  // Mission days grow to the right, and two readings on the same day keep their
  // clock order, so a correction sits above the value it replaces.
  const ordered = [...entries].sort((a, b) =>
    a.missionDay === b.missionDay
      ? a.time.localeCompare(b.time)
      : a.missionDay - b.missionDay,
  )

  const median = comparison === null ? null : comparison.earlierMedian
  const marks = [
    ...ordered.map((entry) => entry.value),
    ...rules.map((rule) => rule.threshold),
    ...(median === null ? [] : [median]),
  ]

  const low = Math.min(...marks)
  const high = Math.max(...marks)
  // A single reading, or a flat line, still needs a band to sit in.
  const span = high === low ? Math.abs(high) * 0.2 || 1 : high - low
  const step = niceStep(span, Y_TICKS)
  const yMin = Math.floor((low - span * 0.1) / step) * step
  const yMax = Math.ceil((high + span * 0.1) / step) * step
  // The readings decide the precision of every number on the axis, the same
  // way compareToOwnHistory keeps it (STANDARDS.md section 3).
  const decimals = Math.max(decimalsOf(step), ...marks.map(decimalsOf))

  const yPosition = (value: number): number =>
    plot.bottom - ((value - yMin) / (yMax - yMin)) * (plot.bottom - plot.top)

  const days = ordered.map((entry) => entry.missionDay)
  const firstDay = Math.min(...days)
  const lastDay = Math.max(...days)
  const daySpan = lastDay - firstDay
  const xPosition = (day: number): number =>
    daySpan === 0
      ? (plot.left + plot.right) / 2
      : plot.left +
        INSET +
        ((day - firstDay) / daySpan) * (plot.right - plot.left - INSET * 2)

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

  // Only the days that carry a reading: an empty day is not a data point.
  const dayTicks = dayLabels(
    [...new Set(days)].sort((a, b) => a - b),
    plot.right - plot.left,
  ).map((day) => ({
    key: `x:${day}`,
    position: xPosition(day),
    text: String(day),
  }))

  const points = ordered.map((entry) => ({
    id: entry.id,
    x: xPosition(entry.missionDay),
    y: yPosition(entry.value),
  }))

  return {
    points,
    line: points.map((point) => `${point.x},${point.y}`).join(' '),
    medianY: median === null ? null : yPosition(median),
    thresholds: thresholdLines(rules, yPosition, plot),
    yTicks,
    xTicks: dayTicks,
    unit: strings.cardUnit(unit),
  }
}

// Threshold lines with their labels at the right end, where the line is
// usually free of readings: just above an `above` line and just below a
// `below` line, on the side the value must cross into. Labels that would print
// on top of each other are pushed apart.
function thresholdLines(
  rules: AttentionRule[],
  yPosition: (value: number) => number,
  plot: Plot,
): ThresholdLine[] {
  const lines = rules.map((rule) => {
    const y = yPosition(rule.threshold)
    const wanted = rule.side === 'above' ? y - LABEL_OFFSET : y + LABEL_BELOW
    return {
      key: `${rule.attentionLevel}:${rule.side}:${rule.threshold}`,
      level: rule.attentionLevel,
      y,
      labelY: Math.min(plot.bottom - 4, Math.max(plot.top + 10, wanted)),
    }
  })
  let previous = Number.NEGATIVE_INFINITY
  return lines
    .sort((a, b) => a.labelY - b.labelY)
    .map((line) => {
      const labelY = Math.max(line.labelY, previous + LABEL_GAP)
      previous = labelY
      return { ...line, labelY }
    })
}

// A round step (1, 2 or 5 times a power of ten) near the size that gives the
// wanted number of ticks.
function niceStep(span: number, target: number): number {
  const rough = span / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const multiple = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return multiple * magnitude
}

// The day labels a plot of this width can hold, always including the last
// reading's day: a narrow phone gets every other day instead of a smear of
// numbers, and the date of the newest reading is never dropped.
function dayLabels(days: number[], plotWidth: number): number[] {
  const room = Math.max(1, Math.floor(plotWidth / LABEL_MIN_GAP))
  const step = Math.max(1, Math.ceil(days.length / room))
  const kept = days.filter((_, index) => index % step === 0)
  const last = days[days.length - 1]
  if (!kept.includes(last)) kept.push(last)
  return kept
}

// The decimals a number carries: 76 has 0, 36.7 has 1. Same rule as the domain
// (src/domain/entries.ts); kept local so the chart shows nothing the readings
// do not hold.
function decimalsOf(value: number): number {
  const [mantissa, exponent] = String(value).split('e-')
  const dot = mantissa.indexOf('.')
  const fraction = dot === -1 ? 0 : mantissa.length - dot - 1
  return exponent === undefined ? fraction : fraction + Number(exponent)
}
