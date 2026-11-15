import { expect, test, type Page } from '@playwright/test'
import { FACE_STORAGE_KEY } from '../src/face/descriptors'
import { strings } from '../src/strings'

// The face panel with a camera behind it (REQ-36). The plain page is the other
// half of this: face-off.spec.ts checks that a page without ?face=1 has no face
// control and asks for no model.
//
// The camera is Chromium's fake device: a moving test pattern with no person in
// it, and the permission already granted. It is set in this file only, so the
// other specs keep the plain browser.
//
// Nothing here uses a picture of a person, which is also why the happy paths
// are not here: registering a face and signing in with it need a real face in
// front of a real camera, and are checked by hand.
//
// Each test opens the camera at most once. A second camera in the same panel
// starts the detector on a video element that has no frame yet, and the check
// then never returns: no sentence, the buttons stay disabled. That is a defect
// of the panel, not of this file; the tests keep one session each until it is
// fixed.
const copy = strings.face
const phasesCopy = strings.phases

test.use({
  permissions: ['camera'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
})

// Model files are the three of public/models, up to 6.4 MB, and five frames for
// a registration: longer than the five seconds an expectation waits by default.
test.setTimeout(180_000)

// Every face model request, in order, so a test can say both that nothing was
// fetched before the camera opened and that the real path ran once it did.
function collectModelRequests(page: Page): string[] {
  const requests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/models/')) {
      requests.push(request.url())
    }
  })
  return requests
}

// The crew picker is the way in that always works, with or without a camera.
function crewPicker(page: Page) {
  return page.getByRole('group', { name: phasesCopy.identify.crewLabel })
}

async function openFacePanel(page: Page) {
  await page.goto('/?face=1')
  await page.getByRole('button', { name: copy.buttonLabel }).click()
  const panel = page.getByRole('dialog', { name: copy.heading })
  await expect(panel).toBeVisible()
  return panel
}

// Past the consent, where the camera actions and the delete live.
async function acceptConsent(page: Page) {
  const panel = page.getByRole('dialog', { name: copy.heading })
  await panel.getByRole('button', { name: copy.continueLabel }).click()
  await expect(panel.getByRole('button', { name: copy.register })).toBeVisible()
  return panel
}

// Picks the first crew member and returns their id, which is also the value the
// radio carries.
async function pickFirstCrew(page: Page): Promise<string> {
  const first = crewPicker(page).getByRole('radio').first()
  const personId = (await first.getAttribute('value')) ?? ''
  expect(personId, 'a crew member in the picker').not.toBe('')
  await first.check()
  await expect(first).toBeChecked()
  return personId
}

async function expectOnIdentify(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    phasesCopy.identify.headline[0],
  )
}

async function expectOnReport(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    phasesCopy.report.headline[0],
  )
}

// Out of the panel and through the picker to the report: the check still works
// after the face declined to help.
async function goOnWithPicker(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: copy.closeLabel }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const personId = await pickFirstCrew(page)
  await page.getByRole('button', { name: phasesCopy.identify.next }).click()
  await expectOnReport(page)
  await expect(page.getByText(strings.topbar.onDuty(personId))).toBeVisible()
}

