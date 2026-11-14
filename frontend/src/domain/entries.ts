import type { Entry } from './types'

// The most recent entry for an indicator: the latest mission day wins, and on
// the same day the latest time (HH:MM) wins. Returns null for an empty list.
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
    if (entry.missionDay === latest.missionDay && entry.time > latest.time) {
      latest = entry
    }
  }
  return latest
}
