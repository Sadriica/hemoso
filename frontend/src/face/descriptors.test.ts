import { beforeEach, describe, expect, it } from 'vitest'
import {
  FACE_STORAGE_KEY,
  MATCH_THRESHOLD,
  averageDescriptors,
  bestMatch,
  deleteFace,
  euclideanDistance,
  loadFaces,
  saveFace,
  type FaceStorage,
} from './descriptors'

// The matching rules of the face panel, without a camera and without the model:
// plain numbers in, a person id or null out (REQ-36).

beforeEach(() => {
  localStorage.clear()
})

describe('averageDescriptors', () => {
  it('averages each position across the frames', () => {
    expect(
      averageDescriptors([
        [0, 10],
        [2, 20],
        [4, 30],
      ]),
    ).toEqual([2, 20])
  })

  it('returns null when there is no frame to average', () => {
    expect(averageDescriptors([])).toBeNull()
    expect(averageDescriptors([[], []])).toBeNull()
  })

  it('ignores a frame with another number of values', () => {
    expect(averageDescriptors([[0, 0], [2, 4], [1]])).toEqual([1, 2])
  })
})

describe('euclideanDistance', () => {
  it('is zero for the same descriptor', () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0)
  })

  it('measures the straight line between two descriptors', () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
  })

  it('is infinity when the two descriptors have different lengths', () => {
    expect(euclideanDistance([1, 2], [1, 2, 3])).toBe(
      Number.POSITIVE_INFINITY,
    )
  })
})

describe('bestMatch', () => {
  const first = { personId: 'demo_astronaut_1', descriptor: [0, 0] }
  const second = { personId: 'demo_astronaut_2', descriptor: [0.2, 0] }

  it('keeps the threshold stricter than the documentation match', () => {
    expect(MATCH_THRESHOLD).toBe(0.5)
    expect(MATCH_THRESHOLD).toBeLessThan(0.6)
  })

  it('picks the closest saved face under the threshold', () => {
    const match = bestMatch([first, second], [0.18, 0])
    expect(match?.personId).toBe('demo_astronaut_2')
    expect(match?.distance).toBeCloseTo(0.02)
  })

  it('returns null when nothing is close enough', () => {
    expect(bestMatch([first, second], [5, 5])).toBeNull()
  })

  it('returns null with no saved face', () => {
    expect(bestMatch([], [0, 0])).toBeNull()
  })

  it('treats a distance exactly at the threshold as no match', () => {
    const saved = { personId: 'demo_astronaut_1', descriptor: [0, 0] }
    expect(bestMatch([saved], [0.5, 0])).toBeNull()
    expect(bestMatch([saved], [0.49, 0])?.personId).toBe('demo_astronaut_1')
  })

  it('never matches two descriptors of different lengths', () => {
    const saved = { personId: 'demo_astronaut_1', descriptor: [0, 0] }
    expect(bestMatch([saved], [0, 0, 0])).toBeNull()
  })
})

describe('the saved faces in this browser', () => {
  it('stores one descriptor per person under the versioned key', () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    expect(loadFaces()).toEqual([
      { personId: 'demo_astronaut_1', descriptor: [0, 1] },
    ])
    expect(localStorage.getItem(FACE_STORAGE_KEY)).toContain('demo_astronaut_1')
  })

  it('keeps a second person', () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    saveFace({ personId: 'demo_astronaut_2', descriptor: [2, 3] })
    expect(loadFaces().map((record) => record.personId)).toEqual([
      'demo_astronaut_1',
      'demo_astronaut_2',
    ])
  })

  it('replaces the descriptor when the same person registers again', () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    saveFace({ personId: 'demo_astronaut_1', descriptor: [9, 9] })
    expect(loadFaces()).toEqual([
      { personId: 'demo_astronaut_1', descriptor: [9, 9] },
    ])
  })

  it('deletes only the face of that person, and the key with the last one', () => {
    saveFace({ personId: 'demo_astronaut_1', descriptor: [0, 1] })
    saveFace({ personId: 'demo_astronaut_2', descriptor: [2, 3] })
    expect(deleteFace('demo_astronaut_1')).toEqual([
      { personId: 'demo_astronaut_2', descriptor: [2, 3] },
    ])
    expect(deleteFace('demo_astronaut_2')).toEqual([])
    expect(localStorage.getItem(FACE_STORAGE_KEY)).toBeNull()
  })

  it('starts empty', () => {
    expect(loadFaces()).toEqual([])
  })

  it('drops a stored entry that is not a face record', () => {
    localStorage.setItem(
      FACE_STORAGE_KEY,
      JSON.stringify([
        { personId: 'demo_astronaut_1', descriptor: [0, 1] },
        { personId: '', descriptor: [0, 1] },
        { personId: 'demo_astronaut_2', descriptor: [] },
        { personId: 'demo_astronaut_3', descriptor: ['a'] },
        { descriptor: [0, 1] },
        'nonsense',
      ]),
    )
    expect(loadFaces()).toEqual([
      { personId: 'demo_astronaut_1', descriptor: [0, 1] },
    ])
  })

  it('returns nothing when the stored text is not JSON', () => {
    localStorage.setItem(FACE_STORAGE_KEY, '{not json')
    expect(loadFaces()).toEqual([])
  })

  it('works from memory when the browser refuses storage', () => {
    const blocked: FaceStorage = {
      getItem() {
        throw new Error('storage is blocked')
      },
      setItem() {
        throw new Error('storage is blocked')
      },
      removeItem() {
        throw new Error('storage is blocked')
      },
    }
    expect(loadFaces(blocked)).toEqual([])
    const records = saveFace(
      { personId: 'demo_astronaut_1', descriptor: [0, 1] },
      blocked,
    )
    expect(records).toEqual([
      { personId: 'demo_astronaut_1', descriptor: [0, 1] },
    ])
    expect(deleteFace('demo_astronaut_1', blocked)).toEqual([])
    expect(loadFaces(null)).toEqual([])
  })
})
