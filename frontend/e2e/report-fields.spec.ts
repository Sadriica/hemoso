import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'

// A value typed in the blood pressure field is always fully visible: the two
// inputs keep room for three digits at every width where the report is
// reachable, including the two-column layout from 1000 px.
for (const width of [1000, 1440, 768, 360]) {
  test(`blood pressure 170 / 105 is not clipped at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const first = page
      .getByRole('group', { name: strings.phases.identify.crewLabel })
      .getByRole('radio')
      .first()
    await first.focus()
    await page.keyboard.press('Space')
    await page.getByRole('button', { name: strings.phases.identify.next }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      strings.phases.report.headline[0],
    )

    const systolic = page.getByLabel(strings.entry.systolic, { exact: true })
    const diastolic = page.getByLabel(strings.entry.diastolic, { exact: true })
    await systolic.fill('170')
    await diastolic.fill('105')
    for (const input of [systolic, diastolic]) {
      const fits = await input.evaluate((el) => el.scrollWidth <= el.clientWidth)
      expect(fits, `${await input.inputValue()} is cut at ${width} px`).toBe(true)
    }
  })
}
