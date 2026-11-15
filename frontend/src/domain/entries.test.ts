import { describe, expect, it } from 'vitest'
import { compareToOwnHistory, latestEntry, newestFirst } from './entries'
import type { Entry } from './types'

function entry(missionDay: number, time: string, value = 1): Entry {
  return {
    id: `x:${missionDay}:${time}:${value}`,
    personId: 'demo_astronaut_1',
    indicatorId: 'example_indicator',
    value,
    unit: 'example_unit',
    missionDay,
    time,
    context: 'rest',
  }
}

describe('latestEntry', () => {
  it('returns null for an empty list', () => {
    expect(latestEntry([])).toBeNull()
  })

  it('picks the latest day', () => {
    const result = latestEntry([entry(1, '13:30'), entry(10, '09:00')])
    expect(result?.missionDay).toBe(10)
  })

  it('picks the latest time on the same day', () => {
    const result = latestEntry([entry(10, '09:00'), entry(10, '13:30')])
    expect(result?.time).toBe('13:30')
  })

  it('picks the later entry when day and time are equal, so a correction shows', () => {
    const first: Entry = { ...entry(10, '13:30'), id: 'first', value: 1 }
    const correction: Entry = { ...entry(10, '13:30'), id: 'correction', value: 2 }
    expect(latestEntry([first, correction])?.id).toBe('correction')
    expect(latestEntry([first, correction])?.value).toBe(2)
  })
})

describe('compareToOwnHistory', () => {
  it('returns null with no entry', () => {
    expect(compareToOwnHistory([])).toBeNull()
  })

  it('returns null with one entry, which has nothing earlier', () => {
    expect(compareToOwnHistory([entry(1, '08:00', 10)])).toBeNull()
  })

  it('takes the median of an odd count of earlier readings', () => {
    // Earlier values 1, 2 and 3: the middle one is 2, and 10 − 2 = +8.
    const result = compareToOwnHistory([
      entry(1, '08:00', 1),
      entry(2, '08:00', 2),
      entry(3, '08:00', 3),
      entry(4, '08:00', 10),
    ])
    expect(result?.latest.value).toBe(10)
    expect(result?.earlierCount).toBe(3)
    expect(result?.earlierMedian).toBe(2)
    expect(result?.difference).toBe(8)
  })

  it('takes the mean of the two middle values of an even count', () => {
    // Earlier values 2 and 4: (2 + 4) / 2 = 3, and 12 − 3 = +9.
    const result = compareToOwnHistory([
      entry(1, '08:00', 2),
      entry(2, '08:00', 4),
      entry(3, '08:00', 12),
    ])
    expect(result?.earlierCount).toBe(2)
    expect(result?.earlierMedian).toBe(3)
    expect(result?.difference).toBe(9)
  })

  it('rounds a half away from zero at the precision of the readings', () => {
    // Earlier values 76 and 77 mean 76.5. The readings are whole numbers, so
    // the median reads 77 and never invents a decimal (STANDARDS.md 3).
    const result = compareToOwnHistory([
      entry(1, '08:00', 76),
      entry(2, '08:00', 77),
      entry(3, '08:00', 80),
    ])
    expect(result?.earlierMedian).toBe(77)
    expect(result?.difference).toBe(3)
  })

  it('keeps one decimal when the readings carry one', () => {
    // Earlier values 36.4 and 36.7 °C mean 36.55, which rounds away from zero
    // to 36.6 at one decimal.
    const result = compareToOwnHistory([
      entry(1, '08:00', 36.4),
      entry(2, '08:00', 36.7),
      entry(3, '08:00', 36.7),
    ])
    expect(result?.earlierMedian).toBe(36.6)
    expect(result?.difference).toBe(0.1)
  })

  it('shows a negative difference when the latest value is lower', () => {
    const result = compareToOwnHistory([
      entry(1, '08:00', 10),
      entry(2, '08:00', 12),
      entry(3, '08:00', 8),
    ])
    expect(result?.difference).toBe(-3)
  })

  it('compares against earlier readings, not against the order of the list', () => {
    const result = compareToOwnHistory([
      entry(2, '08:00', 4),
      entry(1, '08:00', 2),
      entry(3, '08:00', 12),
    ])
    expect(result?.latest.missionDay).toBe(3)
    expect(result?.earlierMedian).toBe(3)
  })

  it('counts a tie on the same day as an earlier reading', () => {
    // On day 5 the later time is the latest; the morning reading is earlier.
    // Earlier values 3 and 10 mean 6.5, which reads 7 for whole numbers.
    const result = compareToOwnHistory([
      entry(4, '08:00', 3),
      entry(5, '09:00', 10),
      entry(5, '13:30', 20),
    ])
    expect(result?.latest.time).toBe('13:30')
    expect(result?.earlierCount).toBe(2)
    expect(result?.earlierMedian).toBe(7)
    expect(result?.difference).toBe(13)
  })

  it('compares only with readings in the same context', () => {
    // The latest reading is at rest; the exercise reading of the same
    // indicator is another population and is left out (FORMATS.md section 3).
    const result = compareToOwnHistory([
      entry(1, '08:00', 70),
      { ...entry(2, '18:00', 140), context: 'after_exercise' },
      entry(3, '08:00', 72),
    ])
    expect(result?.latest.value).toBe(72)
    expect(result?.earlierCount).toBe(1)
    expect(result?.earlierMedian).toBe(70)
    expect(result?.difference).toBe(2)
  })

  it('has nothing to compare when every earlier reading is in another context', () => {
    const result = compareToOwnHistory([
      entry(1, '08:00', 70),
      entry(2, '08:00', 71),
      { ...entry(3, '18:00', 140), context: 'after_exercise' },
    ])
    expect(result).toBeNull()
  })

  it('keeps the reading a correction replaced as the earlier one', () => {
    const first: Entry = { ...entry(5, '13:30', 1), id: 'first' }
    const correction: Entry = { ...entry(5, '13:30', 2), id: 'correction' }
    const result = compareToOwnHistory([first, correction])
    expect(result?.latest.id).toBe('correction')
    expect(result?.earlierCount).toBe(1)
    expect(result?.earlierMedian).toBe(1)
    expect(result?.difference).toBe(1)
  })
})

describe('newestFirst', () => {
  it('puts the latest day first and keeps the list it was given', () => {
    const entries = [
      entry(2, '08:00'),
      entry(10, '08:00'),
      entry(1, '09:00'),
    ]
    const order = newestFirst(entries).map((item) => item.missionDay)
    expect(order).toEqual([10, 2, 1])
    expect(entries.map((item) => item.missionDay)).toEqual([2, 10, 1])
  })

  it('puts the later time first on the same day', () => {
    const entries = [entry(10, '09:00'), entry(10, '13:30')]
    const order = newestFirst(entries).map((item) => item.time)
    expect(order).toEqual(['13:30', '09:00'])
  })

  it('puts a correction above the value it replaced', () => {
    const first: Entry = { ...entry(10, '13:30', 1), id: 'first' }
    const correction: Entry = { ...entry(10, '13:30', 2), id: 'correction' }
    expect(newestFirst([first, correction]).map((item) => item.id)).toEqual([
      'correction',
      'first',
    ])
  })
})
