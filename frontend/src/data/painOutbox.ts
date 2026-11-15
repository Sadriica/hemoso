// The pain reports a device still owes the server (REQ-13, REQ-37). A report
// is saved on the device first (data/painStore.ts); this outbox is the copy
// that goes to POST /people/{id}/pain when that person has an account. One
// localStorage key, `hemoso:pain-outbox:v1`, and every access is guarded, so a
// browser that blocks storage leaves the reports on the device and no error.
//
// One item is one report of one region: the route keeps one row per person,
// region, mission day and time, which is the id of an item here. An item leaves
// the outbox when the server took it, and stays when a retry cannot change the
// answer (409, 422).

import type { PainClient, PainSendOutcome } from './painClient'
import type { InjuryKind, PainReport, PainStorage } from './painStore'
import { isClockTime, isMissionDay } from '../domain/clock'

export const PAIN_OUTBOX_KEY = 'hemoso:pain-outbox:v1'
const STORAGE_VERSION = 1

export interface PainOutboxItem {
  /** The key the route keeps one report per, and the id of this item. */
  id: string
  /** The report on the device this item came from. */
  reportId: string
  personId: string
  regionId: string
  kind: InjuryKind
  /** 0 is none, 10 is the worst, as the astronaut set it. */
  intensity: number
  missionDay: number
  time: string
  note: string
}

interface StoredOutbox {
  version: number
  items: PainOutboxItem[]
  refusedIds: string[]
  /**
   * true when the route answered 404 or 405: this server does not have it yet.
   * The reports stay here and a later round asks again; the flag only says
   * what is happening, it never drops a report.
   */
  serverMissing: boolean
}

export interface PainOutboxSnapshot {
  /** Reports of that person this device still has to send. */
  pendingCount: number
  /** Reports of that person the server refused (409, 422). */
  refusedCount: number
  serverMissing: boolean
}

const listeners = new Set<() => void>()

const EMPTY: StoredOutbox = {
  version: STORAGE_VERSION,
  items: [],
  refusedIds: [],
  serverMissing: false,
}

function browserStorage(): PainStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function notify(): void {
  for (const listener of [...listeners]) listener()
}

/** Called after every change of the outbox: a report was saved, or sent. */
export function subscribePainOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The item id: the four fields the route keeps one report per (docs/API.md). */
export function painItemId(
  personId: string,
  regionId: string,
  missionDay: number,
  time: string,
): string {
  return [personId, regionId, String(missionDay), time].join('\u0000')
}

function readItem(value: unknown): PainOutboxItem | null {
  if (typeof value !== 'object' || value === null) return null
  const item = value as Record<string, unknown>
  const { id, reportId, personId, regionId, kind, intensity, missionDay, time, note } = item
  if (typeof id !== 'string' || id === '') return null
  if (typeof reportId !== 'string' || reportId === '') return null
  if (typeof personId !== 'string' || personId === '') return null
  if (typeof regionId !== 'string' || regionId === '') return null
  if (typeof kind !== 'string' || kind === '') return null
  if (typeof intensity !== 'number' || !Number.isInteger(intensity)) return null
  if (intensity < 0 || intensity > 10) return null
  if (!isMissionDay(missionDay)) return null
  if (typeof time !== 'string' || !isClockTime(time)) return null
  if (typeof note !== 'string') return null
  return {
    id,
    reportId,
    personId,
    regionId,
    kind: kind as InjuryKind,
    intensity,
    missionDay,
    time,
    note,
  }
}

/** What this device still owes, or nothing when storage is blocked or broken. */
function read(storage: PainStorage | null): StoredOutbox {
  if (storage === null) return { ...EMPTY }
  let raw: string | null
  try {
    raw = storage.getItem(PAIN_OUTBOX_KEY)
  } catch {
    return { ...EMPTY }
  }
  if (raw === null) return { ...EMPTY }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { ...EMPTY }
  }
  if (typeof value !== 'object' || value === null) return { ...EMPTY }
  const candidate = value as Partial<StoredOutbox>
  if (candidate.version !== STORAGE_VERSION) return { ...EMPTY }
  const items = Array.isArray(candidate.items)
    ? candidate.items
        .map(readItem)
        .filter((item): item is PainOutboxItem => item !== null)
    : []
  const refusedIds = Array.isArray(candidate.refusedIds)
    ? candidate.refusedIds.filter((id): id is string => typeof id === 'string')
    : []
  return {
    version: STORAGE_VERSION,
    items,
    refusedIds,
    serverMissing: candidate.serverMissing === true,
  }
}

/** Writes the outbox and tells the app. A failed write changes nothing here. */
function write(outbox: StoredOutbox, storage: PainStorage | null): void {
  if (storage === null) return
  try {
    storage.setItem(PAIN_OUTBOX_KEY, JSON.stringify(outbox))
  } catch {
    return
  }
  notify()
}

/**
 * Queues one saved report: one item per region, oldest report first. An item
 * this device already owes, or the server already refused, is not queued twice.
 * Nothing is queued for a report with no region.
 */
