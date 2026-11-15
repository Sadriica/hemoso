// The symptom reports a device still owes the server (T-80). A report is saved
// on the device first (data/symptomStore.ts); this outbox is the copy that goes
// to POST /people/{id}/symptoms when that person has an account. It follows
// data/painOutbox.ts: one localStorage key, every access guarded, an item
// leaves when the server took it, and stays on the device when a retry cannot
// change the answer (409, 422). A 404 or 405 means the route is not deployed
// yet: the reports wait and a later round asks again.

import { readSymptomReport, symptomReportKey, type SymptomReport } from '../domain/symptoms'
import type { SymptomClient, SymptomSendOutcome } from './symptomClient'

export const SYMPTOM_OUTBOX_KEY = 'hemoso:symptom-outbox:v1'
const STORAGE_VERSION = 1

interface OutboxStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredOutbox {
  version: number
  items: SymptomReport[]
  refusedKeys: string[]
  serverMissing: boolean
}

export interface SymptomOutboxSnapshot {
  pendingCount: number
  refusedCount: number
  serverMissing: boolean
}

const listeners = new Set<() => void>()

function empty(): StoredOutbox {
  return { version: STORAGE_VERSION, items: [], refusedKeys: [], serverMissing: false }
}

function browserStorage(): OutboxStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Called after every change of the outbox: a report was queued, or sent. */
export function subscribeSymptomOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function read(storage: OutboxStorage | null): StoredOutbox {
  if (storage === null) return empty()
  let value: unknown
  try {
    const raw = storage.getItem(SYMPTOM_OUTBOX_KEY)
    if (raw === null) return empty()
    value = JSON.parse(raw)
  } catch {
    return empty()
  }
  if (typeof value !== 'object' || value === null) return empty()
  const stored = value as Partial<StoredOutbox>
  if (stored.version !== STORAGE_VERSION) return empty()
  return {
    version: STORAGE_VERSION,
    items: Array.isArray(stored.items)
      ? stored.items
          .map(readSymptomReport)
          .filter((item): item is SymptomReport => item !== null)
      : [],
    refusedKeys: Array.isArray(stored.refusedKeys)
      ? stored.refusedKeys.filter((key): key is string => typeof key === 'string')
      : [],
    serverMissing: stored.serverMissing === true,
  }
}

function write(outbox: StoredOutbox, storage: OutboxStorage | null): void {
  if (storage === null) return
  try {
    storage.setItem(SYMPTOM_OUTBOX_KEY, JSON.stringify(outbox))
  } catch {
    return
  }
  for (const listener of [...listeners]) listener()
}

/** Queues reports; one the outbox already owes or the server refused is skipped. */
export function enqueueSymptomReports(
  reports: SymptomReport[],
  storage: OutboxStorage | null = browserStorage(),
): number {
  if (storage === null || reports.length === 0) return 0
  const outbox = read(storage)
  const known = new Set([
    ...outbox.items.map(symptomReportKey),
    ...outbox.refusedKeys,
  ])
  const added: SymptomReport[] = []
  for (const report of reports) {
    const key = symptomReportKey(report)
    if (known.has(key)) continue
    known.add(key)
    added.push(report)
  }
  if (added.length === 0) return 0
  write({ ...outbox, items: [...outbox.items, ...added] }, storage)
  return added.length
}

/** The reports of one person this device still owes, oldest day and time first. */
export function pendingSymptomReports(
  personId: string,
  storage: OutboxStorage | null = browserStorage(),
): SymptomReport[] {
  return read(storage)
    .items.filter((item) => item.personId === personId)
    .sort(
      (a, b) =>
        a.missionDay - b.missionDay ||
        (a.time === b.time ? 0 : a.time < b.time ? -1 : 1),
    )
}

export function symptomOutboxSnapshot(
  personId: string,
  storage: OutboxStorage | null = browserStorage(),
): SymptomOutboxSnapshot {
  const outbox = read(storage)
  return {
    pendingCount: outbox.items.filter((item) => item.personId === personId).length,
    refusedCount: outbox.refusedKeys.length,
    serverMissing: outbox.serverMissing,
  }
}

function settle(
  report: SymptomReport,
  change: (outbox: StoredOutbox, key: string) => StoredOutbox,
  storage: OutboxStorage,
): void {
  const key = symptomReportKey(report)
  const outbox = read(storage)
  if (!outbox.items.some((item) => symptomReportKey(item) === key)) return
  write(change(outbox, key), storage)
}

export interface SymptomSendRound {
  sent: number
  /** Refused for good (409, 422); they stay on the device. */
  refused: number
  pending: number
  serverMissing: boolean
}

/**
 * One round over the reports of one person, oldest first, one request each. A
 * taken report leaves the outbox, a refused one stops being retried, and a
 * connection problem, a 5xx or a token the server stopped accepting ends the
 * round with the rest waiting. Never throws.
 */
export async function sendPendingSymptoms(
  client: SymptomClient,
  personId: string,
  storage: OutboxStorage | null = browserStorage(),
): Promise<SymptomSendRound> {
  const round: SymptomSendRound = { sent: 0, refused: 0, pending: 0, serverMissing: false }
  if (storage === null || !client.isConfigured()) {
    round.pending = pendingSymptomReports(personId, storage).length
    round.serverMissing = read(storage).serverMissing
    return round
  }
  for (const item of pendingSymptomReports(personId, storage)) {
    let outcome: SymptomSendOutcome
    try {
      outcome = await client.send(item)
    } catch {
      outcome = 'retry'
    }
    if (outcome === 'sent') {
      settle(
        item,
        (outbox, key) => ({
          ...outbox,
          items: outbox.items.filter((entry) => symptomReportKey(entry) !== key),
          serverMissing: false,
        }),
        storage,
      )
      round.sent += 1
    } else if (outcome === 'conflict' || outcome === 'rejected') {
      settle(
        item,
        (outbox, key) => ({
          ...outbox,
          items: outbox.items.filter((entry) => symptomReportKey(entry) !== key),
          refusedKeys: [...outbox.refusedKeys, key],
        }),
        storage,
      )
      round.refused += 1
    } else if (outcome === 'unavailable') {
      const outbox = read(storage)
      if (!outbox.serverMissing) write({ ...outbox, serverMissing: true }, storage)
      break
    } else {
      break
    }
  }
  round.pending = pendingSymptomReports(personId, storage).length
  round.serverMissing = read(storage).serverMissing
  return round
}
