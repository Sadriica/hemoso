import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect, test, type Page, type Route } from '@playwright/test'
import { strings } from '../src/strings'

// Signing in with a username and a PIN (REQ-37), against a mocked API: an
// account is created, the PIN of that account is signed in, the token is sent on
// the person routes, and signing out forgets it. No real server: every answer
// comes from page.route.
//
// The account options exist only when the app has a base URL, which is decided
// when it is built. The other specs share the public demo build (no server), so
// this file starts a dev server of its own with VITE_API_BASE_URL set. The
// request itself never leaves the browser: page.route answers it.

// One port per worker: the desktop and the phone project run this file at the
// same time, and two vite servers cannot share a port. Playwright numbers its
// workers, so the second one takes the next port.
const PORT = 4401 + Number(process.env.TEST_PARALLEL_INDEX ?? 0)
const BASE_URL = `http://localhost:${PORT}`
const API = 'http://api.test'
const PERSON = 'cadet_okoro'
const PIN = '4821'
const TOKEN = 'token-of-the-account'

test.use({ baseURL: BASE_URL })

let server: ChildProcess | null = null

test.beforeAll(async () => {
  server = spawn(
    join(process.cwd(), 'node_modules', '.bin', 'vite'),
    ['--port', String(PORT), '--strictPort'],
    {
      cwd: process.cwd(),
      env: { ...process.env, VITE_API_BASE_URL: API },
      stdio: 'ignore',
    },
  )
  await waitForServer(BASE_URL)
})

test.afterAll(() => {
  server?.kill()
})

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Not up yet.
    }
    await delay(200)
  }
  throw new Error(`the dev server on ${url} did not start`)
}

// What the mock knows, one copy per test.
interface Api {
  accounts: Map<string, string>
  tokens: Set<string>
  authorizations: Array<string | null>
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  }
}

async function mockApi(page: Page, api: Api): Promise<void> {
  await page.route(`${API}/**`, async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders() })
      return
    }
    const path = new URL(request.url()).pathname
    const body = request.postDataJSON() as { person_id?: string; pin?: string }
    const authorization = request.headers().authorization ?? null
    api.authorizations.push(authorization)

    if (path === '/accounts') {
      const personId = body.person_id ?? ''
      if (api.accounts.has(personId)) {
        await json(route, 409, { detail: 'exists' })
        return
      }
      api.accounts.set(personId, body.pin ?? '')
      await json(route, 201, { person_id: personId })
      return
    }

    if (path === '/sessions') {
      const personId = body.person_id ?? ''
      if (api.accounts.get(personId) !== body.pin) {
        await json(route, 401, { detail: 'wrong username or PIN' })
        return
      }
      api.tokens.add(TOKEN)
      await json(route, 200, {
        token: TOKEN,
        person_id: personId,
        expires_at: '2999-01-01T00:00:00Z',
      })
      return
    }

    // Every other route belongs to a person: it needs the token they signed in
    // with (the synthetic demo astronaut is the only open one).
    const owner = path.split('/')[2] ?? ''
    const open = owner.startsWith('demo_')
    if (!open && (authorization === null || !api.tokens.has(authorization.slice(7)))) {
      await json(route, 401, { detail: 'session expired' })
      return
    }
    if (path.endsWith('/history')) {
      await json(route, 200, [])
      return
    }
    await json(route, 201, { stored: true })
  })
}

async function json(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function newApi(): Api {
  return { accounts: new Map(), tokens: new Set(), authorizations: [] }
}

// The form of the account card, filled and sent.
async function createAccount(page: Page): Promise<void> {
  await page.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await page.getByLabel(strings.signIn.pin, { exact: true }).fill(PIN)
  await page.getByRole('button', { name: strings.signIn.createToggle }).click()
  await page.getByLabel(strings.signIn.confirmPin).fill(PIN)
  await page.getByRole('button', { name: strings.signIn.createAction }).click()
}

// A PIN sign-in on a browser with a camera offers to add a face before the
// report; these tests are about the PIN, so they decline it.
async function declineFaceOffer(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: strings.signIn.faceOfferHeading }),
  ).toBeVisible()
  await page.getByRole('button', { name: strings.signIn.faceOfferSkip }).click()
}

test('creates an account, signs in and sends its token on the person routes', async ({
  page,
}) => {
  const api = newApi()
  await mockApi(page, api)
  await page.goto('/')

  // Worth a sentence when it fails: the options are built, not fetched.
  await expect(
    page.getByRole('button', { name: strings.signIn.createToggle }),
  ).toBeVisible()

  await createAccount(page)
  await declineFaceOffer(page)

  // The account was created and its PIN signed in: the report is open.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
  expect(api.accounts.get(PERSON)).toBe(PIN)
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      'hemoso:session:v1',
    ),
  ).toContain(TOKEN)

  // The history of that person was asked for with the token of that person, and
  // no PIN is written anywhere in the browser.
  expect(api.authorizations).toContain(`Bearer ${TOKEN}`)
  expect(
    await page.evaluate(() => JSON.stringify(window.localStorage)),
  ).not.toContain(PIN)

  // Out of the session: it leaves this device.
  await page.getByRole('button', { name: strings.phases.report.back }).click()
  await expect(page.getByText(strings.signIn.signedInAs(PERSON))).toBeVisible()
  await page.getByRole('button', { name: strings.signIn.signOut }).click()
  await expect(page.getByText(strings.signIn.signedInAs(PERSON))).toHaveCount(0)
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      'hemoso:session:v1',
    ),
  ).toBeNull()
})

test('signs in with the PIN and the name of an account that exists', async ({
  page,
}) => {
  const api = newApi()
  api.accounts.set(PERSON, PIN)
  await mockApi(page, api)
  await page.goto('/')

  await page.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await page.getByLabel(strings.signIn.pin, { exact: true }).fill(PIN)
  await page.getByRole('button', { name: strings.signIn.action, exact: true }).click()
  await declineFaceOffer(page)

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
  expect(api.authorizations).toContain(`Bearer ${TOKEN}`)
})

test('names a wrong PIN and a username that is taken in plain words', async ({
  page,
}) => {
  const api = newApi()
  api.accounts.set(PERSON, PIN)
  await mockApi(page, api)
  await page.goto('/')

  await page.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await page.getByLabel(strings.signIn.pin, { exact: true }).fill('1111')
  await page.getByRole('button', { name: strings.signIn.action, exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(
    strings.signIn.errors.wrong,
  )

  await page.getByRole('button', { name: strings.signIn.createToggle }).click()
  // The PIN of a refused sign-in leaves the field, so it is typed again here.
  await page.getByLabel(strings.signIn.pin, { exact: true }).fill('1111')
  await page.getByLabel(strings.signIn.confirmPin).fill('1111')
  await page.getByRole('button', { name: strings.signIn.createAction }).click()
  await expect(page.getByRole('alert')).toHaveText(
    strings.signIn.errors.exists,
  )
})

test('the demo astronaut still opens without a PIN when the server has accounts', async ({
  page,
}) => {
  const api = newApi()
  await mockApi(page, api)
  await page.goto('/')

  await page
    .getByRole('button', { name: strings.signIn.demoAction })
    .click()

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      'hemoso:session:v1',
    ),
  ).toBeNull()
})
