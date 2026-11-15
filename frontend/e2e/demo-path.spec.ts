import { expect, test, type Locator, type Page } from '@playwright/test'
import { SCALE_UNIT, hazardName, strings } from '../src/strings'
import { expectNoBlockingA11yIssues } from './axe'
import { readIndicatorRows } from './config'

// The demo path of the version we submit (REQ-15, REQ-31): Home, open the
// Details of a card, save a measured value, save a value on the 1 to 5 scale
// with the arrow keys, find both readings on Home again, and read one
// indicator's history. The same spec runs on the desktop and on a phone.
//
// Keyboard only on purpose: if a step needs a mouse, an astronaut on a laptop
// with a broken trackpad cannot do it either.
const { names, units, measuredOnBoard, hazards, scaleIndex } =
  readIndicatorRows()

const FIRST_VALUE = '72'
const SCALE_VALUE = 3

test('demo path by keyboard with axe on every screen', async ({ page }) => {
  const problems = collectProblems(page)

  let readingDay = ''
  let scaleDay = ''

  await test.step('Home: the skip link jumps to the main content', async () => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const skipLink = page.getByRole('link', { name: strings.skipToMain })
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  const person = await page.getByLabel(strings.personPickerLabel).inputValue()
  const homeRegion = page.getByRole('region', {
    name: strings.personHeading(person),
  })

  await test.step('Home: one card per indicator and a Details disclosure', async () => {
    await focusByTab(page, page.getByRole('tab', { name: strings.tabs.home }))
    await expect(homeRegion).toBeVisible()
    for (const name of names) {
      await expect(
        homeRegion.getByRole('heading', { level: 3, name, exact: true }),
      ).toBeVisible()
    }
    await expect(page.getByText(strings.syntheticNotice)).toBeVisible()

    const card = cardFor(homeRegion, names[0])
    const details = card.getByRole('button', { name: strings.details.label })
    await focusByTab(page, details)
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'true')

    // What config/data/indicators.csv says about the indicator, in words: how
    // it is measured and which hazards touch it. A hazard id never shows.
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

    // The sources of the reading: a link, the word Assumption, or the note
    // that the file lists none.
    await expect(
      card
        .getByRole('link')
        .or(card.getByText(strings.sources.assumption))
        .or(card.getByText(strings.sources.empty))
        .first(),
    ).toBeVisible()
    // The panel is new markup, so axe sees it open too.
    await expectNoBlockingA11yIssues(page, 'Home with Details open')
    await page.keyboard.press('Enter')
    await expect(details).toHaveAttribute('aria-expanded', 'false')
  })

  await expectNoBlockingA11yIssues(page, 'Home')
  await expectNoHorizontalScroll(page, 'Home')

  await test.step('Entry: save a measured value', async () => {
    await focusByTab(page, page.getByRole('tab', { name: strings.tabs.home }))
    await moveToTab(page, strings.tabs.entry, 'ArrowRight')
    const entryTab = page.getByRole('tab', { name: strings.tabs.entry })
    await expect(entryTab).toBeFocused()
    await expect(entryTab).toHaveAttribute('aria-selected', 'true')

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(strings.entry.indicator)).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(
      page.getByLabel(strings.entry.value, { exact: true }),
    ).toBeFocused()
    await page.keyboard.type(FIRST_VALUE)

    await page.keyboard.press('Tab')
    const day = page.getByLabel(strings.entry.missionDay)
    await expect(day).toBeFocused()
    // The day after the latest one in the store, so the new reading is the
    // latest one on Home whatever the clock says.
    readingDay = String(Number(await day.inputValue()) + 1)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(readingDay)

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(strings.entry.time)).toBeFocused()
    // The time input has a tab stop per segment (hour, minute, AM/PM), so tab
    // on until the button instead of counting presses.
    await focusByTab(
      page,
      page.getByRole('button', { name: strings.entry.save }),
    )
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toHaveText(
      strings.entry.savedOnDevice,
    )
    // No server in the demo: the entry waits on this device (REQ-28).
    await expect(page.getByText(strings.sync.waiting(1))).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Entry')
  await expectNoHorizontalScroll(page, 'Entry')

  await test.step('Entry: save a 1 to 5 value with the arrow keys', async () => {
    expect(
      scaleIndex,
      `no indicator with unit '${SCALE_UNIT}' in config/data/indicators.csv`,
    ).toBeGreaterThanOrEqual(0)

    await focusByTab(
      page,
      page.getByLabel(strings.entry.indicator),
      'backwards',
    )
    for (let step = 0; step < scaleIndex; step += 1) {
      await page.keyboard.press('ArrowDown')
    }

    // The scale is the only value field that is a group of five choices.
    const scale = page.getByRole('group', {
      name: strings.entry.valueWithUnit(SCALE_UNIT),
    })
    await expect(scale).toBeVisible()

    await page.keyboard.press('Tab')
    await expect(scale.getByRole('radio', { name: '1' })).toBeFocused()
    for (let choice = 1; choice < SCALE_VALUE; choice += 1) {
      await page.keyboard.press('ArrowRight')
    }
    await expect(
      scale.getByRole('radio', { name: String(SCALE_VALUE) }),
    ).toBeChecked()

    await page.keyboard.press('Tab')
    const day = page.getByLabel(strings.entry.missionDay)
    await expect(day).toBeFocused()
    scaleDay = String(Number(await day.inputValue()) + 1)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(scaleDay)

    await page.keyboard.press('Tab')
    await expect(page.getByLabel(strings.entry.time)).toBeFocused()
    await focusByTab(
      page,
      page.getByRole('button', { name: strings.entry.save }),
    )
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toHaveText(
      strings.entry.savedOnDevice,
    )
    await expect(page.getByText(strings.sync.waiting(2))).toBeVisible()
  })

  await test.step('Home: both readings are the latest ones', async () => {
    const entryTab = page.getByRole('tab', { name: strings.tabs.entry })
    await focusByTab(page, entryTab, 'backwards')
    await moveToTab(page, strings.tabs.home, 'ArrowLeft')
    await expect(
      page.getByRole('tab', { name: strings.tabs.home }),
    ).toBeFocused()

    const measured = cardFor(homeRegion, names[0])
    await expect(
      measured.getByText(`${FIRST_VALUE} ${units[0]}`),
    ).toBeVisible()
    await expect(measured.getByText(`Day ${readingDay}`)).toBeVisible()

    const scale = cardFor(homeRegion, names[scaleIndex])
    await expect(
      scale.getByText(`${SCALE_VALUE} ${strings.cardUnit(SCALE_UNIT)}`),
    ).toBeVisible()
    await expect(scale.getByText(`Day ${scaleDay}`)).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Home with the saved readings')
  await expectNoHorizontalScroll(page, 'Home with the saved readings')

  expect(problems, 'console errors and failed requests').toEqual([])
})

// The last step of the demo (REQ-12): one indicator's own history. A test of
// its own, so it starts from the seeded demo data and not from the two readings
// above.
test('history: one indicator, its table and the comparison sentence', async ({
  page,
}) => {
  const problems = collectProblems(page)
  // The second indicator in the file, reached with the arrow keys; the first
  // row of the demo data has readings for it on every day of the mission.
  const chosenName = names[1] ?? names[0]

  await test.step('History: open the tab and pick an indicator', async () => {
    await page.goto('/')
    await focusByTab(page, page.getByRole('tab', { name: strings.tabs.home }))
    await moveToTab(page, strings.tabs.history, 'ArrowRight')
    await expect(
      page.getByRole('tab', { name: strings.tabs.history }),
    ).toBeFocused()

    await page.keyboard.press('Tab')
    const select = page.getByLabel(strings.history.indicator)
    await expect(select).toBeFocused()
    await page.keyboard.press('ArrowDown')
  })

  await test.step('History: the table follows the choice and has rows', async () => {
    const table = page.getByRole('table', {
      name: strings.history.tableCaption(chosenName),
    })
    await expect(table).toBeVisible()
    await expect(table.getByRole('columnheader')).toHaveCount(4)
    const rows = table.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
  })

  await test.step('History: the comparison sentence', async () => {
    const sentence = page
      .getByText(/^Latest:/)
      .or(page.getByText(strings.history.notEnough))
    await expect(sentence).toHaveCount(1)
    const text = (await sentence.textContent()) ?? ''
    expect(
      text === strings.history.notEnough || text.startsWith('Latest:'),
      `unexpected comparison sentence: ${text}`,
    ).toBe(true)
  })

  await expectNoBlockingA11yIssues(page, 'History')
  await expectNoHorizontalScroll(page, 'History')

  expect(problems, 'console errors and failed requests').toEqual([])
})

// The phone project is 412 px wide, which hides an overflow that only shows at
// the narrowest screen the app promises (REQ-32). A fixed 320 px window, one
// screen at a time, reached with the arrow keys.
test('no sideways scrolling at 320 px', async ({ page, isMobile }) => {
  test.skip(isMobile === true, 'the phone project has its own width')
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('/')
  // Proves the narrow width really took effect, whatever device the project uses.
  expect(await page.evaluate(() => window.innerWidth)).toBe(320)
  await focusByTab(page, page.getByRole('tab', { name: strings.tabs.home }))
  await expectNoHorizontalScroll(page, 'Home at 320 px')

  await moveToTab(page, strings.tabs.entry, 'ArrowRight')
  await expectNoHorizontalScroll(page, 'Entry at 320 px')

  await moveToTab(page, strings.tabs.history, 'ArrowRight')
  await expectNoHorizontalScroll(page, 'History at 320 px')
})

// Anything the browser reports as an error, or a request that never arrived,
// is a defect of the demo, so the test fails with the message.
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

// The page may not be wider than the screen: anything to the right of it would
// be out of reach without a sideways scroll (REQ-32).
async function expectNoHorizontalScroll(
  page: Page,
  screen: string,
): Promise<void> {
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    screen: window.innerWidth,
  }))
  expect(
    widths.content,
    `${screen} is wider than the screen`,
  ).toBeLessThanOrEqual(widths.screen)
}

// The tab list, walked with the arrow keys. The list grows as screens are added
// (History is the third), so the key is pressed until the wanted tab is the
// selected one.
async function moveToTab(
  page: Page,
  name: string,
  key: 'ArrowRight' | 'ArrowLeft',
): Promise<void> {
  const target = page.getByRole('tab', { name })
  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press(key)
    if ((await target.getAttribute('aria-selected')) === 'true') {
      await expect(target).toBeFocused()
      return
    }
  }
  throw new Error(`The ${name} tab is not reachable with ${key}.`)
}

// Tabs until `target` has focus, in either direction. A target that never
// arrives fails here: it means the screen cannot be used by keyboard alone.
async function focusByTab(
  page: Page,
  target: Locator,
  direction: 'forwards' | 'backwards' = 'forwards',
): Promise<void> {
  const isFocused = () =>
    target.evaluate((element) => element === document.activeElement)
  for (let press = 0; press < 40; press += 1) {
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
