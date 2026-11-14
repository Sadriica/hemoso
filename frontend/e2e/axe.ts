import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// Serious and critical only: the bar the team agreed for the demo (REQ-15).
const BLOCKING_IMPACT = new Set(['serious', 'critical'])

// Runs axe on the whole page as it stands and fails with the rule, its help
// text and the elements to fix, so a failure can be acted on without opening
// any report.
export async function expectNoBlockingA11yIssues(
  page: Page,
  screen: string,
): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACT.has(violation.impact ?? ''),
  )
  const report = blocking.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help} -> ${violation.nodes
        .map((node) => node.target.join(' '))
        .join(' | ')}`,
  )
  expect(report, `${screen}: blocking accessibility issues`).toEqual([])
}
