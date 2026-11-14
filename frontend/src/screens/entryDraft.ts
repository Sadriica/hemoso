import { isClockTime, isMissionDay } from '../domain/clock'
import { strings } from '../strings'

// What the Entry screen accepts, as one pure function: the same rules and the
// same sentences wherever the form is checked (REQ-02).

// Sleep quality and mood are answers on a 1 to 5 scale, and Phys writes that
// scale as the unit in config/data/indicators.csv. No other indicator gets a
// range here.
export const SCALE_UNIT = '1 to 5'
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
  if (isScaleUnit(fields.unit)) {
    if (!isScaleChoice(value)) errors.value = strings.entry.errors.valueScale
  } else if (fields.value.trim() === '') {
    errors.value = strings.entry.errors.valueRequired
  } else if (!Number.isFinite(value)) {
    errors.value = strings.entry.errors.valueNumber
  }

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

function isScaleChoice(value: number): boolean {
  return SCALE_VALUES.some((choice) => choice === value)
}
