import type {
  AttentionRule,
  Entry,
  Indicator,
  IndicatorContent,
} from '../domain/types'
import { parseIndicatorMarkdown } from './markdown'
import { parseIndicators } from './indicators'
import { parseRules } from './rules'
import { parseEntries } from './entries'

import indicatorsPlaceholder from './placeholder/indicators.csv?raw'
import attentionPlaceholder from './placeholder/attention.csv?raw'
import demoDataPlaceholder from './placeholder/demo_data.csv?raw'
import exampleContentPlaceholder from './placeholder/example_indicator.md?raw'

export interface LoadedContent {
  indicators: Indicator[]
  rules: AttentionRule[]
  contents: Record<string, IndicatorContent>
  demoEntries: Entry[]
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
  const rules = parseRules(ATTENTION_FILE, attentionFile.text, indicatorIds, problems)
  if (attentionFile.usedPlaceholder) usingPlaceholders = true

  const demoFile = readConfigFile(files, DEMO_DATA_FILE, demoDataPlaceholder)
  const demoEntries = parseEntries(DEMO_DATA_FILE, demoFile.text, indicators, problems)
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
    contents,
    demoEntries,
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

// Cross-file checks: every ### level in a content file must match an
// attention rule, and every rule level must have ### text.
function checkLevelsAgainstRules(
  indicators: Indicator[],
  rules: AttentionRule[],
  contents: Record<string, IndicatorContent>,
  problems: string[],
): void {
  for (const indicator of indicators) {
    const content = contents[indicator.id]
    if (content === undefined) continue
    const indicatorRules = rules.filter(
      (rule) => rule.indicatorId === indicator.id,
    )
    const ruleLevels = new Set(
      indicatorRules.map((rule) => rule.attentionLevel),
    )
    for (const level of Object.keys(content.statusAndNextSteps)) {
      if (!ruleLevels.has(level)) {
        problems.push(
          `Indicator '${indicator.id}' has status text for level '${level}' with no matching attention rule.`,
        )
      }
    }
    const contentLevels = new Set(Object.keys(content.statusAndNextSteps))
    for (const rule of indicatorRules) {
      if (!contentLevels.has(rule.attentionLevel)) {
        problems.push(
          `Attention rule for '${indicator.id}' level '${rule.attentionLevel}' has no status text.`,
        )
      }
    }
  }
}
