import type { IndicatorContent, Source } from '../domain/types'

// Splits an indicator's .md into the fixed FORMATS.md headings, in order.
// Output is plain text, never HTML. The word "Assumption" anywhere in a
// section marks that section as an assumption when no source line exists.
// Structural problems (unknown, out-of-order or missing headings) are
// returned for load.ts to report.

interface ParsedIndicatorMarkdown {
  content: IndicatorContent
  problems: string[]
}

const SECTION_ORDER: readonly string[] = [
  'Why it matters',
  'How spaceflight affects it',
  'Measurement steps',
  'Status and next steps',
  'How to prevent problems',
  'Sources',
]

type SectionKey =
  | 'why'
  | 'spaceflight'
  | 'steps'
  | 'status'
  | 'prevent'
  | 'sources'

const SECTION_KEYS: Record<string, SectionKey> = {
  'Why it matters': 'why',
  'How spaceflight affects it': 'spaceflight',
  'Measurement steps': 'steps',
  'Status and next steps': 'status',
  'How to prevent problems': 'prevent',
  'Sources': 'sources',
}

export function parseIndicatorMarkdown(
  id: string,
  text: string,
): ParsedIndicatorMarkdown {
  const problems: string[] = []
  let name = id
  let current: SectionKey | 'none' = 'none'
  let currentLevel = ''
  let lastSectionIndex = -1
  const seenHeadings = new Set<string>()

  const why: string[] = []
  const spaceflight: string[] = []
  const steps: string[] = []
  const prevent: string[] = []
  const sourceBodies: string[] = []
  const statusAndNextSteps: Record<string, string> = {}

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue

    const nameMatch = line.match(/^#\s+(.+)$/)
    if (nameMatch) {
      name = nameMatch[1].trim()
      continue
    }

    const h2 = line.match(/^##\s+(.+)$/)
    if (h2) {
      const heading = h2[1].trim()
      const index = SECTION_ORDER.indexOf(heading)
      if (index === -1) {
        problems.push(`Unknown heading '## ${heading}'.`)
        current = 'none'
      } else {
        if (index < lastSectionIndex) {
          problems.push(`Heading '## ${heading}' is out of order.`)
        }
        lastSectionIndex = Math.max(lastSectionIndex, index)
        seenHeadings.add(heading)
        current = SECTION_KEYS[heading]
      }
      currentLevel = ''
      continue
    }

    const h3 = line.match(/^###\s+(.+)$/)
    if (h3) {
      if (current === 'status') {
        currentLevel = h3[1].trim()
        statusAndNextSteps[currentLevel] = ''
      } else {
        problems.push(
          `Heading '### ${h3[1].trim()}' is outside "Status and next steps".`,
        )
      }
      continue
    }

    switch (current) {
      case 'why':
        why.push(line)
        break
      case 'spaceflight':
        spaceflight.push(line)
        break
      case 'steps': {
        const step = matchStep(line)
        if (step !== null) steps.push(step)
        break
      }
      case 'status':
        if (currentLevel !== '') {
          statusAndNextSteps[currentLevel] = append(
            statusAndNextSteps[currentLevel],
            line,
          )
        }
        break
      case 'prevent':
        prevent.push(line)
        break
      case 'sources':
        if (line.startsWith('- ')) sourceBodies.push(line.slice(2).trim())
        break
      case 'none':
        break
    }
  }

  for (const heading of SECTION_ORDER) {
    if (!seenHeadings.has(heading)) {
      problems.push(`Missing heading '## ${heading}'.`)
    }
  }

  const allText = [
    ...why,
    ...spaceflight,
    ...steps,
    ...prevent,
    ...Object.values(statusAndNextSteps),
  ].join(' ')

  return {
    content: {
      indicatorId: id,
      name,
      whyItMatters: joinLines(why),
      howSpaceflightAffectsIt: joinLines(spaceflight),
      measurementSteps: steps,
      statusAndNextSteps,
      howToPrevent: joinLines(prevent),
      sources: parseSources(sourceBodies, allText),
    },
    problems,
  }
}

function matchStep(line: string): string | null {
  const match = line.match(/^\d+\.\s+(.+)$/)
  return match ? match[1].trim() : null
}

function joinLines(parts: string[]): string {
  return parts.join(' ').trim()
}

function append(existing: string, next: string): string {
  return existing === '' ? next : `${existing} ${next}`
}

function parseSources(sourceBodies: string[], allText: string): Source[] {
  const sources: Source[] = []
  for (const body of sourceBodies) {
    const source = parseSourceLine(body)
    if (source !== null && !containsSource(sources, source)) {
      sources.push(source)
    }
  }
  const marked = `${allText} ${sourceBodies.join(' ')}`
  if (sources.length === 0 && /\bAssumption\b/.test(marked)) {
    sources.push('Assumption')
  }
  return sources
}

function parseSourceLine(body: string): Source | null {
  const link = body.match(/^(.*?):\s+(https?:\/\/\S+)\s*$/)
  if (link) return { title: link[1].trim(), url: link[2] }
  if (body === 'Assumption') return 'Assumption'
  return null
}

function containsSource(list: Source[], source: Source): boolean {
  if (source === 'Assumption') return list.includes('Assumption')
  return list.some((entry) => entry !== 'Assumption' && entry.url === source.url)
}