export function enqueuePainReport(
  report: PainReport,
  storage: PainStorage | null = browserStorage(),
): number {
  if (storage === null || report.regions.length === 0) return 0
  const outbox = read(storage)
  const known = new Set([
    ...outbox.items.map((item) => item.id),
    ...outbox.refusedIds,
  ])
  const added: PainOutboxItem[] = []
  for (const mark of report.regions) {
    const id = painItemId(report.personId, mark.regionId, report.missionDay, report.time)
    if (known.has(id)) continue
    known.add(id)
    added.push({
      id,
      reportId: report.id,
      personId: report.personId,
      regionId: mark.regionId,
      kind: mark.kind,
      intensity: mark.intensity,
      missionDay: report.missionDay,
      time: report.time,
      note: report.note,
    })
  }
  if (added.length === 0) return 0
  write({ ...outbox, items: [...outbox.items, ...added] }, storage)
  return added.length
}

/**
 * Forgets what one report of this device owes: a report the person deleted is
 * never sent later. An id that owes nothing changes nothing.
 */
export function dropPainReport(
  reportId: string,
  storage: PainStorage | null = browserStorage(),
): void {
  if (storage === null) return
  const outbox = read(storage)
  const dropped = outbox.items.filter((item) => item.reportId === reportId)
  if (dropped.length === 0) return
  const ids = new Set(dropped.map((item) => item.id))
  write(
    {
      ...outbox,
      items: outbox.items.filter((item) => item.reportId !== reportId),
      refusedIds: outbox.refusedIds.filter((id) => !ids.has(id)),
    },
    storage,
  )
}

/** The reports of one person this device still owes, oldest day and time first. */
export function pendingPainItems(
  personId: string,
  storage: PainStorage | null = browserStorage(),
): PainOutboxItem[] {
  return read(storage)
    .items.filter((item) => item.personId === personId)
    .sort(byMissionTime)
}

/** The counts of one person's items, as the screens show them. */
export function painOutboxSnapshot(
  personId: string,
  storage: PainStorage | null = browserStorage(),
): PainOutboxSnapshot {
  const outbox = read(storage)
  return {
    pendingCount: outbox.items.filter((item) => item.personId === personId).length,
    refusedCount: outbox.refusedIds.length,
    serverMissing: outbox.serverMissing,
  }
}

function markSent(
  ids: string[],
  storage: PainStorage | null,
): void {
  if (storage === null || ids.length === 0) return
  const sent = new Set(ids)
  const outbox = read(storage)
  const kept = outbox.items.filter((item) => !sent.has(item.id))
  if (kept.length === outbox.items.length) return
  write(
    {
      ...outbox,
      items: kept,
      // The route answered, so the server has it and there is nothing to wait
      // for any more.
      serverMissing: false,
    },
    storage,
  )
}

function markRefused(
  id: string,
  storage: PainStorage | null,
): void {
  if (storage === null) return
  const outbox = read(storage)
  if (!outbox.items.some((item) => item.id === id)) return
  write(
    {
      ...outbox,
      items: outbox.items.filter((item) => item.id !== id),
      refusedIds: [...outbox.refusedIds, id],
    },
    storage,
  )
}

function markServerMissing(missing: boolean, storage: PainStorage | null): void {
  if (storage === null) return
  const outbox = read(storage)
  if (outbox.serverMissing === missing) return
  write({ ...outbox, serverMissing: missing }, storage)
}

export interface PainSendRound {
  /** Reports the server took. */
  sent: number
  /** Reports it refused for good (409, 422). They stay on the device. */
  refused: number
  /** Reports of that person still waiting when the round ended. */
  pending: number
  /** true when this server does not have the route yet (404, 405). */
  serverMissing: boolean
}

/**
 * One round over the reports of one person: oldest day and time first, one
 * request per region. A taken report leaves the outbox, a refused one stops
 * being retried, and a connection problem, a 5xx or a token the server stopped
 * accepting ends the round with the rest waiting for the next one. A 404 or 405
 * means the route is not deployed yet: the reports stay on the device, the
 * outbox says so, and a later round asks again. Never throws.
 */
export async function sendPendingPain(
  client: PainClient,
  personId: string,
  storage: PainStorage | null = browserStorage(),
): Promise<PainSendRound> {
  const round: PainSendRound = { sent: 0, refused: 0, pending: 0, serverMissing: false }
  if (storage === null || !client.isConfigured()) {
    round.pending = pendingPainItems(personId, storage).length
    round.serverMissing = read(storage).serverMissing
    return round
  }

  for (const item of pendingPainItems(personId, storage)) {
    let outcome: PainSendOutcome
    try {
      outcome = await client.send(item)
    } catch {
      // A client that throws where the contract says 'retry' is still a
      // connection problem for this round.
      outcome = 'retry'
    }
    if (outcome === 'sent') {
      markSent([item.id], storage)
      round.sent += 1
    } else if (outcome === 'conflict') {
      markRefused(item.id, storage)
      round.refused += 1
    } else if (outcome === 'rejected') {
      markRefused(item.id, storage)
      round.refused += 1
    } else if (outcome === 'unavailable') {
      // One answer is enough: the rest of the round would get the same 404.
      markServerMissing(true, storage)
      break
    } else {
      break
    }
  }

  round.pending = pendingPainItems(personId, storage).length
  round.serverMissing = read(storage).serverMissing
  return round
}

// Day first, then the 24-hour time; both are fixed-width. Reports with the same
// day and time keep the order they were saved in.
function byMissionTime(a: PainOutboxItem, b: PainOutboxItem): number {
  if (a.missionDay !== b.missionDay) return a.missionDay - b.missionDay
  if (a.time === b.time) return 0
  return a.time < b.time ? -1 : 1
}
