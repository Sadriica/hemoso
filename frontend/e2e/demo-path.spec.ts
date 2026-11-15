import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { SCALE_UNIT, hazardName, strings } from '../src/strings'
import { isReactionIndicator } from '../src/reaction/ids'
import { expectNoBlockingA11yIssues } from './axe'
import { readIndicatorRows } from './config'

// The demo path of the version we submit (REQ-15, REQ-31): the guided check in
// its three phases, in order. Identify (pick a name), report (a measured value
// and a 1 to 5 value with the arrow keys), status (both readings are the latest
// ones, a Details panel, the history sentence). The same spec runs on the
// desktop and on a phone.
//
// Keyboard only on purpose: if a step needs a mouse, an astronaut on a laptop
// with a broken trackpad cannot do it either.
const { ids, names, units, measuredOnBoard, hazards, scaleIndex } =
  readIndicatorRows()

// The reaction check measures its two indicators itself (reaction/ids.ts), so
// the Entry screen has no row for them: the count below leaves them out.
const typedNames = names.filter(
  (_, index) => !isReactionIndicator(ids[index] ?? ''),
)

const FIRST_VALUE = '72'
const SCALE_VALUE = 3
const copy = strings.phases

test('guided check by keyboard with axe on every phase', async ({ page }) => {
  // One test walks the whole check: three phases, an axe scan on each, a first
  // load that includes the intro and a full report. On a loaded machine that is
  // three times the default budget, not a slower app.
  test.slow()
  const problems = collectProblems(page)
  let person = ''
  let readingDay = ''
  let scaleDay = ''

  await test.step('Identify: the skip link jumps to the main content', async () => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: strings.skipToMain })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      copy.identify.headline[0],
    )
    await expect(page.getByText(strings.syntheticNotice)).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Identify')
  await expectNoHorizontalScroll(page, 'Identify')

  await test.step('Identify: pick a name and begin the report', async () => {
    const crew = page.getByRole('group', { name: copy.identify.crewLabel })
    const first = crew.getByRole('radio').first()
    await focusByTab(page, first)
    await page.keyboard.press('Space')
    await expect(first).toBeChecked()
    person = (await first.getAttribute('value')) ?? ''

    await focusByTab(page, page.getByRole('button', { name: copy.identify.next }))
    await page.keyboard.press('Enter')
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(copy.report.headline[0])
    await expect(heading).toBeFocused()
    await expect(page.getByText(strings.topbar.onDuty(person))).toBeVisible()
  })

  await test.step('Report: one row per indicator, with its icon and its unit', async () => {
    // Every indicator of the file has a row; the two blood pressures share one.
    const rows = page.getByRole('listitem').filter({
      has: page.locator('.rep-row__body'),
    })
    const paired = names.filter((name) => /systolic|diastolic/i.test(name)).length
    await expect(rows).toHaveCount(typedNames.length - (paired === 2 ? 1 : 0))
    await expect(page.getByLabel(typedNames[0], { exact: true })).toBeVisible()
    await expect(
      page.getByRole('group', { name: strings.entry.bloodPressure }),
    ).toBeVisible()
    await expect(page.getByLabel(strings.entry.missionDay)).toBeVisible()
    // The context of the check is said once, in the header; its four choices
    // open with the "change" button.
    const contextChip = page.getByRole('button', {
      name: new RegExp(`^${strings.entry.context}(?! for)`),
    })
    await expect(contextChip).toBeVisible()
    await contextChip.click()
    await expect(
      page.getByRole('group', { name: strings.entry.context, exact: true }),
    ).toBeVisible()
    await contextChip.click()
    // The walk below starts from the heading, as the phase opens.
    await page.getByRole('heading', { level: 1 }).focus()
  })

  await test.step('Report: fill a measured row and the scale, then save once', async () => {
    expect(
      scaleIndex,
      `no indicator with unit '${SCALE_UNIT}' in config/data/indicators.csv`,
    ).toBeGreaterThanOrEqual(0)

    // The shared day first: the day after the latest one in the store, so the
    // new readings are the latest ones whatever the clock says.
    await page.keyboard.press('Tab')
    const day = page.getByLabel(strings.entry.missionDay)
    await expect(day).toBeFocused()
    readingDay = String(Number(await day.inputValue()) + 1)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(readingDay)
    scaleDay = readingDay

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(strings.entry.time, { exact: true })).toBeFocused()

    // The measured row, typed with the keyboard only.
    await focusByTab(page, page.getByLabel(names[0], { exact: true }))
    await page.keyboard.type(FIRST_VALUE)

    // The mood row is five choices: two arrow presses reach the third one.
    const scale = page.getByRole('group', { name: names[scaleIndex] })
    await focusByTab(page, scale.getByRole('radio').first())
    for (let choice = 1; choice < SCALE_VALUE; choice += 1) {
      await page.keyboard.press('ArrowRight')
    }
    await expect(
      scale.getByRole('radio').nth(SCALE_VALUE - 1),
    ).toBeChecked()

    await focusByTab(page, page.getByRole('button', { name: strings.entry.save }))
    await page.keyboard.press('Enter')

    // One save for the whole report: both readings are in, the empty rows are
    // not (REQ-02).
    await expect(
      page.getByText(strings.entry.savedOnDevice, { exact: false }),
    ).toBeVisible()
    await expect(page.getByText(copy.report.logged(2))).toBeVisible()
    // No server in the demo: the readings wait on this device (REQ-28).
    await expect(
      page.getByTitle(
        strings.sync.chip(strings.sync.noServer, strings.sync.waiting(2)),
      ),
    ).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Report')
  await expectNoHorizontalScroll(page, 'Report')

  await test.step('Report: an empty row saves nothing and says nothing', async () => {
    // Saving again with every row empty is not an error and stores nothing.
    const save = page.getByRole('button', { name: strings.entry.save })
    await focusByTab(page, save)
    await page.keyboard.press('Enter')
    await expect(page.getByText(strings.entry.noReading)).toBeVisible()
    await expect(page.getByText(copy.report.logged(2))).toBeVisible()
  })

  await test.step('Report: go on to the status', async () => {
    // After a save the way on is also offered inside the form panel, with a
    // longer accessible name; the plain button below stays for this path.
    await expect(
      page.getByRole('button', { name: strings.entry.nextLabel }),
    ).toBeVisible()
    await focusByTab(
      page,
      page.getByRole('button', { name: copy.report.next, exact: true }),
    )
    await page.keyboard.press('Enter')
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toContainText(copy.status.headline[0])
    await expect(heading).toBeFocused()
  })

  const statusRegion = page.getByRole('region', {
    name: strings.personHeading(person),
  })

  await test.step('Status: one card at a time, both readings the latest', async () => {
    // The first indicator is selected by default; the others are chosen from
    // the overview (a list on a phone, orbits on a wide screen).
    await expect(
      statusRegion.getByRole('heading', { level: 3, name: names[0], exact: true }),
    ).toBeVisible()
    await expect(statusRegion.getByRole('heading', { level: 3 })).toHaveCount(1)
    const measured = cardFor(statusRegion, names[0])
    await expect(measured.getByText(`${FIRST_VALUE} ${units[0]}`, { exact: true })).toBeVisible()
    await expect(measured.getByText(new RegExp(`^FD ${readingDay} · `))).toBeVisible()

    for (const name of names.slice(1)) {
      await selectIndicator(page, name)
      await expect(
        statusRegion.getByRole('heading', { level: 3, name, exact: true }),
      ).toBeVisible()
    }
    await selectIndicator(page, names[scaleIndex])
    const scale = cardFor(statusRegion, names[scaleIndex])
    await expect(
      scale
        .locator('.indicator-card__value')
        .filter({ hasText: `${SCALE_VALUE} ${strings.cardUnit(SCALE_UNIT)}` }),
    ).toBeVisible()
    await expect(scale.getByText(new RegExp(`^FD ${scaleDay} · `))).toBeVisible()
    await selectIndicator(page, names[0])
  })

  await test.step('Status: the Details of a card, by keyboard', async () => {
    const card = cardFor(statusRegion, names[0])
    const details = card.getByRole('button', { name: strings.details.label })
    await focusByTab(page, details)
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'true')

    // What config/data/indicators.csv says, in words; a hazard id never shows.
    const facts = card.locator('.indicator-details__fact')
    await expect(facts.first()).toContainText(strings.details.measuredOnBoard)
    await expect(facts.first()).toContainText(measuredOnBoard[0] ?? '')
    const plainHazards = (hazards[0] ?? [])
      .map((id) => hazardName(id))
      .filter((name): name is string => name !== null)
    if (plainHazards.length > 0) {
      await expect(facts.nth(1)).toContainText(plainHazards.join(', '))
    }
    for (const id of hazards[0] ?? []) {
      await expect(card).not.toContainText(id)
    }
    await expectNoBlockingA11yIssues(page, 'Status with Details open')
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'false')
  })

  await test.step('Status: the possible conditions, with who confirms', async () => {
    const copyConditions = strings.conditions
    const panel = page.getByRole('region', { name: copyConditions.heading })
    await expect(panel).toBeVisible()
    await expect(panel.getByText(copyConditions.confirms)).toHaveCount(1)

    // Every row of config/rules/conditions.csv is there: the scored ones in
    // the list, the others behind one closed line that says how many.
    const waiting = panel.getByRole('button', { name: /^(Not enough data yet|Show \d+ more)/ })
    if ((await waiting.count()) > 0) {
      await waiting.focus()
      await page.keyboard.press('Enter')
      await expect(waiting).toHaveAttribute('aria-expanded', 'true')
    }
    await expect(panel.getByRole('heading', { level: 3 })).toHaveCount(
      conditionCount(),
    )
    // Evidence is a bar and a number from 0 to 1, never a percentage.
    await expect(panel).not.toContainText('%')
    await expectNoBlockingA11yIssues(page, 'Status with the conditions open')
    await expectNoHorizontalScroll(page, 'Status with the conditions open')

    // A signal opens the card of its indicator, by keyboard.
    const signal = panel
      .getByRole('button', { name: /^Show the reading\./ })
      .first()
    await signal.focus()
    await page.keyboard.press('Enter')
    await expect(statusRegion.getByRole('heading', { level: 3 })).toHaveCount(1)
    await selectIndicator(page, names[0])
  })

  await test.step('Status: the history sentence, behind its disclosure', async () => {
    await openHistory(page)
    const sentence = page
      .getByText(/^Latest:/)
      .or(page.getByText(strings.history.notEnough))
    await expect(sentence.first()).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Status')
  await expectNoHorizontalScroll(page, 'Status')

  await test.step('Status: start a new check from phase 1', async () => {
    await focusByTab(page, page.getByRole('button', { name: copy.status.restart }))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      copy.identify.headline[0],
    )
  })

  expect(problems, 'console errors and failed requests').toEqual([])
})

