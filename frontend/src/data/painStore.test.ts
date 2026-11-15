import { describe, expect, it } from 'vitest'
import {
  PAIN_STORAGE_KEY,
  readPainReports,
  removePainReport,
  savePainReport,
  type PainReport,
} from './painStore'

function memoryStorage(seed?: string) {
  const data = new Map<string, string>()
  if (seed !== undefined) data.set(PAIN_STORAGE_KEY, seed)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    raw: () => data.get(PAIN_STORAGE_KEY) ?? null,
  }
}

const REPORT = {
  personId: 'demo_astronaut_1',
  missionDay: 41,
  time: '09:15',
  regions: [{ regionId: 'left_knee', kind: 'pain' as const, intensity: 6 }],
  note: '  after exercise  ',
}

describe('pain store', () => {
  it('saves a report and reads it back', () => {
    const storage = memoryStorage()
    const { report, saved } = savePainReport(REPORT, storage)
    expect(saved).toBe(true)
    expect(report.id).not.toBe('')
    expect(report.note).toBe('after exercise')

    const read = readPainReports(REPORT.personId, storage)
    expect(read).toHaveLength(1)
    expect(read[0]?.regions).toEqual([
      { regionId: 'left_knee', kind: 'pain', intensity: 6 },
    ])
  })

  it('keeps one key for every report of one person', () => {
    const storage = memoryStorage()
    savePainReport(REPORT, storage)
    savePainReport({ ...REPORT, missionDay: 42 }, storage)
    expect(readPainReports(REPORT.personId, storage)).toHaveLength(2)
    const parsed = JSON.parse(storage.raw() ?? '{}') as { version: number }
    expect(parsed.version).toBe(1)
  })

  it('lists the newest day and the latest time first', () => {
    const storage = memoryStorage()
    savePainReport({ ...REPORT, missionDay: 41, time: '08:00' }, storage)
    savePainReport({ ...REPORT, missionDay: 43, time: '07:00' }, storage)
    savePainReport({ ...REPORT, missionDay: 41, time: '19:30' }, storage)
    const days = readPainReports(REPORT.personId, storage).map(
      (report: PainReport) => `${report.missionDay} ${report.time}`,
    )
    expect(days).toEqual(['43 07:00', '41 19:30', '41 08:00'])
  })

  it('reads only the reports of the person asked for', () => {
    const storage = memoryStorage()
    savePainReport(REPORT, storage)
    savePainReport({ ...REPORT, personId: 'demo_astronaut_2' }, storage)
    expect(readPainReports('demo_astronaut_2', storage)).toHaveLength(1)
    expect(readPainReports('demo_astronaut_3', storage)).toEqual([])
  })

  it('rounds the strength and keeps it between 0 and 10', () => {
    const storage = memoryStorage()
    savePainReport(
      {
        ...REPORT,
        regions: [
          { regionId: 'head', kind: 'burn', intensity: 12.4 },
          { regionId: 'neck', kind: 'bruise', intensity: -3 },
        ],
      },
      storage,
    )
    const marks = readPainReports(REPORT.personId, storage)[0]?.regions ?? []
    expect(marks.map((mark) => mark.intensity)).toEqual([10, 0])
  })

  it('gives no reports for an empty storage', () => {
    expect(readPainReports(REPORT.personId, memoryStorage())).toEqual([])
  })

  it('gives no reports when the stored text is not JSON', () => {
    expect(readPainReports(REPORT.personId, memoryStorage('{oops'))).toEqual([])
  })

  it('gives no reports for a payload of another version', () => {
    const payload = JSON.stringify({ version: 2, reports: [] })
    expect(readPainReports(REPORT.personId, memoryStorage(payload))).toEqual([])
  })

  it('drops the rows it cannot read and keeps the ones it can', () => {
    const good = {
      id: 'kept',
      ...REPORT,
      note: '',
    }
    const payload = JSON.stringify({
      version: 1,
      reports: [
        good,
        { id: 'no-day', ...REPORT, missionDay: 0 },
        { id: 'bad-time', ...REPORT, time: '9:00' },
        { id: 'no-regions', ...REPORT, regions: [] },
        { id: 'bad-kind', ...REPORT, regions: [{ regionId: 'head', kind: 'sore', intensity: 3 }] },
        { id: 'eleven', ...REPORT, regions: [{ regionId: 'head', kind: 'pain', intensity: 11 }] },
        { id: 'bad-note', ...REPORT, note: 3 },
      ],
    })
    const read = readPainReports(REPORT.personId, memoryStorage(payload))
    expect(read.map((report) => report.id)).toEqual(['kept'])
  })

  it('saves nothing when the browser blocks the storage', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const { saved } = savePainReport(REPORT, storage)
    expect(saved).toBe(false)
    expect(readPainReports(REPORT.personId, storage)).toEqual([])
  })

  it('reports a write that fails without throwing', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(savePainReport(REPORT, storage).saved).toBe(false)
  })

  it('keeps the report in memory when there is no storage at all', () => {
    const { report, saved } = savePainReport(REPORT, null)
    expect(saved).toBe(false)
    expect(report.regions).toHaveLength(1)
    expect(readPainReports(REPORT.personId, null)).toEqual([])
  })

  it('removes one report and keeps the others, of any person', () => {
    const storage = memoryStorage()
    const first = savePainReport(REPORT, storage).report
    const second = savePainReport({ ...REPORT, missionDay: 42 }, storage).report
    const other = savePainReport({ ...REPORT, personId: 'demo_astronaut_2' }, storage).report

    expect(removePainReport(first.id, storage)).toBe(true)
    expect(readPainReports(REPORT.personId, storage).map((r) => r.id)).toEqual([second.id])
    expect(readPainReports('demo_astronaut_2', storage).map((r) => r.id)).toEqual([other.id])
  })

  it('treats an id that is not stored as already removed', () => {
    const storage = memoryStorage()
    savePainReport(REPORT, storage)
    expect(removePainReport('missing', storage)).toBe(true)
    expect(readPainReports(REPORT.personId, storage)).toHaveLength(1)
  })

  it('says so when the removal cannot be written', () => {
    const storage = memoryStorage()
    const { report } = savePainReport(REPORT, storage)
    const blocked = {
      getItem: storage.getItem,
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(removePainReport(report.id, blocked)).toBe(false)
    expect(removePainReport(report.id, null)).toBe(false)
  })
})
