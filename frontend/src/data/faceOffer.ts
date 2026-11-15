import { loadFaces } from '../face/descriptors'

// What decides whether the offer to add face sign-in is shown (REQ-36): a
// camera, no face of that person on this device, and no "Not now" from them
// here before. The answer to the offer stays on the device.

const DISMISSED_KEY = 'hemoso:face-offer-dismissed:v1'

function readDismissed(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

/** True once this person said "Not now" on this device. */
export function faceOfferDismissed(personId: string): boolean {
  return readDismissed().includes(personId)
}

export function dismissFaceOffer(personId: string): void {
  try {
    const all = readDismissed()
    if (!all.includes(personId)) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...all, personId]))
    }
  } catch {
    // A blocked storage only means the line comes back on the next sign-in.
  }
}

/** A browser that can open a camera at all. */
export function canUseCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

/** True when a face of this person is saved on this device. */
export function hasFace(personId: string): boolean {
  return loadFaces().some((face) => face.personId === personId)
}
