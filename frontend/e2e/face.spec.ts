import { expect, test, type Page } from '@playwright/test'
import { FACE_STORAGE_KEY } from '../src/face/descriptors'
import { strings } from '../src/strings'

// The face panel with a camera behind it (REQ-36). The plain page is the other
// half of this: face-off.spec.ts checks that the face option is there from the
// start and asks for no model until it is chosen.
//
// The camera is Chromium's fake device: a moving test pattern with no person in
// it, and the permission already granted. It is set in this file only, so the
// other specs keep the plain browser.
//
// Nothing here uses a picture of a person, which is also why the happy paths
// are not here: registering a face and signing in with it need a real face in
// front of a real camera, and are checked by hand.
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
  await page.goto('/')
  await page.getByRole('button', { name: copy.buttonLabel }).click()
  const panel = page.getByRole('region', { name: copy.heading })
  await expect(panel).toBeVisible()
  return panel
}

// Past the consent, where the camera actions and the delete live.
async function acceptConsent(page: Page) {
  const panel = page.getByRole('region', { name: copy.heading })
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
  const panel = page.getByRole('region', { name: copy.heading })
  await panel.getByRole('button', { name: copy.closeLabel }).click()
  await expect(panel).toHaveCount(0)
  const personId = await pickFirstCrew(page)
  await page.getByRole('button', { name: phasesCopy.identify.next }).click()
  await expectOnReport(page)
  await expect(page.getByText(strings.topbar.onDuty(personId))).toBeVisible()
}

test('face: the consent comes before any camera, and Cancel leaves the picker working', async ({
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
  await expect(page.getByRole('region', { name: copy.heading })).toHaveCount(0)
  expect(models, 'model files asked for before the camera opened').toEqual([])

  // Declining costs nothing: the list, the way forward and the report are
  // exactly as they were.
  await expect(page.getByRole('button', { name: copy.buttonLabel })).toBeVisible()
  const personId = await pickFirstCrew(page)
  await page.getByRole('button', { name: phasesCopy.identify.next }).click()
  await expectOnReport(page)
  await expect(page.getByText(strings.topbar.onDuty(personId))).toBeVisible()
})

test('face: a camera that shows no face registers nobody and names nobody', async ({
  page,
}) => {
  const models = collectModelRequests(page)
  await openFacePanel(page)
  const panel = await acceptConsent(page)
  const personId = await pickFirstCrew(page)
  const register = panel.getByRole('button', { name: copy.register })
  const signIn = panel.getByRole('button', { name: copy.signIn, exact: true })
  // The face of the person on duty, named by the panel: no person is picked in
  // the panel itself (T-70).
  await expect(panel.getByText(copy.registeredFor(personId))).toBeVisible()
  await expect(register).toBeEnabled()

  // Five frames of the test pattern, no face in any of them: nothing is saved
  // and the person reads why.
  await register.click()
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

  // The second camera of the same panel: one frame, no face in it, no saved
  // face either. No name is picked, the sentence names what happened and every
  // control comes back, so the person can try again or pick a name.
  await signIn.click()
  await expect(panel.getByRole('alert')).toHaveText(copy.problem('notRecognised', 'picker'), {
    timeout: 60_000,
  })
  await expect(register).toBeEnabled()
  await expect(signIn).toBeEnabled()
  await expect(panel.getByText(copy.registeredFor(personId))).toBeVisible()
  await expectOnIdentify(page)
  await expect(crewPicker(page).getByRole('radio').first()).toBeFocused()

  await goOnWithPicker(page)
})

test('face: deleting the saved face leaves nothing behind for faces', async ({
  page,
}) => {
  // A descriptor of the shape the panel saves, with no face behind it: 128
  // numbers, which is all this test needs to have something to delete.
  const descriptor = Array.from({ length: 128 }, (_, index) => index / 128)
  await page.goto('/')
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

test('face: when the face check cannot run, the sentence points at the crew list and the list has the focus', async ({
  page,
}) => {
  // The model files do not arrive: the same dead end a device with a broken
  // network path or an old browser reaches (T-70).
  await page.route('**/models/*.bin', (route) => route.abort())
  const warnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text())
  })
  await openFacePanel(page)
  const panel = await acceptConsent(page)

  await panel.getByRole('button', { name: copy.signIn, exact: true }).click()

  await expect(panel.getByRole('alert')).toHaveText(
    copy.problem('failed', 'picker'),
    { timeout: 30_000 },
  )
  await expect(crewPicker(page).getByRole('radio').first()).toBeFocused()
  // The cause is in the console for the next report.
  expect(warnings.some((text) => text.startsWith('face: '))).toBe(true)
  // Nothing is left on: the panel is usable again and the way in still works.
  await expect(
    panel.getByRole('button', { name: copy.signIn, exact: true }),
  ).toBeEnabled()
  await goOnWithPicker(page)
})

test('face: with WebGL missing the model runs on WebAssembly', async ({
  page,
}) => {
  // A device or browser mode with no WebGL context at all (privacy modes,
  // some phones, blocklisted GPUs).
  await page.addInitScript(() => {
    // The page canvas and the off-screen one TensorFlow.js tries both answer
    // "no WebGL".
    for (const target of [HTMLCanvasElement, OffscreenCanvas]) {
      const proto = target.prototype as unknown as {
        getContext: (type: string, ...rest: unknown[]) => unknown
      }
      const original = proto.getContext
      proto.getContext = function (this: unknown, type: string, ...rest: unknown[]) {
        if (/webgl/.test(type)) return null
        return original.call(this, type, ...rest)
      }
    }
  })
  const logs: string[] = []
  page.on('console', (message) => logs.push(message.text()))
  const wasmRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('.wasm')) wasmRequests.push(request.url())
  })
  await openFacePanel(page)
  const panel = await acceptConsent(page)
  await pickFirstCrew(page)

  await panel.getByRole('button', { name: copy.register }).click()

  // The test pattern holds no face, so the model ran and found none: that is
  // the proof the backend works, not a failure sentence.
  await expect(panel.getByRole('alert')).toHaveText(copy.status.noFace, {
    timeout: 120_000,
  })
  expect(logs).toContain('face: running on the wasm backend')
  expect(wasmRequests.length, 'wasm files from this site').toBeGreaterThan(0)
  expect(
    wasmRequests.every((url) => new URL(url).hostname === 'localhost'),
    'no wasm file from another host',
  ).toBe(true)
})
