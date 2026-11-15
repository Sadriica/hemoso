import { expect, test, type Page } from '@playwright/test'
import { strings } from '../src/strings'
import { REACTION_TRIALS } from '../src/reaction/constants'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from '../src/reaction/ids'
import { reactionStrings } from '../src/reaction/strings'
import { expectNoBlockingA11yIssues } from './axe'
import { readIndicatorRows } from './config'

// The reaction check (REQ-38, T-71) on the real build, by keyboard only: the
// step is in the report phase, it is started and answered with keys, and the
// two results reach the outbox. Phys adds the two indicators in T-72; until
// that row exists the step is hidden by design, so the spec says why it did
// not run instead of failing on a missing feature.
const rows = readIndicatorRows()
const hasReaction =
  rows.ids.includes(REACTION_MEDIAN_ID) && rows.ids.includes(REACTION_LAPSES_ID)
const copy = strings.phases

test('reaction check by keyboard, from the report phase', async ({ page }) => {
  test.skip(
    !hasReaction,
    `config/data/indicators.csv has no ${REACTION_MEDIAN_ID} and ${REACTION_LAPSES_ID} yet (Phys T-72)`,
  )
  // The stimuli wait 2 to 7 s each on purpose; twenty of them take minutes.
  test.setTimeout(300_000)
  const problems = collectProblems(page)

  await test.step('Reach the report phase and the optional step', async () => {
    await page.goto('/')
    const first = page
      .getByRole('group', { name: copy.identify.crewLabel })
      .getByRole('radio')
      .first()
    await first.focus()
    await page.keyboard.press('Space')
    await expect(first).toBeChecked()
    await page.getByRole('button', { name: copy.identify.next }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      copy.report.headline[0],
    )
    await expect(
      page.getByRole('heading', { name: reactionStrings.heading }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: reactionStrings.skip }),
    ).toBeVisible()
    await expectNoBlockingA11yIssues(page, 'Report with the reaction check')
  })

  await test.step('Light is the default; start by keyboard', async () => {
    await expect(
      page.getByRole('radio', { name: reactionStrings.light }),
    ).toBeChecked()
    await page.getByRole('button', { name: reactionStrings.start }).focus()
    await page.keyboard.press('Enter')
    await expect(
      page.locator('[data-reaction-state="waiting"]'),
    ).toBeVisible()
  })

  await test.step('An early answer is a false start, not a trial', async () => {
    await page.keyboard.press('Space')
    await expect(page.getByText(reactionStrings.tooEarly)).toBeVisible()
  })

  await test.step('Twenty trials answered with the space bar', async () => {
    let sawLight = false
    for (let trial = 1; trial <= REACTION_TRIALS; trial += 1) {
      await expect(
        page.locator('[data-reaction-state="stimulus"]'),
        `trial ${trial} never showed its stimulus`,
      ).toBeVisible({ timeout: 10_000 })
      if (!sawLight) {
        await expect(page.getByText(reactionStrings.cue.light)).toBeVisible()
        sawLight = true
      }
      await page.keyboard.press('Space')
    }
    expect(sawLight, 'the visible cue of the stimulus').toBe(true)
  })

  await test.step('The result in words, and the two entries in the outbox', async () => {
    const result = page.locator('[data-reaction-result="median"]')
    await expect(result).toContainText('Median reaction:')
    await expect(result).toContainText(/Lapses: \d+/)
    // No server in the demo: the two entries wait on this device (REQ-28).
    await expect(page.getByText(strings.sync.waiting(2))).toBeVisible()
    await expectNoBlockingA11yIssues(page, 'Report with the reaction result')
  })

  await test.step('A run in sound mode shows the cue, and Escape stops it', async () => {
    await page
      .getByRole('button', { name: reactionStrings.again })
      .focus()
    await page.keyboard.press('Enter')
    await page.getByRole('radio', { name: reactionStrings.sound }).focus()
    await page.keyboard.press('Space')
    await expect(
      page.getByRole('radio', { name: reactionStrings.sound }),
    ).toBeChecked()
    await page.getByRole('button', { name: reactionStrings.start }).focus()
    await page.keyboard.press('Enter')

    await expect(
      page.locator('[data-reaction-state="stimulus"]'),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(reactionStrings.cue.sound)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(reactionStrings.stopped)).toBeVisible()
    // One trial closed, nothing else stored: the first run's two entries stay.
    await expect(page.getByText(strings.sync.waiting(2))).toBeVisible()
  })

  expect(problems, 'console errors and failed requests').toEqual([])
})

function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`))
  page.on('requestfailed', (request) =>
    problems.push(
      `request: ${request.url()} ${request.failure()?.errorText ?? ''}`,
    ),
  )
  return problems
}
