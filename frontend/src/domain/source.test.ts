import { describe, expect, it } from 'vitest'
import { parseSources } from './source'

describe('parseSources', () => {
  it('reads the word Assumption on its own', () => {
    expect(parseSources('Assumption')).toEqual(['Assumption'])
  })

  it('reads one bare link as a source titled with the link', () => {
    expect(parseSources('https://example.org/a')).toEqual([
      { title: 'https://example.org/a', url: 'https://example.org/a' },
    ])
  })

  it('reads several links separated by spaces', () => {
    expect(
      parseSources('https://example.org/a https://example.org/b'),
    ).toEqual([
      { title: 'https://example.org/a', url: 'https://example.org/a' },
      { title: 'https://example.org/b', url: 'https://example.org/b' },
    ])
  })

  it('reads the real hr_bpm source cell of config/data/indicators.csv', () => {
    const sources = parseSources(
      'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp https://www.nasa.gov/hrp/hazard-gravity-fields/',
    )
    expect(sources).not.toBeNull()
    expect(sources).toHaveLength(2)
    expect(sources?.[0]).toMatchObject({
      url: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp',
    })
    expect(sources?.[1]).toMatchObject({
      url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/',
    })
  })

  it('ignores spaces around the cell', () => {
    expect(parseSources('  Assumption  ')).toEqual(['Assumption'])
  })

  it('rejects an empty cell', () => {
    expect(parseSources('')).toBeNull()
    expect(parseSources('   ')).toBeNull()
  })

  it('rejects a token that is not a link', () => {
    expect(parseSources('see the note')).toBeNull()
    expect(parseSources('https://example.org/a note')).toBeNull()
  })

  it('rejects Assumption together with a link', () => {
    expect(parseSources('Assumption https://example.org/a')).toBeNull()
  })

  it('rejects a link of another scheme', () => {
    expect(parseSources('ftp://example.org/a')).toBeNull()
  })
})
