import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { expect, test, type Page, type Route } from '@playwright/test'
import { strings } from '../src/strings'

// The top bar from a phone to a wide desktop, with the mission start editor
// closed and open: nothing overlaps, nothing is cut and the page does not
// scroll sideways. The editor only exists for an account, so the spec signs in
// against a mocked API, on a dev server of its own (same approach as
// sign-in.spec.ts). Set TOPBAR_SHOTS to a folder to also save a screenshot of
// every width and theme.
const PORT = 4421 + Number(process.env.TEST_PARALLEL_INDEX ?? 0)
const BASE_URL = `http://localhost:${PORT}`
const API = 'http://api.test'
const PERSON = 'cadet_okoro'
const PIN = '4821'
const TOKEN = 'token-of-the-account'
const WIDTHS = [360, 390, 768, 1024, 1030, 1280, 1440, 1920]

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

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
}

async function mockApi(page: Page): Promise<void> {
  await page.route(`${API}/**`, async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS })
      return
    }
    const path = new URL(request.url()).pathname
    const body =
      path === '/sessions'
        ? { token: TOKEN, person_id: PERSON, expires_at: '2999-01-01T00:00:00Z' }
        : path.endsWith('/history')
          ? []
          : { stored: true }
    await route.fulfill({
      status: path === '/sessions' ? 200 : 201,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
}

async function signIn(page: Page): Promise<void> {
  await page.route(`${API}/accounts`, async (route) => {
    await route.fulfill({
      status: 201,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify({ person_id: PERSON }),
    })
  })
  await mockApi(page)
  await page.goto('/')
  await page.getByRole('textbox', { name: strings.signIn.username }).fill(PERSON)
  await page.getByLabel(strings.signIn.pin, { exact: true }).fill(PIN)
  await page.getByRole('button', { name: strings.signIn.action, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    strings.phases.report.headline[0],
  )
  const notNow = page.getByRole('button', { name: strings.signIn.faceOfferSkip })
  if ((await notNow.count()) > 0) await notNow.click()
  await expect(page.getByText(strings.topbar.onDuty(PERSON))).toBeVisible()
}

// A new account has no start yet, so the button says "set it"; after a save, "change".
const OPEN = new RegExp(`^(${strings.mission.set}|${strings.mission.change})$`)

const ITEMS = [
  '.identity',
  '.topbar__stamp',
  '.topbar__duty',
  '.mission-start',
  '.synthetic-notice',
  '.sync-chip',
  '.topbar__motion',
]

// Every visible text box of the bar, as lines of boxes: two items sharing
// pixels, or one reaching past the window, is a broken bar.
async function expectCleanBar(page: Page, label: string): Promise<void> {
  const report = await page.evaluate((selectors) => {
    const rects: { name: string; l: number; t: number; r: number; b: number }[] = []
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(`.topbar ${selector}`)) {
        for (const rect of Array.from(element.getClientRects())) {
          if (rect.width < 1 || rect.height < 1) continue
          rects.push({ name: selector, l: rect.left, t: rect.top, r: rect.right, b: rect.bottom })
        }
      }
    }
    const problems: string[] = []
    const width = document.documentElement.clientWidth
    for (const a of rects) {
      if (a.l < -0.5 || a.r > width + 0.5) problems.push(`${a.name} leaves the window`)
    }
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i]
        const b = rects[j]
        // A parent contains its children by design.
        if (a.name === '.mission-start' || b.name === '.mission-start') {
          if (a.name === b.name) continue
        }
        const x = Math.min(a.r, b.r) - Math.max(a.l, b.l)
        const y = Math.min(a.b, b.b) - Math.max(a.t, b.t)
        if (x > 1 && y > 1) problems.push(`${a.name} overlaps ${b.name}`)
      }
    }
    const scroll = document.documentElement.scrollWidth - width
    if (scroll > 0) problems.push(`page scrolls sideways by ${scroll}px`)
    return problems
  }, ITEMS)
  expect(report, label).toEqual([])
}

for (const theme of ['dark', 'light'] as const) {
  test(`top bar is clean at every width, closed and open (${theme})`, async ({ page }) => {
    test.slow()
    await page.emulateMedia({ colorScheme: theme })
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page)
    const shots = process.env.TOPBAR_SHOTS
    if (shots) mkdirSync(shots, { recursive: true })

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      const bar = page.locator('.topbar')
      await expectCleanBar(page, `${theme} ${width} closed`)
      if (shots) await bar.screenshot({ path: join(shots, `${theme}-${width}-closed.png`) })

      await page.locator('.topbar').getByRole('button', { name: OPEN }).click()
      await expect(page.getByLabel(strings.mission.dayOneLabel)).toBeFocused()
      await expectCleanBar(page, `${theme} ${width} open`)
      if (shots) await bar.screenshot({ path: join(shots, `${theme}-${width}-open.png`) })

      // With a wrong date, the sentence is there too.
      await page.getByLabel(strings.mission.dayOneLabel).fill('2026-13-45')
      await page.getByRole('button', { name: strings.mission.save, exact: true }).click()
      await expect(page.getByRole('alert').filter({ hasText: strings.mission.dayOneInvalid })).toBeVisible()
      await expectCleanBar(page, `${theme} ${width} error`)
      if (shots) await bar.screenshot({ path: join(shots, `${theme}-${width}-error.png`) })

      await page.keyboard.press('Escape')
      await expect(page.locator('.topbar').getByRole('button', { name: OPEN })).toBeFocused()
    }
  })
}

test('the editor saves a date, and keeps an invalid or future one out', async ({ page }) => {
  await signIn(page)
  await page.locator('.topbar').getByRole('button', { name: OPEN }).click()
  const field = page.getByLabel(strings.mission.dayOneLabel)
  await field.fill('2999-01-01')
  await page.getByRole('button', { name: strings.mission.save, exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText(strings.mission.dayOneFuture)
  await field.fill('2026-11-02')
  await page.getByRole('button', { name: strings.mission.save, exact: true }).click()
  await expect(field).toHaveCount(0)
  await expect(page.getByText(strings.mission.started('2 Nov'))).toBeVisible()
  await expect(page.locator('.topbar').getByRole('button', { name: strings.mission.change })).toBeFocused()
})
