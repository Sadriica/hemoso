import { describe, expect, it } from 'vitest'
import type { AttentionRule, Entry } from '../domain/types'
import { rowStatus } from './historyRows'

const rule: AttentionRule = {
  indicatorId: 'x',
  side: 'above',
  threshold: 100,
  attentionLevel: 'consult',
  notify: 'crew',
  sources: ['Assumption'],
}

function entry(
  day: number,
  time: string,
  value: number,
  context: Entry['context'] = 'rest',
): Entry {
  return {
    id: `${day}:${time}:${context}`,
    personId: 'p',
    indicatorId: 'x',
    value,
    unit: 'bpm',
    missionDay: day,
    time,
    context,
  }
}

const history = [
  entry(1, '07:00', 70),
  entry(2, '07:00', 72),
  entry(3, '07:00', 71),
  entry(4, '07:00', 73),
  entry(5, '07:00', 150),
]

describe('rowStatus', () => {
  it('has no data with fewer than 3 earlier readings', () => {
    expect(rowStatus(history[2], history, [rule], 1).state).toBe('no_data')
    expect(rowStatus(history[0], history, [rule], 1).state).toBe('no_data')
  })

  it('is in range near the own baseline', () => {
    expect(rowStatus(history[3], history, [rule], 1).state).toBe('in_range')
  })

  it('needs review past a threshold and names the level', () => {
    const status = rowStatus(history[4], history, [rule], 1)
    expect(status.state).toBe('needs_review')
    expect(status.level).toBe('consult')
  })

  it('is outside the usual range far from the baseline without a threshold', () => {
    const far = [...history.slice(0, 4), entry(5, '07:00', 90)]
    expect(rowStatus(far[4], far, [rule], 1).state).toBe('outside_range')
  })

  it('ignores later readings and other contexts', () => {
    const mixed = [
      ...history.slice(0, 3),
      entry(3, '18:00', 140, 'after_exercise'),
      entry(4, '07:00', 73),
      entry(9, '07:00', 400),
    ]
    // Day 4 sees only the three resting readings before it.
    expect(rowStatus(mixed[4], mixed, [rule], 1).state).toBe('in_range')
  })
})
