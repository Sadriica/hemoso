import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'

// The other specs run with reduced motion, which has no intro; these two turn
// motion back on to see it.
test.use({ reducedMotion: 'no-preference' })

// The intro never costs a click (REQ-32): a person who clicks a control while
// it still plays ends the intro and reaches the control with the same click.
test('a click during the intro ends it and reaches what is under it', async ({
  page,
}) => {
  await page.goto('/')
  const intro = page.locator('.intro__layer')
  await expect(intro).toBeVisible()

  // The demo button is under the layer. One click, no wait for the intro.
  const demo = page.getByRole('button', { name: strings.signIn.demoAction })
  const box = await demo.boundingBox()
  expect(box).not.toBeNull()
  if (box === null) return
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)

  await expect(intro).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
})

test('the skip button and any key still end the intro', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.intro__layer')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.intro__layer')).toHaveCount(0)
  // The key did not move the check on.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.identify.headline[0],
  )
})
