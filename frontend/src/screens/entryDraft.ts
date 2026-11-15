import { isClockTime, isMissionDay } from '../domain/clock'
import type { Indicator } from '../domain/types'
import { systemOf, type BodySystemId } from '../icons/meta'
import { isReactionIndicator } from '../reaction/ids'
import { SCALE_UNIT, strings } from '../strings'

// What the report screen accepts, as pure functions: the same rules and the
// same sentences wherever a reading is checked (REQ-02). The screen reads
// config/data/indicators.csv, so a row appears and disappears with that file.

// Sleep quality and mood are answers on a 1 to 5 scale, and Phys writes that
// scale as the unit in config/data/indicators.csv. No other indicator gets a
// range here.
export const SCALE_VALUES = [1, 2, 3, 4, 5] as const

export function isScaleUnit(unit: string): boolean {
  return unit === SCALE_UNIT
}

export interface DraftFields {
  unit: string
  value: string
  missionDay: string
  time: string
}

export interface DraftErrors {
  value?: string
  missionDay?: string
  time?: string
}

export type Draft =
  | { ok: true; value: number; missionDay: number; time: string }
  | { ok: false; errors: DraftErrors }

// The order of the fields on screen, used to pick the first problem to focus.
const FIELD_ORDER: (keyof DraftErrors)[] = ['value', 'missionDay', 'time']

export function parseDraft(fields: DraftFields): Draft {
  const errors: DraftErrors = {}

  const value = Number(fields.value.trim())
  const valueProblem = problemOf(fields.unit, fields.value)
  if (valueProblem !== undefined) errors.value = valueProblem

  const missionDay = Number(fields.missionDay.trim())
  if (!isMissionDay(missionDay)) {
    errors.missionDay = strings.entry.errors.missionDay
  }

  const time = fields.time.trim()
  if (!isClockTime(time)) {
    errors.time = strings.entry.errors.time
  }

  if (FIELD_ORDER.some((field) => errors[field] !== undefined)) {
    return { ok: false, errors }
  }
  return { ok: true, value, missionDay, time }
}

// What is wrong with one value, or nothing. The two scales take a whole number
// from 1 to 5; every other indicator takes a number.
function problemOf(unit: string, text: string): string | undefined {
  const value = Number(text.trim())
  if (isScaleUnit(unit)) {
    return isScaleChoice(value) ? undefined : strings.entry.errors.valueScale
  }
  if (text.trim() === '') return strings.entry.errors.valueRequired
  if (!Number.isFinite(value)) return strings.entry.errors.valueNumber
  return undefined
}

function isScaleChoice(value: number): boolean {
  return SCALE_VALUES.some((choice) => choice === value)
}

// One row of the report screen: an indicator, or the two blood pressures of one
// measurement. The rows follow the order of config/data/indicators.csv.
export interface ReadingField {
  indicatorId: string
  /** Words for the input of a pair, where the row name is above both. */
  label: string
  unit: string
  /** Fields saved together, so one of them empty is a problem. */
  pair?: string
}

export interface ReadingRow {
  /** Stable key of the row: the indicator id, or `bp` for the pair. */
  key: string
  name: string
  /** The id its icon is drawn from. */
  iconId: string
  system: BodySystemId | null
  scale: boolean
  unit: string
  fields: ReadingField[]
}

// The two blood pressure ids of FORMATS.md section 2: one cuff, one moment, so
// they share a row and are saved as two readings.
const BP_SYSTOLIC = 'bp_sys_mmhg'
const BP_DIASTOLIC = 'bp_dia_mmhg'

export function readingRows(indicators: Indicator[]): ReadingRow[] {
  const hasSystolic = indicators.some(
    (indicator) => indicator.id === BP_SYSTOLIC,
  )
  const rows: ReadingRow[] = []

  for (const indicator of indicators) {
    // The reaction check measures these two itself (reaction/ids.ts): no field
    // asks the crew to type a value the app already knows.
    if (isReactionIndicator(indicator.id)) continue
    if (indicator.id === BP_SYSTOLIC) {
      const diastolic = indicators.find(
        (item) => item.id === BP_DIASTOLIC,
      )
      if (diastolic !== undefined) {
        rows.push({
          key: 'bp',
          name: strings.entry.bloodPressure,
          // One gauge for the pair; the two ids carry an arrow each when they
          // are shown on their own.
          iconId: 'bp',
          system: systemOf(indicator.id),
          scale: false,
          unit: indicator.unit,
          fields: [
            {
              indicatorId: indicator.id,
              label: strings.entry.systolic,
              unit: indicator.unit,
              pair: 'bp',
            },
            {
              indicatorId: diastolic.id,
              label: strings.entry.diastolic,
              unit: diastolic.unit,
              pair: 'bp',
            },
          ],
        })
        continue
      }
    }
    // The diastolic row is drawn in the pair above it.
    if (indicator.id === BP_DIASTOLIC && hasSystolic) continue

    rows.push({
      key: indicator.id,
      name: indicator.name,
      iconId: indicator.id,
      system: systemOf(indicator.id),
      scale: isScaleUnit(indicator.unit),
      unit: indicator.unit,
      fields: [
        {
          indicatorId: indicator.id,
          label: indicator.name,
          unit: indicator.unit,
        },
      ],
    })
  }

  return rows
}

// One field of the report as the person left it. An empty field is a reading
// that was not taken, not a mistake.
export interface ReportField extends ReadingField {
  value: string
}

export interface ReportReading {
  indicatorId: string
  unit: string
  value: number
}

export type ReportDraft =
  | {
      ok: true
      readings: ReportReading[]
      missionDay: number
      time: string
    }
  | {
      ok: false
      /** The problem of a filled field, by indicator id. */
      valueErrors: Record<string, string>
      missionDay?: string
      time?: string
    }

// Every filled row at once, with the one day and time they share. Nothing is
// accepted while one filled row is wrong, so a half report is never stored.
export function parseReport(
  fields: ReportField[],
  missionDayText: string,
  timeText: string,
): ReportDraft {
  // The two blood pressures are one reading: writing one asks for the other.
  const filledPairs = new Set(
    fields
      .filter((field) => field.pair !== undefined && field.value.trim() !== '')
      .map((field) => field.pair as string),
  )

  const valueErrors: Record<string, string> = {}
  const readings: ReportReading[] = []

  for (const field of fields) {
    const taken =
      field.value.trim() !== '' ||
      (field.pair !== undefined && filledPairs.has(field.pair))
    if (!taken) continue
    const problem = problemOf(field.unit, field.value)
    if (problem !== undefined) {
      valueErrors[field.indicatorId] = problem
      continue
    }
    readings.push({
      indicatorId: field.indicatorId,
      unit: field.unit,
      value: Number(field.value.trim()),
    })
  }

  const missionDay = Number(missionDayText.trim())
  const time = timeText.trim()
  const missionDayProblem = isMissionDay(missionDay)
    ? undefined
    : strings.entry.errors.missionDay
  const timeProblem = isClockTime(time) ? undefined : strings.entry.errors.time

  if (
    Object.keys(valueErrors).length > 0 ||
    missionDayProblem !== undefined ||
    timeProblem !== undefined
  ) {
    return {
      ok: false,
      valueErrors,
      missionDay: missionDayProblem,
      time: timeProblem,
    }
  }

  return { ok: true, readings, missionDay, time }
}
