import { describe, expect, it } from 'vitest'
import { loadContent } from './load'

const indicatorsCsv =
  'id,name,unit,direction,measured_on_board,hazards,source\n' +
  'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n'

// The two ### headings every content file carries (FORMATS.md section 3).
const baselineStatus =
  '### in_range\nExample text for the usual range. Assumption.\n' +
  '### outside_range\nExample text outside the usual range. Assumption.\n'

function contentFile(name: string, levels = ''): string {
  return contentFileWithStatus(name, baselineStatus + levels)
}

function contentFileWithStatus(name: string, status: string): string {
  return (
    `# ${name}\n\n` +
    '## Why it matters\nReason. Assumption.\n\n' +
    '## How spaceflight affects it\nEffect. Assumption.\n\n' +
    '## Measurement steps\n1. Step one.\n\n' +
    '## Status and next steps\n' +
    status +
    '\n## How to prevent problems\nGuidance. Assumption.\n\n' +
    '## Sources\n- Example title: https://example.org\n'
  )
}

describe('loadContent', () => {
  it('falls back to placeholders when config has no files', () => {
    const result = loadContent({})
    expect(result.usingPlaceholders).toBe(true)
    expect(result.indicators.map((indicator) => indicator.id)).toEqual([
      'example_indicator',
    ])
    expect(result.rules).toHaveLength(1)
    expect(result.demoEntries).toHaveLength(10)
    expect(result.contents.example_indicator).toBeDefined()
  })

  it('reports a content file for an unknown indicator', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/content/other_indicator.md':
        '# Other\n\n## Why it matters\nReason.\n',
    }
    const result = loadContent(files)
    expect(
      result.problems.some((problem) =>
        problem.includes("Content file for unknown indicator 'other_indicator'"),
      ),
    ).toBe(true)
  })

  it('reports a missing content file for an indicator with no placeholder', () => {
    const files = {
      'config/data/indicators.csv':
        indicatorsCsv +
        'other_indicator,Other indicator,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n',
    }
    const result = loadContent(files)
    expect(
      result.problems.some((problem) =>
        problem.includes("Missing content file for indicator 'other_indicator'"),
      ),
    ).toBe(true)
  })

  it('reports status text for a level with no matching attention rule', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'example_indicator,above,100,example_level,crew,Assumption\n',
      'config/content/example_indicator.md': contentFile(
        'Example indicator',
        '### example_level\nExample text. Assumption.\n' +
          '### other_level\nOther text. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(
      result.problems.some((problem) =>
        problem.includes(
          "status text for level 'other_level' with no matching attention rule",
        ),
      ),
    ).toBe(true)
  })

  it('reports a rule level with no status text', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'example_indicator,above,100,missing_level,crew,Assumption\n',
      'config/content/example_indicator.md': contentFile(
        'Example indicator',
        '### example_level\nExample text. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(
      result.problems.some((problem) =>
        problem.includes("level 'missing_level' has no status text"),
      ),
    ).toBe(true)
  })

  it('accepts in_range, outside_range and no_data as baseline states', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'example_indicator,above,100,example_level,crew,Assumption\n',
      'config/content/example_indicator.md': contentFile(
        'Example indicator',
        '### no_data\nExample text with no reading yet. Assumption.\n' +
          '### example_level\nExample text. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(result.problems).toEqual([])
    expect(
      Object.keys(result.contents.example_indicator.statusAndNextSteps),
    ).toEqual(['in_range', 'outside_range', 'no_data', 'example_level'])
  })

  it('reports a content file with no in_range status text', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'example_indicator,above,100,example_level,crew,Assumption\n',
      'config/content/example_indicator.md': contentFileWithStatus(
        'Example indicator',
        '### outside_range\nExample text. Assumption.\n' +
          '### example_level\nExample text. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(result.problems).toContain(
      "Indicator 'example_indicator' has no status text for state 'in_range'.",
    )
    expect(
      result.problems.some((problem) => problem.includes("'outside_range'")),
    ).toBe(false)
  })

  it('reports a content file with no outside_range status text', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'example_indicator,above,100,example_level,crew,Assumption\n',
      'config/content/example_indicator.md': contentFileWithStatus(
        'Example indicator',
        '### in_range\nExample text. Assumption.\n' +
          '### example_level\nExample text. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(result.problems).toContain(
      "Indicator 'example_indicator' has no status text for state 'outside_range'.",
    )
    expect(
      result.problems.some((problem) => problem.includes("'in_range'")),
    ).toBe(false)
  })

  it('loads a complete valid config without placeholders or problems', () => {
    const files = {
      'config/data/indicators.csv':
        'id,name,unit,direction,measured_on_board,hazards,source\n' +
        'sample_indicator,Sample indicator,sample_unit,higher,sample measurement method,isolation_and_confinement,Assumption\n',
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'sample_indicator,above,100,sample_level,crew,Assumption\n',
      'config/data/demo_data.csv':
        'person_id,indicator_id,value,unit,mission_day,time\n' +
        'demo_astronaut_1,sample_indicator,1,sample_unit,1,13:30\n',
      'config/content/sample_indicator.md': contentFile(
        'Sample indicator',
        '### sample_level\nSample next step. Assumption.\n',
      ),
    }
    const result = loadContent(files)
    expect(result.usingPlaceholders).toBe(false)
    expect(result.problems).toEqual([])
    expect(result.indicators.map((indicator) => indicator.id)).toEqual([
      'sample_indicator',
    ])
    expect(result.rules).toHaveLength(1)
    expect(result.demoEntries).toHaveLength(1)
    expect(result.contents.sample_indicator).toBeDefined()
  })

  it('drops the placeholder attention rule when indicators.csv is real', () => {
    const files = {
      'config/data/indicators.csv':
        'id,name,unit,direction,measured_on_board,hazards,source\n' +
        'sample_indicator,Sample indicator,sample_unit,higher,sample measurement method,isolation_and_confinement,Assumption\n',
    }
    const result = loadContent(files)
    expect(result.rules).toEqual([])
    expect(result.demoEntries).toEqual([])
    expect(
      result.problems.some((problem) =>
        problem.includes(
          "Unknown indicator id 'example_indicator' in attention rules.",
        ),
      ),
    ).toBe(false)
    expect(
      result.problems.some((problem) =>
        problem.includes("Unknown indicator id 'example_indicator' in demo data."),
      ),
    ).toBe(false)
  })

  it('reports a real attention file with the old five columns once', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,source\n' +
        'example_indicator,above,100,example_level,Assumption\n',
      'config/data/demo_data.csv':
        'person_id,indicator_id,value,unit,mission_day,time\n' +
        'demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n',
      'config/content/example_indicator.md': contentFile('Example indicator', ''),
    }
    const result = loadContent(files)
    expect(result.rules).toEqual([])
    expect(result.problems).toEqual([
      "Missing column 'notify' in config/rules/attention.csv.",
    ])
  })

  it('still reports an unknown indicator in a real attention file', () => {
    const files = {
      'config/data/indicators.csv': indicatorsCsv,
      'config/rules/attention.csv':
        'indicator_id,side,threshold,attention_level,notify,source\n' +
        'other_indicator,above,100,example_level,crew,Assumption\n',
    }
    const result = loadContent(files)
    expect(
      result.problems.some((problem) =>
        problem.includes("Unknown indicator id 'other_indicator'"),
      ),
    ).toBe(true)
  })
})
