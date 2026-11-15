import type { Entry } from './types'

// Mission time as the app shows it: the latest day the person has recorded,
// and the clock time now. Rules from STANDARDS.md sections 3 and 4.
export interface MissionClock {
  missionDay: number
  time: string // HH:MM
}

// The latest mission day in `entries`, and `date` as HH:MM (GMT).
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

// The same, for one person: only that person's entries count, so another
// person's day never shows. No entries yet is day 1, as in the report form.
export function missionNowFor(
  entries: Entry[],
  personId: string,
  date: Date = new Date(),
): MissionClock {
  return missionNow(
    entries.filter((entry) => entry.personId === personId),
    date,
  )
}

// Whole local calendar days from `start` (YYYY-MM-DD) to `now`, plus one: the
// start day is day 1. Counted on calendar dates, so a time zone or a daylight
// saving change never moves it. A start in the future is day 1.
export function missionDayFromStart(start: string, now: Date = new Date()): number {
  const [y, m, d] = start.split('-').map(Number)
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(y, m - 1, d)) /
      86_400_000,
  )
  return Math.max(days, 0) + 1
}

// The mission day and clock of one person: counted from their own mission
// start when they have one, otherwise the latest day of their own entries
// (day 1 with none), which is how the demo astronaut gets its day.
export function missionClockFor(
  entries: Entry[],
  personId: string,
  start: string | null,
  now: Date = new Date(),
): MissionClock {
  const own = missionNowFor(entries, personId, now)
  return start ? { ...own, missionDay: missionDayFromStart(start, now) } : own
}

// The clock the crew reads is GMT, the time the station runs on (STANDARDS.md
// section 5), so the label "GMT" is true on a device in any time zone.
function formatClockTime(date: Date): string {
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
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
