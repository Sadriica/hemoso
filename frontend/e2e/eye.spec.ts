import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'
import { eyeStrings } from '../src/eye/strings'
import { expectNoBlockingA11yIssues } from './axe'

// The eye check, with a scripted camera and detector. EYE_CHECK_ENABLED is
// false, so the step shows only in a build made with VITE_EYE_E2E=1 and the
// `?eye=demo` address (a 6-second run); any other build skips this spec.
const testBuild = process.env.VITE_EYE_E2E === '1'
const copy = strings.phases

test('eye check with a scripted camera and detector', async ({ page }) => {
  test.skip(!testBuild, 'needs a build made with VITE_EYE_E2E=1')

  await page.addInitScript(() => {
    // A canvas stream stands for the camera: a real frame source, no hardware.
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const context = canvas.getContext('2d')
    setInterval(() => {
      context?.fillRect(0, 0, 320, 240)
    }, 40)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => Promise.resolve(canvas.captureStream(25)),
      },
    })
    const eye = (x: number, h: number) => [
      { x, y: 50 },
      { x: x + 10, y: 50 - h / 2 },
      { x: x + 20, y: 50 - h / 2 },
      { x: x + 30, y: 50 },
      { x: x + 20, y: 50 + h / 2 },
      { x: x + 10, y: 50 + h / 2 },
    ]
    const face = (ear: number) => {
      const points = Array.from({ length: 68 }, (_, i) => ({ x: i, y: 100 }))
      points.splice(36, 6, ...eye(20, ear * 30))
      points.splice(42, 6, ...eye(80, ear * 30))
      return points
    }
    let calls = 0
    ;(window as unknown as Record<string, unknown>).__hemosoEyeDetect = () => {
      calls += 1
      return Promise.resolve(calls % 20 < 3 ? face(0.08) : face(0.3))
    }
  })

  await page.goto('/?eye=demo')
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

  const line = page.getByRole('button', { name: eyeStrings.optional })
  await line.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: eyeStrings.heading })).toBeVisible()
  // The two ids are measured, never typed.
  await expect(page.getByLabel('Eye closure')).toHaveCount(0)
  await expectNoBlockingA11yIssues(page, 'Report with the eye check')

  await page.getByRole('button', { name: eyeStrings.start }).click()
  await expect(page.getByRole('progressbar', { name: eyeStrings.timeLeft })).toBeVisible()
  await expect(page.locator('.eye__stage')).toHaveAttribute('aria-hidden', 'true')

  const result = page.locator('[data-eye-result="done"]')
  await expect(result).toBeVisible({ timeout: 30_000 })
  await expect(result).toContainText(/Eyes closed \d+ % of the time\./)
  await expect(result).toContainText(/\d+ blinks? a minute\./)
  await expect(result).toContainText(eyeStrings.confirms)
  await expect(page.getByText(eyeStrings.saved(false))).toBeVisible()
  await expectNoBlockingA11yIssues(page, 'Report with the eye result')

  // The line of the report now carries the result.
  await expect(
    page.getByRole('button', { name: /^Eye check, done: Eyes closed/ }),
  ).toBeVisible()
})
