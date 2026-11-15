import { localState, statusFromLocal, type Status } from '../domain/state'
import type { AttentionRule, Entry } from '../domain/types'

// True when `a` was taken strictly before `b`: mission day first, then the
// clock time of the same day. Two readings at the same moment do not count as
// earlier than each other.
function isBefore(a: Entry, b: Entry): boolean {
  if (a.missionDay !== b.missionDay) return a.missionDay < b.missionDay
  return a.time < b.time
}

// The status of one table row, by the same rule as the indicator card: the
// reading is compared with the person's own earlier readings in the same
// context (localState drops the other contexts), so a row from the first days
// reads "No data yet" and never claims a range it did not compute. Later
// readings never move the status of an older row.
export function rowStatus(
  entry: Entry,
  all: Entry[],
  rules: AttentionRule[],
  minSpread: number,
): Status {
  const earlier = all.filter((other) => isBefore(other, entry))
  return statusFromLocal(localState(entry, earlier, rules, minSpread))
}
