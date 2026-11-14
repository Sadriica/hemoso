// The numbers a face becomes, and the copy kept in this browser (REQ-36).
// Nothing here opens a camera or touches the network, so the matching rules are
// tested without a device: a face is a list of 128 numbers (a descriptor) and a
// name to call it.

// The localStorage key of the saved faces. Versioned like the entry store, so a
// later shape never has to read the old one.
export const FACE_STORAGE_KEY = 'hemoso:face:v1'

// Two descriptors are compared by euclidean distance. The face-api
// documentation calls a distance below 0.6 a match; 0.5 is stricter, because
// picking the wrong name on a health screen is worse than asking for a second
// look. Source: @vladmandic/face-api, "Face Recognition", README.
export const MATCH_THRESHOLD = 0.5

export interface FaceRecord {
  personId: string
  descriptor: number[]
}

export interface FaceMatch extends FaceRecord {
  distance: number
}

// The part of the Storage API this module needs, so tests can pass a fake or a
// storage that throws.
export interface FaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// The mean of the frames of one registration: a single frame carries the light
// of that moment, five frames average it out.
export function averageDescriptors(frames: number[][]): number[] | null {
  const usable = frames.filter((frame) => frame.length > 0)
  if (usable.length === 0) return null
  const size = usable[0].length
  const sameSize = usable.filter((frame) => frame.length === size)
  const sums = new Array<number>(size).fill(0)
  for (const frame of sameSize) {
    for (let index = 0; index < size; index += 1) sums[index] += frame[index]
  }
  return sums.map((sum) => sum / sameSize.length)
}

// Infinity for two descriptors of different lengths: they cannot be the same
// face, and a length that no longer matches means the model changed.
export function euclideanDistance(first: number[], second: number[]): number {
  if (first.length !== second.length) return Number.POSITIVE_INFINITY
  let total = 0
  for (let index = 0; index < first.length; index += 1) {
    const difference = first[index] - second[index]
    total += difference * difference
  }
  return Math.sqrt(total)
}

// The closest saved face under the threshold, or null. A distance exactly at
// the threshold is not a match.
export function bestMatch(
  records: FaceRecord[],
  probe: number[],
  threshold: number = MATCH_THRESHOLD,
): FaceMatch | null {
  let best: FaceMatch | null = null
  for (const record of records) {
    const distance = euclideanDistance(record.descriptor, probe)
    if (distance >= threshold) continue
    if (best === null || distance < best.distance) {
      best = { personId: record.personId, descriptor: record.descriptor, distance }
    }
  }
  return best
}

// A browser that refuses storage leaves the list empty; the person picker is
// then the fallback and nothing is lost that the app promised to keep.
export function loadFaces(
  storage: FaceStorage | null = browserStorage(),
): FaceRecord[] {
  if (storage === null) return []
  try {
    const raw = storage.getItem(FACE_STORAGE_KEY)
    return raw === null ? [] : parseFaces(raw)
  } catch {
    return []
  }
}

// One face per person: registering again replaces the earlier descriptor
// instead of keeping two, so a person cannot match twice.
export function saveFace(
  record: FaceRecord,
  storage: FaceStorage | null = browserStorage(),
): FaceRecord[] {
  const kept = loadFaces(storage).filter(
    (item) => item.personId !== record.personId,
  )
  return writeFaces([...kept, record], storage)
}

export function deleteFace(
  personId: string,
  storage: FaceStorage | null = browserStorage(),
): FaceRecord[] {
  return writeFaces(
    loadFaces(storage).filter((item) => item.personId !== personId),
    storage,
  )
}

function writeFaces(
  records: FaceRecord[],
  storage: FaceStorage | null,
): FaceRecord[] {
  if (storage === null) return records
  try {
    if (records.length === 0) storage.removeItem(FACE_STORAGE_KEY)
    else storage.setItem(FACE_STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Same rule as the entry store: the session keeps working from memory.
  }
  return records
}

function parseFaces(raw: string): FaceRecord[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isFaceRecord)
  } catch {
    return []
  }
}

function isFaceRecord(value: unknown): value is FaceRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as { personId?: unknown; descriptor?: unknown }
  return (
    typeof record.personId === 'string' &&
    record.personId !== '' &&
    Array.isArray(record.descriptor) &&
    record.descriptor.length > 0 &&
    record.descriptor.every(
      (item) => typeof item === 'number' && Number.isFinite(item),
    )
  )
}

function browserStorage(): FaceStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
