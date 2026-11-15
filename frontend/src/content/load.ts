import type {
  AttentionRule,
  ConditionRule,
  Entry,
  Indicator,
  IndicatorContent,
} from '../domain/types'
import { BASELINE_STATES } from '../domain/state'
import { parseIndicatorMarkdown } from './markdown'
import { parseIndicators } from './indicators'
import { parseRules } from './rules'
import { parseConditions } from './conditions'
import { parseEntries } from './entries'
import { parseSymptoms, parseSymptomLog } from './symptoms'
import type { SymptomDef, SymptomReport } from '../domain/symptoms'

import indicatorsPlaceholder from './placeholder/indicators.csv?raw'
import attentionPlaceholder from './placeholder/attention.csv?raw'
import demoDataPlaceholder from './placeholder/demo_data.csv?raw'
import exampleContentPlaceholder from './placeholder/example_indicator.md?raw'

export interface LoadedContent {
  indicators: Indicator[]
  rules: AttentionRule[]
  // The possible conditions of config/rules/conditions.csv (REQ-06); empty
  // while the file is not there.
  conditions: ConditionRule[]
  contents: Record<string, IndicatorContent>
  demoEntries: Entry[]
  // config/data/symptoms.csv and the demo astronaut's symptom_log.csv (T-78);
  // empty while the files are not there, and the symptom layer is then off.
  symptoms: SymptomDef[]
  demoSymptoms: SymptomReport[]
  usingPlaceholders: boolean
  problems: string[]
}

// Read config/ at build time. `files` is injectable so tests can feed bad rows.
const defaultFiles = import.meta.glob('../../../config/**/*.{csv,md}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const placeholderContent: Record<string, string> = {
  example_indicator: exampleContentPlaceholder,
}

const INDICATORS_FILE = 'config/data/indicators.csv'
const ATTENTION_FILE = 'config/rules/attention.csv'
const DEMO_DATA_FILE = 'config/data/demo_data.csv'
const CONDITIONS_FILE = 'config/rules/conditions.csv'
const SYMPTOMS_FILE = 'config/data/symptoms.csv'
const SYMPTOM_LOG_FILE = 'config/data/symptom_log.csv'

export function loadContent(
  files: Record<string, string> = defaultFiles,
): LoadedContent {
  const problems: string[] = []
  let usingPlaceholders = false

  const indicatorsFile = readConfigFile(files, INDICATORS_FILE, indicatorsPlaceholder)
  const indicators = parseIndicators(INDICATORS_FILE, indicatorsFile.text, problems)
  if (indicatorsFile.usedPlaceholder) usingPlaceholders = true

  const indicatorIds = new Set(indicators.map((indicator) => indicator.id))

  const attentionFile = readConfigFile(files, ATTENTION_FILE, attentionPlaceholder)
  const rules = parseRules(
    ATTENTION_FILE,
    attentionFile.text,
    indicatorIds,
    problems,
    {
      // A placeholder attention file names `example_indicator`; with the real
      // indicators.csv that row is dropped, not reported as a content problem.
      skipUnknownIndicators:
        !indicatorsFile.usedPlaceholder && attentionFile.usedPlaceholder,
    },
  )
  if (attentionFile.usedPlaceholder) usingPlaceholders = true

  // The conditions file has no placeholder: without it the panel is not shown.
  const conditionsText = configText(files, CONDITIONS_FILE)
  const conditions =
    conditionsText === undefined
      ? []
      : parseConditions(CONDITIONS_FILE, conditionsText, indicatorIds, problems)

  // The symptom files have no placeholder either: without them the layer is off.
  const symptomsText = configText(files, SYMPTOMS_FILE)
  const symptoms =
    symptomsText === undefined
      ? []
      : parseSymptoms(SYMPTOMS_FILE, symptomsText, problems)
  const logText = configText(files, SYMPTOM_LOG_FILE)
  const demoSymptoms =
    logText === undefined
      ? []
      : parseSymptomLog(SYMPTOM_LOG_FILE, logText, symptoms, problems)

  const demoFile = readConfigFile(files, DEMO_DATA_FILE, demoDataPlaceholder)
  const demoEntries = parseEntries(
    DEMO_DATA_FILE,
    demoFile.text,
    indicators,
    problems,
    {
      // The placeholder demo rows are for `example_indicator`; with the real
      // indicators.csv they are dropped instead of reported as problems.
      skipUnknownIndicators:
        !indicatorsFile.usedPlaceholder && demoFile.usedPlaceholder,
    },
  )
  if (demoFile.usedPlaceholder) usingPlaceholders = true

  for (const id of contentFileIds(files)) {
    if (!indicatorIds.has(id)) {
      problems.push(`Content file for unknown indicator '${id}'.`)
    }
  }

  const contents: Record<string, IndicatorContent> = {}
  for (const indicator of indicators) {
    const contentRaw = configText(files, `config/content/${indicator.id}.md`)
    const placeholder = placeholderContent[indicator.id]
    if (contentRaw === undefined && placeholder === undefined) {
      problems.push(`Missing content file for indicator '${indicator.id}'.`)
      continue
    }
    if (contentRaw === undefined) usingPlaceholders = true
    const parsed = parseIndicatorMarkdown(indicator.id, contentRaw ?? placeholder)
    problems.push(...parsed.problems)
    contents[indicator.id] = parsed.content
    if (parsed.content.sources.length === 0) {
      problems.push(`Indicator '${indicator.id}' has no sources or Assumption.`)
    }
  }

  checkLevelsAgainstRules(indicators, rules, contents, problems)

  return {
    indicators,
    rules,
    conditions,
    contents,
    demoEntries,
    symptoms,
    demoSymptoms,
    usingPlaceholders,
    problems,
  }
}

