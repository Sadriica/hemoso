import { describe, expect, it } from 'vitest'
import { loadContent } from './load'
import { parseSymptomLog, parseSymptoms } from './symptoms'

const HEADER = 'symptom_id,name,red_flag,shared,source'

describe('parseSymptoms', () => {
  it('reads the definitions', () => {
    const problems: string[] = []
    const defs = parseSymptoms(
      'symptoms.csv',
      [HEADER, 'fatigue,Fatigue,no,yes,https://example.org/a', 'confusion,Confusion,yes,no,Assumption'].join('\n'),
      problems,
    )
    expect(problems).toEqual([])
    expect(defs).toEqual([
      { id: 'fatigue', name: 'Fatigue', redFlag: false, shared: true, source: 'https://example.org/a' },
      { id: 'confusion', name: 'Confusion', redFlag: true, shared: false, source: 'Assumption' },
    ])
  })

  it('reports and leaves out a bad id, a duplicate, a yes/no and a source', () => {
    const problems: string[] = []
    const defs = parseSymptoms(
      'symptoms.csv',
      [
        HEADER,
        'Bad Id,Bad,no,no,Assumption',
        'a,A,maybe,no,Assumption',
        'b,B,no,no,',
        'c,C,no,no,Assumption',
        'c,C again,no,no,Assumption',
      ].join('\n'),
      problems,
    )
    expect(defs.map((def) => def.id)).toEqual(['c'])
    expect(problems).toHaveLength(4)
  })
})

describe('parseSymptomLog', () => {
  const defs = parseSymptoms('s.csv', `${HEADER}\nthirst,Thirst,no,no,Assumption`, [])
  const LOG = 'person_id,mission_day,time,symptom_id,severity'

  it('reads the reports and drops a row that breaks the format', () => {
    const problems: string[] = []
    const reports = parseSymptomLog(
      'log.csv',
      [LOG, 'p,12,15:20,thirst,2', 'p,0,15:20,thirst,2', 'p,3,25:00,thirst,1', 'p,3,10:00,unknown,1', 'p,3,10:00,thirst,4'].join('\n'),
      defs,
      problems,
    )
    expect(reports).toEqual([
      { personId: 'p', symptomId: 'thirst', severity: 2, missionDay: 12, time: '15:20' },
    ])
    expect(problems).toHaveLength(4)
  })
})

describe('config/', () => {
  it('loads the symptom files and the demo astronaut rows with no problem', () => {
    const content = loadContent()
    expect(content.problems.filter((problem) => /symptom/i.test(problem))).toEqual([])
    expect(content.symptoms.length).toBeGreaterThan(0)
    expect(content.demoSymptoms.length).toBeGreaterThan(0)
    const known = new Set(content.symptoms.map((def) => def.id))
    for (const rule of content.conditions) {
      for (const id of rule.symptoms) expect(known.has(id)).toBe(true)
    }
  })
})
