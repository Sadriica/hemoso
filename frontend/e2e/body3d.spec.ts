import { expect, test, type Page } from '@playwright/test'
import { injuryWords } from '../src/components/body3d/words'
import { strings } from '../src/strings'
import { expectNoBlockingA11yIssues } from './axe'

// The 3D body (REQ-15): the astronaut opens "Where does it hurt?", chooses a
// place through the accessible list of body parts, sets how strong it is and
// what kind of mark it is, saves, and reads the report back. Everything stays on
// this device, so the assertion is the list beside the picker.
const copy = strings.phases

// The 3D body is a 554 kB chunk of its own: the test waits for it, turns the
// figure and runs axe. On a loaded machine that is more than the 30 s default.
test.describe.configure({ timeout: 60_000 })

test('the body: choose a place, a strength and a kind, and save the report', async ({
  page,
}) => {
  await page.goto('/')
  await pickFirstPerson(page)
  await page
    .getByRole('button', { name: copy.identify.next })
    .press('Enter')
  await page.getByRole('button', { name: copy.report.next }).press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    copy.status.headline[0],
  )

  await test.step('the picker opens under the status board', async () => {
    const toggle = page.locator('button[aria-controls="pain-panel"]')
    await expect(toggle).toHaveText(injuryWords.open)
    await toggle.press('Enter')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.getByRole('heading', { name: injuryWords.heading }),
    ).toBeVisible()
  })

  const knee = page.getByRole('button', { name: 'Left knee', exact: true })

  await test.step('a place is chosen from the accessible list, by keyboard', async () => {
    // The 3D chunk arrives after the panel: the list is part of the same figure.
    await expect(knee).toBeAttached({ timeout: 20_000 })
    await knee.focus()
    await page.keyboard.press('Enter')
    await expect(knee).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.locator('.pain-picker .body3d__live'),
    ).toContainText('Selected: Left knee')
  })

  await test.step('strength 8 of 10 and the kind of mark', async () => {
    const slider = page.getByRole('slider', {
      name: injuryWords.intensityFor('Left knee'),
    })
    await slider.focus()
    await page.keyboard.press('Home')
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press('ArrowRight')
    }
    await expect(slider).toHaveValue('8')
    await page
      .getByLabel(injuryWords.kindFor('Left knee'))
      .selectOption('sprain_or_strain')
  })

  await test.step('save and read it in the list', async () => {
    await page.getByRole('button', { name: injuryWords.save }).click()
    await expect(page.getByText(injuryWords.savedOnDevice)).toBeVisible()
    await expect(
      page.getByText('Left knee: sprain or strain, 8 of 10'),
    ).toBeVisible()
    await expect(page.getByText(injuryWords.surgeon)).toBeVisible()
  })

  await expectNoBlockingA11yIssues(page, 'Status with the pain picker')
})

// Phase 1 by keyboard: the first crew member, checked with Space.
async function pickFirstPerson(page: Page): Promise<void> {
  const first = page
    .getByRole('group', { name: copy.identify.crewLabel })
    .getByRole('radio')
    .first()
  await first.focus()
  await page.keyboard.press('Space')
  await expect(first).toBeChecked()
}

// A browser that gives a WebGL context and cannot draw with it (a blocked GPU,
// some headless browsers): three.js throws while it builds the renderer. The
// status phase must stay on screen with the flat body in its place.
for (const kind of ['broken', 'missing'] as const) {
  test(`the status phase stays up when WebGL is ${kind}`, async ({ page }) => {
    await page.addInitScript((mode) => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        ...rest: unknown[]
      ) {
        if (type === 'webgl' || type === 'webgl2') {
          // A context object with nothing behind it, or no context at all.
          return mode === 'broken' ? { getExtension: () => null } : null
        }
        return (original as (...args: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof original
    }, kind)
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto('/')
    await pickFirstPerson(page)
    await page.getByRole('button', { name: copy.identify.next }).press('Enter')
    await page.getByRole('button', { name: copy.report.next }).press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      copy.status.headline[0],
    )

    // The picker brings the body on every screen size.
    const toggle = page.locator('button[aria-controls="pain-panel"]')
    await toggle.press('Enter')
    await expect(page.locator('.pain-picker .body3d--flat')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Left knee', exact: true }),
    ).toBeVisible()

    // Nothing was unmounted: the heading, the card and the rail are all there.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.indicator-card').first()).toBeVisible()
    await expect(page.locator('#root > *')).not.toHaveCount(0)
    expect(pageErrors).toEqual([])
  })
}
