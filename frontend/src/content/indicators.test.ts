import { describe, expect, it } from 'vitest'
import { parseIndicators } from './indicators'

const header = 'id,name,unit,direction,measured_on_board,hazards,source\n'

describe('parseIndicators', () => {
  it('parses a valid indicator row', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n',
      problems,
    )
    expect(indicators).toHaveLength(1)
    expect(indicators[0].id).toBe('example_indicator')
    expect(indicators[0].hazards).toEqual(['isolation_and_confinement'])
    expect(problems).toEqual([])
  })

  it('reads min_spread when the column is there', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      'id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n' +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,4,A,cardiovascular,Assumption\n',
      problems,
    )
    expect(indicators[0].minSpread).toBe(4)
    expect(problems).toEqual([])
  })

  it('reads a file without the min_spread column as no floor', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n',
      problems,
    )
    expect(indicators[0].minSpread).toBe(0)
    expect(problems).toEqual([])
  })

  it('reports a min_spread that is not a number greater than 0', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      'id,name,unit,direction,measured_on_board,hazards,min_spread,source\n' +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,0,Assumption\n',
      problems,
    )
    expect(indicators[0].minSpread).toBe(0)
    expect(problems).toEqual([
      "Indicator 'example_indicator' has an invalid min_spread '0'.",
    ])
  })

  it('reports an unknown hazard and drops it from the indicator', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,gravity_fields space_weather,Assumption\n',
      problems,
    )
    expect(indicators[0].hazards).toEqual(['gravity_fields'])
    expect(problems).toEqual([
      "Indicator 'example_indicator' has unknown hazard 'space_weather'.",
    ])
  })

  it('reports an unknown direction and keeps the indicator', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,Example indicator,example_unit,sideways,example measurement method,isolation_and_confinement,Assumption\n',
      problems,
    )
    expect(indicators).toHaveLength(1)
    expect(
      problems.some((problem) => problem.includes("unknown direction 'sideways'")),
    ).toBe(true)
  })

  it('reports a duplicate indicator id and keeps the first', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,First,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n' +
        'example_indicator,Second,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n',
      problems,
    )
    expect(indicators).toHaveLength(1)
    expect(indicators[0].name).toBe('First')
    expect(
      problems.some((problem) =>
        problem.includes("Duplicate indicator id 'example_indicator'"),
      ),
    ).toBe(true)
  })

  it('reports an empty indicator id', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        ',Empty name,example_unit,higher,example measurement method,isolation_and_confinement,Assumption\n',
      problems,
    )
    expect(indicators).toHaveLength(0)
    expect(problems.some((problem) => problem.includes('empty id'))).toBe(true)
  })

  it('reports a missing source', () => {
    const problems: string[] = []
    parseIndicators(
      'config/data/indicators.csv',
      header +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,\n',
      problems,
    )
    expect(
      problems.some((problem) => problem.includes('no source or Assumption')),
    ).toBe(true)
  })

  it('reports a malformed row and returns an empty list', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header + 'example_indicator,Example indicator,example_unit,higher\n',
      problems,
    )
    expect(indicators).toEqual([])
    expect(problems.some((problem) => problem.includes('Malformed row'))).toBe(
      true,
    )
  })

  it('reads every link of a source cell: the real hr_bpm row', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      header +
        'hr_bpm,Heart rate,bpm,both,Bio-Monitor smart shirt or ECG,gravity_fields,https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp https://www.nasa.gov/hrp/hazard-gravity-fields/\n',
      problems,
    )
    expect(problems).toEqual([])
    expect(indicators[0].sources).toEqual([
      {
        title: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp',
        url: 'https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp',
      },
      {
        title: 'https://www.nasa.gov/hrp/hazard-gravity-fields/',
        url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/',
      },
    ])
  })

  it('reports a header without source once and reads no rows', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      'id,name,unit,direction,measured_on_board,hazards\n' +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement\n',
      problems,
    )
    expect(indicators).toEqual([])
    expect(problems).toEqual([
      "Missing column 'source' in config/data/indicators.csv.",
    ])
  })

  it('accepts the ten columns of FORMATS.md, which the app does not all read', () => {
    const problems: string[] = []
    const indicators = parseIndicators(
      'config/data/indicators.csv',
      'id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n' +
        'example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,1,A,neuro_behavioural,Assumption\n',
      problems,
    )
    expect(problems).toEqual([])
    expect(indicators).toHaveLength(1)
    expect(indicators[0].id).toBe('example_indicator')
  })
})
