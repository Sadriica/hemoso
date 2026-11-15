import { expect, test, type Page } from '@playwright/test'
import { strings } from '../src/strings'
import { REACTION_LAPSES_ID, REACTION_MEDIAN_ID } from '../src/reaction/ids'
import { reactionStrings } from '../src/reaction/strings'
import { expectNoBlockingA11yIssues } from './axe'
import { readIndicatorRows } from './config'

// The reaction check (REQ-38, T-71) on the real build, by keyboard only: the
// step sits in the report phase, it is started and answered with keys, and the
// two results reach the outbox. The run uses `?reaction=demo`, the 30-second
// length, because the real one is three minutes; that parameter is the only
// difference between this run and the one the crew takes.
const rows = readIndicatorRows()
const hasReaction =
  rows.ids.includes(REACTION_MEDIAN_ID) && rows.ids.includes(REACTION_LAPSES_ID)
const reactionNames = [REACTION_MEDIAN_ID, REACTION_LAPSES_ID]
  .map((id) => rows.names[rows.ids.indexOf(id)] ?? '')
  .filter((name) => name !== '')
const copy = strings.phases

test('reaction check by keyboard, at the demo length', async ({ page }) => {
  test.skip(
    !hasReaction,
    `config/data/indicators.csv has no ${REACTION_MEDIAN_ID} and ${REACTION_LAPSES_ID}`,
  )
  // A 30-second run with 2 to 10 s waits between stimuli, plus the build.
  test.setTimeout(180_000)
  const problems = collectProblems(page)

  await test.step('Reach the report phase and the optional step', async () => {
    await page.goto('/?reaction=demo')
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
    // The check fills its two indicators itself: no field asks for them.
    for (const name of reactionNames) {
      await expect(page.getByLabel(name)).toHaveCount(0)
    }
    await expectNoBlockingA11yIssues(page, 'Report with the reaction check')
  })

  await test.step('Light is the default; start by keyboard', async () => {
    await expect(
      page.getByRole('radio', { name: reactionStrings.light }),
    ).toBeChecked()
    await expect(page.getByText(reactionStrings.demoLength)).toBeVisible()
    await page.getByRole('button', { name: reactionStrings.start }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-reaction-state="waiting"]')).toBeVisible()
    await expect(
      page.getByRole('progressbar', { name: reactionStrings.timeLeft }),
    ).toBeVisible()
  })

  await test.step('An early answer is a false start, not a trial', async () => {
    await page.keyboard.press('Space')
    await expect(page.getByText(reactionStrings.tooEarly)).toBeVisible()
    await expect(page.getByText(reactionStrings.trial(1))).toBeVisible()
  })

  await test.step('Answer every stimulus with the space bar', async () => {
    const stimulus = page.locator('[data-reaction-state="stimulus"]')
    const result = page.locator('[data-reaction-result="median"]')
    let sawLight = false
    for (let answered = 0; answered < 12; answered += 1) {
      const shown = await stimulus
        .waitFor({ state: 'visible', timeout: 20_000 })
        .then(() => true)
        .catch(() => false)
      // The demo length ran out while waiting: nothing more to answer.
      if (!shown) break
      if (!sawLight) {
        await expect(page.getByText(reactionStrings.cue.light)).toBeVisible()
        sawLight = true
      }
      // A key pressed the instant the light appears is under the 100 ms a body
      // needs, which is a false start; a person takes about this long.
      await page.waitForTimeout(180)
      await page.keyboard.press('Space')
      if (await result.isVisible()) break
    }
    expect(sawLight, 'the visible cue of the stimulus').toBe(true)
  })

  await test.step('The result in words, and the two entries in the outbox', async () => {
    const result = page.locator('[data-reaction-result="median"]')
    await expect(result).toBeVisible({ timeout: 20_000 })
    await expect(result).toContainText('Median reaction:')
    await expect(result).toContainText(/Lapses: \d+/)
    // No server in the demo: the two entries wait on this device (REQ-28).
    await expect(
      page.getByTitle(
        strings.sync.chip(strings.sync.noServer, strings.sync.waiting(2)),
      ),
    ).toBeVisible()
    await expectNoBlockingA11yIssues(page, 'Report with the reaction result')
  })


  await test.step('A run in sound mode shows its cue, and Escape throws it away', async () => {
    await page.getByRole('button', { name: reactionStrings.again }).focus()
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
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(reactionStrings.cue.sound)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText(reactionStrings.stopped)).toBeVisible()
    // Nothing else was stored: the first run's two entries are still the only
    // ones waiting for the outbox.
    await expect(
      page.getByTitle(
        strings.sync.chip(strings.sync.noServer, strings.sync.waiting(2)),
      ),
    ).toBeVisible()
  })

  await test.step('Status: both indicators with their icon and their history', async () => {
    await page.getByRole('button', { name: copy.report.next }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      copy.status.headline[0],
    )

    // Each one is a card of the status phase, picked from the overview, drawn
    // with its own glyph and carrying the reading the file's data gives it.
    for (const id of [REACTION_MEDIAN_ID, REACTION_LAPSES_ID]) {
      const name = rows.names[rows.ids.indexOf(id)] ?? ''
      await selectIndicator(page, name)
      const card = page.getByRole('listitem').filter({
        has: page.getByRole('heading', { level: 3, name, exact: true }),
      })
      await expect(card.locator('.indicator-card__icon svg')).toHaveAttribute(
        'data-icon',
        id,
      )
      await expect(card.locator('.indicator-card__reading')).toBeVisible()
    }

    // The history of the median, behind its closed disclosure (REQ-12).
    const medianName = rows.names[rows.ids.indexOf(REACTION_MEDIAN_ID)] ?? ''
    await selectIndicator(page, medianName)
    const toggle = page.getByRole('button', { name: copy.status.historyToggle })
    await toggle.focus()
    await page.keyboard.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.getByRole('table', {
        name: strings.history.tableCaption(medianName),
      }),
    ).toBeVisible()
  })

  expect(problems, 'console errors and failed requests').toEqual([])
})

// Chooses an indicator in the overview by its name, with the keyboard only.
async function selectIndicator(page: Page, name: string): Promise<void> {
  const control = page
    .getByRole('button', { name: new RegExp(`^${name}\\b`) })
    .first()
  await expect(control).toBeVisible()
  await control.focus()
  await page.keyboard.press('Enter')
  await expect(control).toHaveAttribute('aria-pressed', 'true')
}

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
