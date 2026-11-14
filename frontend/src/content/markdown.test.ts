import { describe, expect, it } from 'vitest'
import { parseIndicatorMarkdown } from './markdown'

const sample = [
  '# Example indicator',
  '',
  '## Why it matters',
  'Reason text. Assumption.',
  '',
  '## How spaceflight affects it',
  'Effect text.',
  '',
  '## Measurement steps',
  '1. First step.',
  '2. Second step.',
  '',
  '## Status and next steps',
  '### example_level',
  'Status text and next step.',
  '### other_level',
  'Other status text.',
  '',
  '## How to prevent problems',
  'Prevent text.',
  '',
  '## Sources',
  '- Example title: https://example.org',
].join('\n')

describe('parseIndicatorMarkdown', () => {
  it('reads every section in order', () => {
    const { content } = parseIndicatorMarkdown('example_indicator', sample)
    expect(content.indicatorId).toBe('example_indicator')
    expect(content.name).toBe('Example indicator')
    expect(content.whyItMatters).toBe('Reason text. Assumption.')
    expect(content.howSpaceflightAffectsIt).toBe('Effect text.')
    expect(content.howToPrevent).toBe('Prevent text.')
  })

  it('collects measurement steps from the numbered list', () => {
    const { content } = parseIndicatorMarkdown('example_indicator', sample)
    expect(content.measurementSteps).toEqual(['First step.', 'Second step.'])
  })

  it('puts each attention level under statusAndNextSteps', () => {
    const { content } = parseIndicatorMarkdown('example_indicator', sample)
    expect(content.statusAndNextSteps).toEqual({
      example_level: 'Status text and next step.',
      other_level: 'Other status text.',
    })
  })

  it('parses sources from "- Title: link" lines', () => {
    const { content } = parseIndicatorMarkdown('example_indicator', sample)
    expect(content.sources).toEqual([
      { title: 'Example title', url: 'https://example.org' },
    ])
  })

  it('keeps a bare link under Sources, with the link as its title', () => {
    const text = [
      '# Example indicator',
      '## Why it matters',
      'Reason text.',
      '## Sources',
      '- https://example.org/bare',
    ].join('\n')
    const { content } = parseIndicatorMarkdown('example_indicator', text)
    expect(content.sources).toEqual([
      { title: 'https://example.org/bare', url: 'https://example.org/bare' },
    ])
  })

  it('marks Assumption when a section says Assumption and there is no link', () => {
    const text = [
      '# Example indicator',
      '## Why it matters',
      'Reason text. Assumption.',
    ].join('\n')
    const { content } = parseIndicatorMarkdown('example_indicator', text)
    expect(content.sources).toEqual(['Assumption'])
  })

  it('reports no problems for a file with all headings in order', () => {
    const { problems } = parseIndicatorMarkdown('example_indicator', sample)
    expect(problems).toEqual([])
  })

  it('reports an unknown heading', () => {
    const text = [
      '# Example indicator',
      '## Unknown section',
      'Some text.',
      '## Sources',
      '- Example title: https://example.org',
    ].join('\n')
    const { problems } = parseIndicatorMarkdown('example_indicator', text)
    expect(problems).toContain("Unknown heading '## Unknown section'.")
  })

  it('reports a heading that is out of order', () => {
    const text = [
      '# Example indicator',
      '## Sources',
      '- Example title: https://example.org',
      '## Why it matters',
      'Reason text.',
    ].join('\n')
    const { problems } = parseIndicatorMarkdown('example_indicator', text)
    expect(problems).toContain("Heading '## Why it matters' is out of order.")
  })

  it('reports a missing heading', () => {
    const text = ['# Example indicator', '## Why it matters', 'Reason text.'].join(
      '\n',
    )
    const { problems } = parseIndicatorMarkdown('example_indicator', text)
    expect(problems).toContain("Missing heading '## Sources'.")
  })

  it('reports a level heading outside "Status and next steps"', () => {
    const text = [
      '# Example indicator',
      '## Why it matters',
      '### stray_level',
      'Some text.',
    ].join('\n')
    const { problems } = parseIndicatorMarkdown('example_indicator', text)
    expect(problems).toContain(
      'Heading \'### stray_level\' is outside "Status and next steps".',
    )
  })
})
