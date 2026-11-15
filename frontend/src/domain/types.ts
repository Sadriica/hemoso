// Types the app reads from config/ (FORMATS.md section 3) and passes between
// layers. These are the version 2 shapes from
// team/eng2/notes/frontend-architecture.md.

export type Direction = 'higher' | 'lower' | 'both'

export type Source = { title: string; url: string } | 'Assumption'

// Who acts on a crossed attention rule, from least to most severe
// (FORMATS.md section 3, `notify`).
export type Notify = 'crew' | 'cmo' | 'flight_surgeon'

export interface Indicator {
  // config/data/indicators.csv
  id: string
  name: string
  unit: string
  direction: Direction
  measuredOnBoard: string
  hazards: string[]
  sources: Source[]
}

export interface AttentionRule {
  // config/rules/attention.csv
  indicatorId: string
  side: 'below' | 'above'
  threshold: number
  attentionLevel: string
  notify: Notify
  sources: Source[]
}

export interface IndicatorContent {
  // config/content/<id>.md
  indicatorId: string
  name: string
  whyItMatters: string
  howSpaceflightAffectsIt: string
  measurementSteps: string[]
  statusAndNextSteps: Record<string, string>
  howToPrevent: string
  sources: Source[]
}

// What the astronaut was doing when they took the reading (FORMATS.md
// section 3, demo_data.csv `context`). Heart rate and core temperature after
// exercise are a different population from the same values at rest, so a
// reading is only compared with readings in the same context.
export type MeasurementContext =
  | 'rest'
  | 'after_exercise'
  | 'on_waking'
  | 'before_sleep'

export interface Entry {
  // A measurement. The stored columns match config/data/demo_data.csv;
  // `id` is assigned by the app (demo data has no id column, so load.ts
  // derives one from the row).
  id: string
  personId: string
  indicatorId: string
  value: number
  unit: string
  missionDay: number
  time: string // HH:MM
  context: MeasurementContext
}

export type Attention =
  | { kind: 'in_range' }
  | { kind: 'attention'; level: string; rule: AttentionRule }
  // The indicator has no attention rule at all, so the app cannot say whether
  // a value is in range.
  | { kind: 'no_rules' }
  | { kind: 'no_data' }