test('?face=1: the consent comes before any camera, and Cancel leaves the picker working', async ({
  page,
}) => {
  const models = collectModelRequests(page)
  const panel = await openFacePanel(page)

  // The first step is the text and two answers, nothing that reaches a camera.
  await expect(panel.getByText(copy.consent)).toBeVisible()
  await expect(
    panel.getByRole('button', { name: copy.continueLabel }),
  ).toBeFocused()
  await expect(panel.getByRole('button', { name: copy.register })).toHaveCount(0)
  await expect(
    panel.getByRole('button', { name: copy.signIn, exact: true }),
  ).toHaveCount(0)

  await panel.getByRole('button', { name: copy.cancelLabel }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(models, 'model files asked for before the camera opened').toEqual([])

  // Declining costs nothing: the list, the way forward and the report are
  // exactly as they were.
  await expect(page.getByRole('button', { name: copy.buttonLabel })).toBeVisible()
  const personId = await pickFirstCrew(page)
  await page.getByRole('button', { name: phasesCopy.identify.next }).click()
  await expectOnReport(page)
  await expect(page.getByText(strings.topbar.onDuty(personId))).toBeVisible()
})

test('?face=1: registering with a camera that shows no face saves nothing', async ({
  page,
}) => {
  const models = collectModelRequests(page)
  await openFacePanel(page)
  const panel = await acceptConsent(page)
  const personId = await pickFirstCrew(page)

  // Five frames of the test pattern, no face in any of them: nothing is saved
  // and the person reads why.
  await panel.getByRole('button', { name: copy.register }).click()
  await expect(panel.getByRole('alert')).toHaveText(copy.status.noFace, {
    timeout: 60_000,
  })
  expect(
    models.length,
    'model files fetched once the camera opened',
  ).toBeGreaterThan(0)
  await expect(panel.getByText(copy.noSavedFace(personId))).toBeVisible()
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), FACE_STORAGE_KEY),
    'face data saved from a camera with no face',
  ).toBeNull()

  await goOnWithPicker(page)
})

test('?face=1: signing in with a camera that shows no face picks no name', async ({
  page,
}) => {
  const models = collectModelRequests(page)
  await openFacePanel(page)
  const panel = await acceptConsent(page)
  await pickFirstCrew(page)

  // One frame, no face in it, no saved face either: no name is picked, the
  // panel stays open on the sentence and the check stays on this phase.
  await panel.getByRole('button', { name: copy.signIn, exact: true }).click()
  await expect(panel.getByRole('alert')).toHaveText(copy.status.notRecognised, {
    timeout: 60_000,
  })
  expect(
    models.length,
    'model files fetched once the camera opened',
  ).toBeGreaterThan(0)
  await expectOnIdentify(page)
  await expect(crewPicker(page).getByRole('radio').first()).toBeFocused()

  await goOnWithPicker(page)
})

test('?face=1: deleting the saved face leaves nothing behind for faces', async ({
  page,
}) => {
  // A descriptor of the shape the panel saves, with no face behind it: 128
  // numbers, which is all this test needs to have something to delete.
  const descriptor = Array.from({ length: 128 }, (_, index) => index / 128)
  await page.goto('/?face=1')
  const personId = await pickFirstCrew(page)
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [FACE_STORAGE_KEY, JSON.stringify([{ personId, descriptor }])] as [
      string,
      string,
    ],
  )

  // The person has to be on duty again after the reload, because the panel
  // deletes the face of the person picked in the header.
  await page.reload()
  expect(await pickFirstCrew(page), 'the same person as the saved face').toBe(
    personId,
  )
  await page.getByRole('button', { name: copy.buttonLabel }).click()
  const panel = await acceptConsent(page)
  const deleteButton = panel.getByRole('button', { name: copy.deleteAction })
  await expect(deleteButton).toBeVisible()

  await deleteButton.click()
  await expect(panel.getByText(copy.deleteConfirm(personId))).toBeVisible()
  await panel
    .getByRole('button', { name: copy.deleteConfirmAction, exact: true })
    .click()

  await expect(panel.getByRole('status')).toHaveText(copy.status.deleted(personId))
  await expect(panel.getByText(copy.noSavedFace(personId))).toBeVisible()
  expect(
    await page.evaluate((key) => window.localStorage.getItem(key), FACE_STORAGE_KEY),
    'face data after the delete',
  ).toBeNull()
  expect(
    await page.evaluate(() =>
      Object.keys(window.localStorage).filter((key) => key.includes('face')),
    ),
    'face keys left in this browser',
  ).toEqual([])

  await goOnWithPicker(page)
})