function readConfigFile(
  files: Record<string, string>,
  name: string,
  placeholder: string,
): { text: string; usedPlaceholder: boolean } {
  const text = configText(files, name)
  if (text === undefined) return { text: placeholder, usedPlaceholder: true }
  return { text, usedPlaceholder: false }
}

function configText(
  files: Record<string, string>,
  relative: string,
): string | undefined {
  const target = `/${relative.replace(/\\/g, '/')}`
  for (const [key, value] of Object.entries(files)) {
    if (`/${key.replace(/\\/g, '/')}`.endsWith(target)) return value
  }
  return undefined
}

function contentFileIds(files: Record<string, string>): string[] {
  const ids: string[] = []
  for (const key of Object.keys(files)) {
    const match = `/${key.replace(/\\/g, '/')}`.match(
      /\/config\/content\/([^/]+)\.md$/,
    )
    if (match) ids.push(match[1])
  }
  return ids
}

// Cross-file checks: the two required baseline states have ### text, every
// other ### level is an attention level with a matching rule, and every rule
// level has ### text. in_range, outside_range and no_data are the baseline
// states of FORMATS.md section 3, so they are not attention levels.
function checkLevelsAgainstRules(
  indicators: Indicator[],
  rules: AttentionRule[],
  contents: Record<string, IndicatorContent>,
  problems: string[],
): void {
  const baselineStates: readonly string[] = BASELINE_STATES
  for (const indicator of indicators) {
    const content = contents[indicator.id]
    if (content === undefined) continue
    const indicatorRules = rules.filter(
      (rule) => rule.indicatorId === indicator.id,
    )
    const ruleLevels = new Set(
      indicatorRules.map((rule) => rule.attentionLevel),
    )
    const contentLevels = new Set(Object.keys(content.statusAndNextSteps))
    for (const state of baselineStates) {
      // no_data is the one baseline state a content file may leave out.
      if (state === 'no_data') continue
      if (!contentLevels.has(state)) {
        problems.push(
          `Indicator '${indicator.id}' has no status text for state '${state}'.`,
        )
      }
    }
    for (const level of contentLevels) {
      if (baselineStates.includes(level)) continue
      if (!ruleLevels.has(level)) {
        problems.push(
          `Indicator '${indicator.id}' has status text for level '${level}' with no matching attention rule.`,
        )
      }
    }
    for (const rule of indicatorRules) {
      if (!contentLevels.has(rule.attentionLevel)) {
        problems.push(
          `Attention rule for '${indicator.id}' level '${rule.attentionLevel}' has no status text.`,
        )
      }
    }
  }
}
