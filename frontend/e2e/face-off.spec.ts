import { expect, test } from '@playwright/test'
import { strings } from '../src/strings'

// The gate of the face panel (REQ-14, REQ-36). The face option is the first
// way in on every page, but nothing is downloaded and nothing is written until
// the person chooses it: no model file is asked for, no camera is opened and
// the face key stays empty.
//
// The reverse side, a face actually registered, needs a real camera and a person
// who agrees, so it is checked by hand and not here.

test('the plain page shows the face option first and asks for no model', async ({
  page,
}) => {
  const modelRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/models/')) {
      modelRequests.push(request.url())
    }
  })

  await page.goto('/')

  // Phase 1 is open: the identify headline is on screen.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.identify.headline[0],
  )

  // The face option is a real button, closed, with one line on how to add a
  // face when none is saved. (Before the username row: covered by the unit
  // test, since the public demo has no accounts and so no such row.)
  await expect(
    page.getByRole('heading', { name: strings.signIn.faceHeading }),
  ).toBeVisible()
  const faceButton = page.getByRole('button', { name: strings.face.buttonLabel })
  await expect(faceButton).toBeEnabled()
  await expect(faceButton).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByText(strings.signIn.faceNone)).toBeVisible()
  await expect(page.locator('.face-panel')).toHaveCount(0)

  // Keyboard: the button is reachable with Tab and Enter opens the consent.
  for (let press = 0; press < 20; press += 1) {
    if (await faceButton.evaluate((el) => el === document.activeElement)) break
    await page.keyboard.press('Tab')
  }
  await expect(faceButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByText(strings.face.consent)).toBeVisible()
  await page.getByRole('button', { name: strings.face.cancelLabel }).click()

  // The way in that always works, with or without a camera.
  await expect(
    page.getByRole('group', { name: strings.phases.identify.crewLabel }),
  ).toBeVisible()

  // Opening the consent is not choosing the camera: still no model.
  await page.waitForLoadState('networkidle')
  expect(modelRequests, 'model requests before the camera is chosen').toEqual([])
  expect(
    await page.evaluate(() => window.localStorage.getItem('hemoso:face:v1')),
    'face data written by the plain page',
  ).toBeNull()
})