// The history of one indicator (REQ-12), on the status phase, from the seeded
// demo data: pick another indicator by keyboard and read its table.
test('status: one indicator history, its table and the comparison sentence', async ({
  page,
}) => {
  const problems = collectProblems(page)
  const chosenName = names[1] ?? names[0]

  await page.goto('/')
  await walkToStatus(page)

  await test.step('History: pick the second indicator', async () => {
    await openHistory(page)
    const select = page.getByLabel(strings.history.indicator)
    await focusByTab(page, select)
    await page.keyboard.press('ArrowDown')
  })

  await test.step('History: the table follows the choice and has rows', async () => {
    const table = page.getByRole('table', {
      name: strings.history.tableCaption(chosenName),
    })
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader')).toHaveCount(5)
    await expect(table.locator('tbody tr').first()).toBeVisible()
  })

  await test.step('History: the comparison sentence', async () => {
    const sentence = page
      .getByText(/^Latest:/)
      .or(page.getByText(strings.history.notEnough))
    await expect(sentence).toHaveCount(1)
  })

  await expectNoBlockingA11yIssues(page, 'Status with history')
  await expectNoHorizontalScroll(page, 'Status with history')
  expect(problems, 'console errors and failed requests').toEqual([])
})

// The trend of one indicator over Flight Days (REQ-15, REQ-27): the chart
// takes the keyboard, the arrow keys move between readings and the readout
// names the one in focus. The table under it is the text of the same numbers.
test('status: the history trend moves by keyboard and reads each point', async ({
  page,
}) => {
  const problems = collectProblems(page)

  await page.goto('/')
  await walkToStatus(page)
  await openHistory(page)

  const chart = page.getByRole('group', { name: /^Trend of / })
  await test.step('Trend: the chart and its controls are there', async () => {
    await expect(chart).toBeVisible()
    await expect(
      page.getByRole('radio', { name: strings.history.trend.last14 }),
    ).toBeChecked()
    await expect(chart.locator('.tc__pt').first()).toBeVisible()
  })

  await test.step('Trend: arrow keys move between points', async () => {
    await focusByTab(page, chart)
    const readout = page.locator('.tc__readout-main')
    await page.keyboard.press('ArrowLeft')
    await expect(readout).toContainText('FD')
    const newest = await readout.textContent()
    await page.keyboard.press('ArrowLeft')
    await expect(readout).not.toHaveText(newest ?? '')
    await page.keyboard.press('Home')
    await expect(page.getByText(/^Reading 1 of /)).toBeVisible()
    await page.keyboard.press('End')
    await expect(page.getByText(/^Reading (\d+) of \1$/)).toBeVisible()
  })

  await test.step('Trend: another context and the full range', async () => {
    await page.getByRole('radio', { name: strings.history.trend.all }).check()
    await expect(
      page.getByRole('radio', { name: strings.history.trend.all }),
    ).toBeChecked()
    await expect(chart.locator('.tc__pt').first()).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'History trend')
  await expectNoHorizontalScroll(page, 'History trend')
  expect(problems, 'console errors and failed requests').toEqual([])
})

// The phone project is 412 px wide, which hides an overflow that only shows at
// the narrowest screen the app promises (REQ-32). A fixed 320 px window, one
// phase at a time.
test('no sideways scrolling at 320 px', async ({ page, isMobile }) => {
  test.skip(isMobile === true, 'the phone project has its own width')
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  expect(await page.evaluate(() => window.innerWidth)).toBe(320)
  await expectNoHorizontalScroll(page, 'Identify at 320 px')

  await pickFirstPerson(page)
  await page.getByRole('button', { name: copy.identify.next }).press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(copy.report.headline[0])
  await expectNoHorizontalScroll(page, 'Report at 320 px')

  await page.getByRole('button', { name: copy.report.next }).press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(copy.status.headline[0])
  await expectNoHorizontalScroll(page, 'Status at 320 px')
})

// Chooses an indicator in the overview: the row of the list or the orb of the
// orbit view, both named by the indicator. Enter on the focused control.
// The rows of config/rules/conditions.csv, read from the team's file.
function conditionCount(): number {
  const text = readFileSync(
    new URL('../../config/rules/conditions.csv', import.meta.url),
    'utf8',
  )
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
  return rows.length - 1
}

async function selectIndicator(page: Page, name: string): Promise<void> {
  const control = page
    .getByRole('button', { name: new RegExp(`^${name}\\b`) })
    .first()
  await expect(control).toBeVisible()
  await control.focus()
  await page.keyboard.press('Enter')
  await expect(control).toHaveAttribute('aria-pressed', 'true')
}

// The history and its table wait behind a closed disclosure on the status
// phase; open it with the keyboard.
async function openHistory(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: copy.status.historyToggle })
  await focusByTab(page, toggle)
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}

