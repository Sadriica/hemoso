import { describe, expect, it } from 'vitest'
import type { Condition } from '../../domain/conditions'
import type { SymptomDef } from '../../domain/symptoms'
import { agreementOf, orderUrgent, reportedRedFlags } from './urgentBoard'

const make = (
  id: string,
  label: Condition['label'],
  contributions: (number | null)[],
  symptoms: string[] = [],
): Condition => ({
  id,
  name: id,
  label,
  score: null,
  source: 'Assumption',
  signals: [
    ...contributions.map((contribution) => ({
      indicatorId: 'glucose_mgdl',
      side: 'above' as const,
      contribution,
      value: contribution === null ? null : 1,
    })),
    ...symptoms.map((symptomId) => ({
      kind: 'symptom' as const,
      symptomId,
      weight: 0.5,
      contribution: 0.5,
    })),
  ],
})

const defs: SymptomDef[] = [
  { id: 'confusion', name: 'Confusion', redFlag: true, shared: true, source: 'Assumption' },
  { id: 'vomiting', name: 'Vomiting', redFlag: true, shared: false, source: 'Assumption' },
  { id: 'thirst', name: 'Thirst', redFlag: false, shared: false, source: 'Assumption' },
]

describe('urgent board', () => {
  it('ranks agreeing, then unmeasured, then opposed', () => {
    expect(agreementOf(make('a', 'urgent', [1]))).toBe(0)
    expect(agreementOf(make('b', 'urgent', [null]))).toBe(1)
    expect(agreementOf(make('c', 'urgent', [0]))).toBe(2)
  })

  it('orders urgent rows by agreement, keeping input order inside a rank', () => {
    const list = [
      make('opposed', 'urgent', [0]),
      make('low', 'low', [0]),
      make('agree1', 'urgent', [1]),
      make('agree2', 'urgent', [0.5]),
    ]
    expect(orderUrgent(list).map((item) => item.id)).toEqual([
      'agree1',
      'agree2',
      'opposed',
    ])
  })

  it('names each reported red flag once', () => {
    const list = [
      make('x', 'urgent', [1], ['confusion', 'thirst']),
      make('y', 'urgent', [0], ['confusion', 'vomiting']),
    ]
    expect(reportedRedFlags(list, defs)).toEqual(['Confusion', 'Vomiting'])
    expect(reportedRedFlags([make('z', 'low', [0], ['confusion'])], defs)).toEqual([])
  })
})
