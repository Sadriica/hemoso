import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'

// The gate of the face panel (REQ-14, REQ-36). On the page the public demo
// serves, nothing face-related is on screen, no model is downloaded and nothing
// is written to the face key: the feature is off until someone opens the page
// with ?face=1, which is what gives Juli's demonstration its own URL.
//
// The reverse side, a face actually registered, needs a real camera and a person
// who agrees, so it is checked by hand and not here.

test('without ?face=1 nothing face-related is on the page or requested', async ({
  page,
}) => {
  const modelRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/models/')) {
      modelRequests.push(request.url())
    }
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: strings.appName }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: strings.face.buttonLabel }),
  ).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.face-panel')).toHaveCount(0)

  // The way in that always works, with or without a camera.
  await expect(page.getByLabel(strings.personPickerLabel)).toBeVisible()

  // The page may still be loading its own files; nothing may ask for a model.
  await page.waitForLoadState('networkidle')
  expect(modelRequests, 'model requests on the plain page').toEqual([])
  expect(
    await page.evaluate(() => window.localStorage.getItem('hemoso:face:v1')),
    'face data written by the plain page',
  ).toBeNull()
})
