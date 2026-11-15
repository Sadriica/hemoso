import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test'
import { strings } from '../src/strings'

// The same account on a second device (REQ-27, REQ-37). Context A creates the
// account with a mission start 11 days ago and saves a reading; context B is a
// fresh browser profile that signs in with the PIN. Once the sync is done, the
// report in B must count Flight Day 12 and know the reading of A.
//
// Not covered: the real server (every answer comes from page.route, over one
// shared in-memory copy of the account), the token expiry, the face sign-in and
// the retry of a failed send.

const PORT = 47820 + Number(process.env.TEST_PARALLEL_INDEX ?? 0)
const BASE_URL = `http://localhost:${PORT}`
const API = 'http://api.test'
const PERSON = 'cadet_second_device'
const PIN = '4821'
const TOKEN = 'token-of-the-second-device-account'

test.use({ baseURL: BASE_URL })

let server: ChildProcess | null = null

test.beforeAll(async () => {
  server = spawn(
    join(process.cwd(), 'node_modules', '.bin', 'vite'),
    ['--port', String(PORT), '--strictPort'],
    { cwd: process.cwd(), env: { ...process.env, VITE_API_BASE_URL: API }, stdio: 'ignore' },
  )
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      if ((await fetch(BASE_URL)).ok) return
    } catch {
      // Not up yet.
    }
    await delay(200)
  }
  throw new Error(`the dev server on ${BASE_URL} did not start`)
})

test.afterAll(() => {
  server?.kill()
})

interface StoredEntry {
  person_id: string
  indicator_id: string
  value: number
  unit: string
  mission_day: number
  time: string
  context: string
}

// The one copy of the account that both browsers talk to.
interface Api {
  pin: string | null
  missionStart: string | null
  entries: StoredEntry[]
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function mockApi(context: BrowserContext, api: Api): Promise<void> {
  await context.route(`${API}/**`, async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    const path = new URL(request.url()).pathname
    const method = request.method()
    if (path === '/accounts' && method === 'POST') {
      const body = request.postDataJSON() as { pin: string; mission_start?: string }
      api.pin = body.pin
      if (body.mission_start) api.missionStart = body.mission_start
      await json(route, 201, { person_id: PERSON })
      return
    }
    if (path === '/sessions' && method === 'POST') {
      const body = request.postDataJSON() as { pin: string }
      if (body.pin !== api.pin) {
        await json(route, 401, { detail: 'wrong username or PIN' })
        return
      }
      await json(route, 200, { token: TOKEN, person_id: PERSON, expires_at: '2999-01-01T00:00:00Z' })
      return
    }
    if (request.headers().authorization !== `Bearer ${TOKEN}`) {
      await json(route, 401, { detail: 'session expired' })
      return
    }
    if (path.endsWith('/profile')) {
      await json(route, 200, { person_id: PERSON, mission_start: api.missionStart })
      return
    }
    if (path.endsWith('/mission_start') && method === 'PUT') {
      api.missionStart = (request.postDataJSON() as { mission_start: string }).mission_start
      await json(route, 200, { person_id: PERSON, mission_start: api.missionStart })
      return
    }
    if (path.endsWith('/history')) {
      const indicator = path.split('/')[4]
      await json(route, 200, api.entries.filter((item) => item.indicator_id === indicator))
      return
    }
    if (path === '/entries' && method === 'POST') {
      const body = request.postDataJSON() as StoredEntry
      api.entries.push(body)
      await json(route, 201, body)
      return
    }
    // Anything else (state, pain, symptoms, conditions) is not under test.
    await json(route, 404, { detail: 'not mocked' })
  })
}

function isoDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function declineFaceOffer(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
  const notNow = page.getByRole('button', { name: strings.signIn.faceOfferSkip })
  if ((await notNow.count()) > 0) await notNow.click()
}

test('a second browser signs in and counts the same Flight Day with the history', async ({
  browser,
}) => {
  const api: Api = { pin: null, missionStart: null, entries: [] }
  const start = isoDaysAgo(11)

  // Context A: the account is created with its start date and one reading is sent.
  const first = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' })
  await mockApi(first, api)
  const pageA = await first.newPage()
  await pageA.goto('/')
  await pageA.getByRole('tab', { name: strings.signIn.createToggle }).click()
  await pageA.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await pageA.getByLabel(strings.signIn.pin, { exact: true }).fill(PIN)
  await pageA.getByLabel(strings.signIn.confirmPin).fill(PIN)
  await pageA.getByLabel(strings.mission.startLabel).fill(start)
  await pageA.getByRole('button', { name: strings.signIn.createAction }).click()
  await declineFaceOffer(pageA)

  await expect(pageA.getByLabel(strings.entry.missionDay)).toHaveValue('12')
  await pageA.getByLabel(strings.entry.systolic, { exact: true }).fill('121')
  await pageA.getByLabel(strings.entry.diastolic, { exact: true }).fill('79')
  await pageA.getByRole('button', { name: strings.entry.save }).click()
  await expect.poll(() => api.entries.length).toBeGreaterThanOrEqual(2)
  await expect.poll(() => api.missionStart).toBe(start)
  expect(api.entries.every((item) => item.mission_day === 12)).toBe(true)
  await first.close()

  // Context B: nothing on this device; the account holds everything.
  const second = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce' })
  await mockApi(second, api)
  const pageB = await second.newPage()
  await pageB.goto('/')
  await pageB.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await pageB.getByLabel(strings.signIn.pin, { exact: true }).fill(PIN)
  await pageB.getByRole('button', { name: strings.signIn.action, exact: true }).click()
  await declineFaceOffer(pageB)

  // The day follows the synced start, not the day 1 the form opened with.
  await expect(pageB.getByLabel(strings.entry.missionDay)).toHaveValue('12')
  // And the readings of A are here: the blood pressure row shows its last value.
  await expect(pageB.getByText(strings.entry.lastValue('121 / 79 mmHg'))).toBeVisible()
  await second.close()
})
