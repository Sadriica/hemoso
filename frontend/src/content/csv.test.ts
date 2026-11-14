import { describe, expect, it } from 'vitest'
import { CsvError, parseCsv } from './csv'

describe('parseCsv', () => {
  it('parses a simple table keyed by header', () => {
    expect(parseCsv('id,name\na,Alpha\nb,Beta\n')).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ])
  })

  it('keeps commas inside quoted fields', () => {
    expect(parseCsv('id,text\na,"hello, world"\n')[0].text).toBe('hello, world')
  })

  it('turns doubled quotes into a single quote', () => {
    expect(parseCsv('id,text\na,"say ""hi"""\n')[0].text).toBe('say "hi"')
  })

  it('handles CRLF line endings', () => {
    const records = parseCsv('id,name\r\na,Alpha\r\nb,Beta\r\n')
    expect(records).toHaveLength(2)
    expect(records[1].name).toBe('Beta')
  })

  it('keeps empty cells', () => {
    expect(parseCsv('id,name,note\na,,x\n')).toEqual([
      { id: 'a', name: '', note: 'x' },
    ])
  })

  it('skips comment and blank lines', () => {
    expect(parseCsv('# placeholder\nid,name\n\na,Alpha\n')).toEqual([
      { id: 'a', name: 'Alpha' },
    ])
  })

  it('strips a leading UTF-8 BOM and trims header names', () => {
    const records = parseCsv('\uFEFFid , name\na,Alpha\n')
    expect(records).toEqual([{ id: 'a', name: 'Alpha' }])
  })

  it('throws a CsvError naming the line with the wrong number of columns', () => {
    try {
      parseCsv('id,name,unit\na,Alpha\n')
      throw new Error('did not throw')
    } catch (error) {
      expect(error).toBeInstanceOf(CsvError)
      const csvError = error as CsvError
      expect(csvError.line).toBe(2)
      expect(csvError.message).toContain('Line 2')
    }
  })
})