// Phase 1 by keyboard: the first crew member, checked with Space.
async function pickFirstPerson(page: Page): Promise<void> {
  const first = page
    .getByRole('group', { name: copy.identify.crewLabel })
    .getByRole('radio')
    .first()
  await focusByTab(page, first)
  await page.keyboard.press('Space')
  await expect(first).toBeChecked()
}

// Phases 1 and 2 without saving anything, to reach the status phase.
async function walkToStatus(page: Page): Promise<void> {
  await pickFirstPerson(page)
  await focusByTab(page, page.getByRole('button', { name: copy.identify.next }))
  await page.keyboard.press('Enter')
  await focusByTab(page, page.getByRole('button', { name: copy.report.next }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(copy.status.headline[0])
}

// Anything the browser reports as an error, or a request that never arrived,
// is a defect of the demo, so the test fails with the message.
function collectProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`))
  page.on('requestfailed', (request) =>
    problems.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`),
  )
  return problems
}

// The page may not be wider than the screen: anything to the right of it would
// be out of reach without a sideways scroll (REQ-32).
async function expectNoHorizontalScroll(page: Page, screen: string): Promise<void> {
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }))
  expect(widths.content, `${screen} is wider than the screen`).toBeLessThanOrEqual(
    widths.screen,
  )
}

// Tabs until `target` has focus, in either direction. A target that never
// arrives fails here: it means the phase cannot be used by keyboard alone.
async function focusByTab(
  page: Page,
  target: Locator,
  direction: 'forwards' | 'backwards' = 'forwards',
): Promise<void> {
  const isFocused = () =>
    target.evaluate((element) => element === document.activeElement)
  for (let press = 0; press < 60; press += 1) {
    if (await isFocused()) return
    await page.keyboard.press(direction === 'forwards' ? 'Tab' : 'Shift+Tab')
  }
  if (await isFocused()) return
  throw new Error('The target is not reachable with Tab.')
}

// The card of one indicator: the list item that holds its name as a heading.
function cardFor(region: Locator, name: string): Locator {
  return region.getByRole('listitem').filter({
    has: region.page().getByRole('heading', { level: 3, name, exact: true }),
  })
}
