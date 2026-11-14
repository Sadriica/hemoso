import type { Entry } from './types'

// Mission time as the app shows it: the latest day the person has recorded,
// and the clock time now. Rules from STANDARDS.md sections 3 and 4.
export interface MissionClock {
  missionDay: number
  time: string // HH:MM
}

// The latest mission day in `entries`, and `date` as HH:MM (local time).
// A person with no entries yet is on day 1.
export function missionNow(
  entries: Entry[],
  date: Date = new Date(),
): MissionClock {
  const missionDay = entries.reduce(
    (latest, entry) => (entry.missionDay > latest ? entry.missionDay : latest),
    1,
  )
  return { missionDay, time: formatClockTime(date) }
}

function formatClockTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// The 24-hour HH:MM format of STANDARDS.md section 4, used wherever a time is
// read from a file or from browser storage.
export function isClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

// A mission day is a positive integer ("Day 41", STANDARDS.md section 4).
export function isMissionDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}
