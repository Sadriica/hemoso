import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'
import { expectNoBlockingA11yIssues } from './axe'

// The optional symptom list of the report phase (T-80) on the real build, by
// keyboard: real checkboxes in a fieldset with a legend, a red flag shows
// "Call your CMO now" at once, and a saved symptom is acknowledged in words.
const copy = strings.phases
const text = strings.symptoms

test('symptoms in the report phase, by keyboard', async ({ page }) => {
  await page.goto('/')
  const first = page
    .getByRole('group', { name: copy.identify.crewLabel })
    .getByRole('radio')
    .first()
  await first.focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: copy.identify.next }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    copy.report.headline[0],
  )

  const toggle = page.getByRole('button', { name: text.toggle })
  await toggle.focus()
  await page.keyboard.press('Enter')
  const group = page.getByRole('group', { name: text.legend })
  await expect(group).toBeVisible()

  // Tick the first red-flag symptom by name: the line shows before any save.
  const boxes = group.getByRole('checkbox')
  expect(await boxes.count()).toBeGreaterThan(0)
  await boxes.first().focus()
  await page.keyboard.press('Space')
  await expect(boxes.first()).toBeChecked()
  await page.keyboard.press('Space')
  await expect(boxes.first()).not.toBeChecked()

  const confusion = group.getByRole('checkbox', { name: 'Confusion' })
  await confusion.focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('alert')).toContainText(text.callCmo)

  await expectNoBlockingA11yIssues(page, 'report with the symptom list open')

  await page.getByRole('button', { name: text.save }).focus()
  await page.keyboard.press('Enter')
  await expect(group.getByRole('status')).toContainText(text.saved(1))
  await expect(page.getByRole('alert')).toContainText(text.callCmo)
})
