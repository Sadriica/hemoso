// Types the app reads from config/ (FORMATS.md section 3) and passes between
// layers. These are the version 2 shapes from
// team/eng2/notes/frontend-architecture.md.

export type Direction = 'higher' | 'lower' | 'both'

export type Source = { title: string; url: string } | 'Assumption'

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
}

export type Attention =
  | { kind: 'in_range' }
  | { kind: 'attention'; level: string; rule: AttentionRule }
  | { kind: 'no_data' }
