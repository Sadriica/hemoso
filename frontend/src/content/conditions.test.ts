import { describe, expect, it } from 'vitest'
import { parseConditions } from './conditions'
import { loadContent } from './load'

const HEADER = 'condition_id,name,based_on,source'
const ids = new Set(['hr_bpm', 'glucose_mgdl'])

function parse(rows: string[]): { problems: string[]; result: ReturnType<typeof parseConditions> } {
  const problems: string[] = []
  const result = parseConditions('conditions.csv', [HEADER, ...rows].join('\n'), ids, problems)
  return { problems, result }
}

describe('parseConditions', () => {
  it('reads the id, the name, the signals with their side and the source', () => {
    const { problems, result } = parse([
      'fever,Fever,hr_bpm:above glucose_mgdl:below,https://example.org/a',
      'low_mood,Low mood,hr_bpm:below,Assumption',
    ])
    expect(problems).toEqual([])
    expect(result).toEqual([
      {
        id: 'fever',
        name: 'Fever',
        signals: [
          { indicatorId: 'hr_bpm', side: 'above' },
          { indicatorId: 'glucose_mgdl', side: 'below' },
        ],
        symptoms: [],
        source: 'https://example.org/a',
      },
      {
        id: 'low_mood',
        name: 'Low mood',
        signals: [{ indicatorId: 'hr_bpm', side: 'below' }],
        symptoms: [],
        source: 'Assumption',
      },
    ])
  })

  it('keeps a signal with no side or an unknown indicator, and reports it', () => {
    const { problems, result } = parse(['x,Example,hr_bpm nope:above,Assumption'])
    expect(result[0].signals).toEqual([
      { indicatorId: 'hr_bpm', side: null },
      { indicatorId: 'nope', side: 'above' },
    ])
    expect(problems).toHaveLength(2)
  })

  it('leaves out a row with no source and a duplicate id', () => {
    const { problems, result } = parse([
      'a,First,hr_bpm:above,',
      'b,Second,hr_bpm:above,Assumption',
      'b,Second again,hr_bpm:above,Assumption',
    ])
    expect(result.map((item) => item.id)).toEqual(['b'])
    expect(problems).toHaveLength(2)
  })
})

describe('parseConditions, the symptoms column', () => {
  const FIVE = 'condition_id,name,based_on,symptoms,source'

  it('reads the symptoms of a five-cell row and leaves a four-cell row empty', () => {
    const problems: string[] = []
    const result = parseConditions(
      'conditions.csv',
      [
        FIVE,
        'a,A,hr_bpm:above,thirst fatigue,Assumption',
        'b,B,hr_bpm:below,Assumption',
      ].join('\n'),
      ids,
      problems,
    )
    expect(problems).toEqual([])
    expect(result.map((item) => item.symptoms)).toEqual([['thirst', 'fatigue'], []])
  })

  it('reads a symptom written twice as one', () => {
    const problems: string[] = []
    const result = parseConditions(
      'conditions.csv',
      [FIVE, 'a,A,hr_bpm:above,shaky shaky,Assumption'].join('\n'),
      ids,
      problems,
    )
    expect(result[0].symptoms).toEqual(['shaky'])
  })
})

describe('config/rules/conditions.csv', () => {
  it('loads with every signal on a known indicator and a side', () => {
    const data = loadContent()
    expect(data.conditions.length).toBeGreaterThan(0)
    const known = new Set(data.indicators.map((item) => item.id))
    for (const condition of data.conditions) {
      for (const signal of condition.signals) {
        expect(known.has(signal.indicatorId)).toBe(true)
        expect(signal.side).not.toBeNull()
      }
    }
  })
})
