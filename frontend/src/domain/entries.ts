import type { Entry } from './types'

// The most recent entry for an indicator: the latest mission day wins, and on
// the same day the latest time (HH:MM) wins. An entry with the same day and
// time wins too, because `add` appends and a corrected reading arrives last.
// Returns null for an empty list.
export function latestEntry(entries: Entry[]): Entry | null {
  let latest: Entry | null = null
  for (const entry of entries) {
    if (latest === null) {
      latest = entry
      continue
    }
    if (entry.missionDay > latest.missionDay) {
      latest = entry
      continue
    }
    if (entry.missionDay === latest.missionDay && entry.time >= latest.time) {
      latest = entry
    }
  }
  return latest
}

export interface HistoryComparison {
  latest: Entry
  earlierCount: number
  earlierMedian: number
  difference: number
}

// The latest reading against the same person's earlier readings of the same
// indicator (REQ-12). The caller passes one person's entries for one
// indicator: another person's rows never reach this function, which is what
// keeps the comparison personal.
//
// The median and the difference keep the precision the readings carry
// (STANDARDS.md section 3): integer readings give an integer median, so a mean
// of 76.5 bpm reads 77 bpm, and one-decimal temperatures keep one decimal.
// With one entry there is nothing earlier to compare with, so it returns null.
export function compareToOwnHistory(entries: Entry[]): HistoryComparison | null {
  if (entries.length < 2) return null
  const latest = latestEntry(entries)
  if (latest === null) return null
  // A reading is only compared with readings in the same context: heart rate
  // after exercise sits in another population than the same value at rest
  // (FORMATS.md section 3). The latest reading is one of the entries, so
  // identity is enough to leave it out: a tie on the same day is an earlier
  // reading.
  const earlier = entries.filter(
    (entry) => entry !== latest && entry.context === latest.context,
  )
  if (earlier.length === 0) return null
  const earlierValues = earlier.map((entry) => entry.value)
  const decimals = entries.reduce(
    (most, entry) => Math.max(most, decimalsOf(entry.value)),
    0,
  )
  const earlierMedian = roundTo(median(earlierValues), decimals)
  return {
    latest,
    earlierCount: earlierValues.length,
    earlierMedian,
    difference: roundTo(latest.value - earlierMedian, decimals),
  }
}

// Newest first, for a table: the latest day, then the latest time, and on the
// same day and time the entry added last, so a correction sits above the value
// it replaces.
export function newestFirst(entries: Entry[]): Entry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.missionDay !== b.entry.missionDay) {
        return b.entry.missionDay - a.entry.missionDay
      }
      if (a.entry.time !== b.entry.time) {
        return a.entry.time < b.entry.time ? 1 : -1
      }
      return b.index - a.index
    })
    .map(({ entry }) => entry)
}

// The middle value of an odd count, the mean of the two middle values of an
// even count. The list always holds at least one value here. The mean is kept
// exact before rounding, so 36.75 °C is not lost to binary rounding.
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return trimFloat((sorted[middle - 1] + sorted[middle]) / 2)
}

// The decimals a reading carries: 76 has 0, 36.7 has 1.
function decimalsOf(value: number): number {
  const [mantissa, exponent] = String(value).split('e-')
  const dot = mantissa.indexOf('.')
  const fraction = dot === -1 ? 0 : mantissa.length - dot - 1
  return exponent === undefined ? fraction : fraction + Number(exponent)
}

// Round at that precision, half away from zero: 76.5 becomes 77 and -3.5
// becomes -4. The small addition absorbs the binary error of the
// multiplication (36.55 × 10 is 365.4999… in floating point).
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  const scaled = value * factor
  const rounded = Math.sign(scaled) * Math.round(Math.abs(scaled) + 1e-9)
  return trimFloat(rounded / factor)
}

// Binary floating point turns 0.3 into 0.30000000000000004; keep the digits the
// readings themselves carry.
function trimFloat(value: number): number {
  return Number(value.toPrecision(12))
}
