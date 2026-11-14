# Frontend tasks T-41 to T-55 · briefs for opencode (DeepSeek Flash)

Every pending frontend item that had no card before Sat 14 15:00. The cards
are in `team/eng2/notes/frontend-tasks.csv`; Eng 1 creates them on the board
with `python scripts/board.py import team/eng2/notes/frontend-tasks.csv`
(`board.py` needs `gh`, which this machine does not use). The numbers T-41 to
T-55 leave room for the cards Eng 1 writes from T-07.

Each brief below is self-contained: one task per opencode run, in order, after
block B (Home and content readers) is committed.

## How to run one task
```bash
opencode run -m deepseek/deepseek-flash --agent eng2 --auto --title "T-41" \
  "Do task T-41 in team/eng2/notes/flash-tasks.md. Read the Common rules first." < /dev/null
```
- `< /dev/null` matters: without it opencode waits for input and never starts.
- Two iterations per card (Juli, Sat 14 17:05): run 1 builds; the review goes
  back to the same session with `opencode run -s <session-id> ...` for run 2.
- Card moves (Todo → In progress → Review) are done by Juli or her agent, not
  by the run.

## Common rules (every task)
1. Read first: `AGENTS.md`, `STANDARDS.md`, `team/eng2/notes/frontend-architecture.md`,
   `FORMATS.md` (`git show origin/eng1:FORMATS.md` until it is merged), and the
   current code under `frontend/src`.
2. Write only inside `frontend/`. No git commands except `git show` to read.
3. No new dependency unless the task names it with an exact version.
4. TypeScript strict, no `any`, no unused code, small pure functions, clear
   names, comments only for the why. Every text on screen lives in `strings.ts`.
5. Never invent an indicator, unit, threshold, level name or medical text.
   Only `config/` files or the `FORMATS.md` placeholders. No diagnosis words,
   no probabilities, no risk percentages, no mention of AI. English only.
6. Mission time is "Day N"; clock time is 24-hour `HH:MM`; a space between
   number and unit (`STANDARDS.md` sections 3 and 4).
7. Accessibility: native controls, visible focus, never colour alone, every
   form field has a label, errors are linked with `aria-describedby`.
8. Finish with `pnpm lint`, `pnpm test` and `pnpm build` passing, from
   `frontend/`, and a short report: files, tests added, command results, open
   questions.

---

## T-41 · Entry store in the browser with an outbox (P0, REQ-02, REQ-28)
Build `frontend/src/data/entryStore.ts`:
```ts
interface MissionClock { missionDay: number; time: string }   // time is HH:MM
interface EntryStore {
  list(filter?: { personId?: string; indicatorId?: string }): Entry[]
  add(entry: Omit<Entry, 'id'>): Entry          // id from crypto.randomUUID()
  isPersistent(): boolean                        // false after a storage failure
  subscribe(listener: () => void): () => void    // for useSyncExternalStore
  getSnapshot(): Entry[]                         // same array until something changes
}
interface Outbox {
  pending(): Entry[]
  markSent(ids: string[], at: MissionClock): void
  lastSent(): MissionClock | null
}
```
- One `LocalEntryStore` class implements both, over `localStorage` key
  `hemoso:v2` holding `{ version: 2, entries, pendingIds, lastSent }`.
- Every read and write in try/catch. On failure keep working in memory and
  `isPersistent()` returns false.
- First run (key absent): seed with the demo entries from `loadContent()`.
  Seeded entries are not pending; only entries added with `add` are.
- `src/hooks/useEntries.ts`: `useEntries(store)` with `useSyncExternalStore`.
- `src/domain/clock.ts`: `missionNow(entries, date = new Date())` returns the
  latest mission day in `entries` (1 when empty) and `date` as `HH:MM`.
- Tests: add and list with filters; persistence across two instances on the
  same storage; seeding happens once; pending and markSent; lastSent; a storage
  that throws gives `isPersistent() === false` and still works; subscribe fires
  on add; `missionNow`.

## T-42 · Entry screen (P0, REQ-02)
- `src/screens/Entry.tsx`: a form with
  - "Indicator": a `<select>` of every indicator from `loadContent()` (name shown).
  - "Value": `<input type="number">`, its label ends with the unit in brackets,
    and the unit is also shown next to the field, from the indicator's `unit`.
  - "Mission day": number input, default `missionNow(...).missionDay`.
  - "Time": `<input type="time">`, default `missionNow(...).time`.
  - "Save entry" submit button.
- Validation: value required and finite; day a positive integer; time `HH:MM`.
  Each error appears under its field, linked with `aria-describedby`, and focus
  moves to the first invalid field.
- On success: `store.add(...)` for the selected person, a `role="status"`
  message "Saved. Waiting to be sent.", clear only the value field.
- App: add an "Entry" tab to `TABS`; create the store once in App; Home reads
  entries through `useEntries(store)` instead of `data.demoEntries`, so a saved
  entry shows on Home at once.
- Tests: every field has a label; unit shown; each validation error; save by
  keyboard only (Tab and Enter); the entry appears on Home after saving.

## T-43 · Sync client (P1, REQ-28)
`frontend/src/data/sync.ts`:
```ts
interface SyncClient {
  isConfigured(): boolean
  push(entries: Entry[]): Promise<{ accepted: string[] }>
}
```
- `NoopSync`: `isConfigured()` false; `push` is never called by `flushOutbox`.
- `HttpSync(baseUrl, fetchFn?)`: strip a trailing slash from `baseUrl`; default
  `fetchFn` is `(input, init) => fetch(input, init)` (an unbound `fetch` throws
  "Illegal invocation" in browsers); POST `${baseUrl}/entries` with JSON
  `{ entries }`; expect `{ accepted: string[] }`; a non-OK response or network
  error throws `SyncError` with the status (0 for network).
- `createSyncClient()`: `HttpSync` when `import.meta.env.VITE_API_BASE_URL` is
  non-empty, else `NoopSync`. Declare the variable in `src/vite-env.d.ts`.
- `flushOutbox(outbox, client, now: MissionClock)`: returns
  `{ sent: number; failed: number; error?: string }` and never throws; marks
  only accepted ids as sent; does nothing when not configured.
- `src/hooks/useSync.ts`: calls `flushOutbox` on the window `online` event and
  exposes `sendNow()`; never blocks the UI.
- Tests: Noop leaves entries pending; success; partial accept; HTTP error;
  network error; URL with and without trailing slash; default fetch is called
  when the client is built before `fetch` is stubbed.

## T-44 · Sync status (P1, REQ-28)
`src/components/SyncStatus.tsx` in the header:
- "N waiting to be sent" (or "Nothing waiting to be sent").
- "Last sent: Day N HH:MM" or "Not sent yet".
- "Online" or "Offline" in words, from `navigator.onLine` and the
  `online`/`offline` events.
- "Send now" button calling `sendNow()`; disabled with a reason in text when
  there is no backend configured ("No server set up for this demo").
- If `store.isPersistent()` is false: "Entries are not saved on this device."
- Tests for each text, the button by keyboard, and the offline event.

## T-45 · History screen (P1, REQ-12)
- `src/domain/entries.ts` (block B adds `latestEntry` here): add
  `compareToOwnHistory(entries)` for one person and one indicator: returns
  `null` with fewer than 2 entries, else `{ latest, earlierCount, earlierMedian, difference }`
  where the median is of that same person's earlier entries only.
- `src/screens/History.tsx`: "Indicator" select; a table (Day, Time, Value,
  Status) newest first, Status from `attentionFor` shown as text; a summary
  sentence: "Latest: <value> <unit> on Day N HH:MM. Your earlier median:
  <value> <unit> (<count> entries). Difference: <+/-value> <unit>." With fewer
  than 2 entries: "Not enough earlier entries to compare yet."
- Add the "History" tab.
- Tests: domain function (even and odd counts, ties on the same day, one
  entry); screen table order; the sentence; another person's entries never
  count.

## T-46 · History chart (P1, REQ-12, REQ-15)
`src/components/IndicatorChart.tsx`, plain SVG, no library:
- One point per entry by mission day, joined by a line; the earlier median as a
  dashed line; each attention threshold as a dotted line with its level name
  written next to it.
- `role="img"` with `aria-labelledby` pointing to the summary sentence of T-45;
  the table of T-45 stays as the full text alternative.
- Scales from the data; works from 320 px wide (`viewBox`, width 100 %).
- Tests: the right number of points; threshold labels present as text; the
  accessible name.

## T-47 · Indicator details (P1, REQ-01)
- In each Home row, a "Details" disclosure (reuse `Disclosure`) showing the
  sections parsed from `config/content/<id>.md`: Why it matters, How
  spaceflight affects it, Measurement steps as an `<ol>`, How to prevent
  problems, and the sources.
- An empty section is left out, not shown as a blank heading.
- Tests: each section, the steps as a numbered list, keyboard open and close.

## T-48 · Offline after the first load (P1, REQ-28)
- `frontend/public/sw.js`, hand-written: a versioned cache name
  (`hemoso-v1`); on install cache `./` and `./index.html`; on activate delete
  older `hemoso-*` caches; on fetch of a same-origin GET: navigations are
  network-first with the cached `index.html` as fallback, other files are
  cache-first and stored on first fetch.
- Register in `src/main.tsx` only when `import.meta.env.PROD` and
  `'serviceWorker' in navigator`, with the relative path `./sw.js`.
- `frontend/vercel.json`: add a header `Cache-Control: no-cache` for `/sw.js`.
- Test in Playwright (after T-49 exists, or create the config here): build,
  `pnpm preview`, visit once, wait for the worker, set the context offline,
  reload, Home still shows.

## T-49 · Playwright demo path with axe (P0, REQ-15)
- Add exactly `@playwright/test@1.65.1` and `@axe-core/playwright@4.14.0` as dev
  dependencies; `pnpm exec playwright install chromium`.
- `frontend/playwright.config.ts`: `webServer` runs `pnpm build && pnpm preview`
  on a fixed port; project "desktop" at 1280 × 800.
- `frontend/e2e/demo-path.spec.ts`, keyboard only: skip link, Home rows, open
  Details and Sources, Entry tab, save an entry, back to Home and see it,
  History tab and the comparison sentence. Fail on any `console.error` or
  failed request.
- On each screen run axe; fail on serious or critical violations.
- Script `"e2e": "playwright test"`. Vitest must not pick up `e2e/`: set
  `test.include` to `src/**/*.test.{ts,tsx}`. `tsc -b` and lint must pass with
  the new folder. The Vercel build (lint, test, build) must not run e2e.
- Note for Eng 1: these two libraries need rows in `docs/DECISIONS.md`
  (Apache-2.0 and MPL-2.0).

## T-50 · Phone layout and public link (P0, REQ-32)
- Styles: every screen usable from 320 px wide with no horizontal scroll;
  tables scroll inside their own box; touch targets at least 44 px.
- Add a Playwright project "phone" (Pixel 7 device) running the same demo path.
- Human step, not for the run: Juli opens https://hemoso.vercel.app on a real
  phone in a private window, with no login, and writes the result in
  `team/eng2/LOG.md`.

## T-51 · English and wording check (P0, REQ-30)
- `frontend/src/strings.test.ts`: walk every value of `strings` (call the
  functions with sample arguments) and fail on non-English letters
  (`á é í ó ú ñ ¿ ¡`), on "diagnosis", "disease", "risk percentage" and on "AI"
  as a word.
- Check by reading that numbers and units have a space, mission time is
  "Day N", times are `HH:MM`; fix any string that does not.

## T-52 · Demo recording (P0, REQ-31, T-16)
- A Playwright project "record" (1280 × 800, `video: 'on'`) and
  `frontend/e2e/record.spec.ts` that walks the demo path with short pauses so
  the whole video is 30 s or less, and saves one screenshot per step in
  `frontend/demo/screenshots/`.
- Script `"record": "playwright test --project=record"`; video and screenshots
  are git-ignored (`frontend/demo/` output only).
- `frontend/demo/subs.srt`: one cue per step with timings that match the
  pauses. The text of each cue comes from `submission/video.md` (Bio 1); until
  it exists, each cue says `TODO from submission/video.md`.
- The burn-in command is in `docs/DEPLOY.md` section 2; `ffprobe` must report
  30 s or less.

## T-53 · Read the team's real config files (P0, REQ-01, REQ-02)
Only when Phys, Bio 1 and Bio 2 have pushed their files to `config/`.
- Run the app: the placeholder notice must be gone.
- Every line in "Content problems" is either a parser bug (fix it here, with a
  test) or a content error (list it in the report for the file's owner; never
  edit `config/`).

## T-54 · Connect to the backend API (P1, REQ-12, REQ-28)
Only when Eng 1 publishes the contract (`docs/API.md` or `docs/CONTRACTS.md`)
for storing and reading entries (REQ-27).
- Match `HttpSync` to the contract (path, body, response, errors).
- Read history from the API when configured, keep the local store as the
  offline copy and the outbox as the queue.
- Juli sets `VITE_API_BASE_URL` in the Vercel project; the public demo keeps
  working without it.

## T-56 · Visual design (P0, presentation)
Load the `frontend-design` skill first. Today the app is plain black text on
white: it works but does not look designed. Give it a calm, clinical look for
a crew member checking their health on a long mission.
- Design tokens as CSS custom properties on `:root`: colours, a type scale
  (system font stack only, no web fonts, nothing from a CDN), spacing, radius,
  shadow. No hard-coded colours outside the tokens.
- Light and dark themes: light by default, dark under
  `@media (prefers-color-scheme: dark)`. Every text and badge keeps at least
  4.5:1 contrast in both; check each pair and list the ratios in the report.
- Layout: a header band with "HeMoSo", the synthetic data note and the person
  picker; content centred with a max width around 960 px and comfortable side
  padding; works from 320 px.
- Each indicator on Home as a card: name and reading on top, the attention
  badge clearly visible, the next step as the main sentence, Sources and
  Details as quiet buttons at the bottom. Content problems and the placeholder
  notice as distinct notice boxes, not plain paragraphs.
- Tabs that look like tabs, with a clear selected state that is not colour
  alone (weight or underline too).
- Keep every accessibility rule: visible focus, 44 px targets, never colour
  alone. No NASA logos or Space Apps marks, no images of people.
- Change markup only where styling needs a wrapper or a class; do not change
  behaviour. All tests must still pass.

## T-57 · Move the interface to MUI with the HeMoSo theme (P0, presentation)
Juli's decision (Sat 14 16:00): build the interface with MUI (Material UI,
https://mui.com/) and keep the look of `frontend/sdd/style-guide.md`. Read the
style guide in full first. Behaviour, texts, data and tests stay the same.
- Add exactly `@mui/material@9.5.0`, `@emotion/react@11.14.0`,
  `@emotion/styled@11.14.1` (all MIT). No `@mui/icons-material` (too large):
  keep the inline SVG icons, wrapped in MUI `SvgIcon`. No Roboto: MUI must use
  the style guide's font stacks; nothing from a CDN.
- `src/theme/tokens.ts`: every colour, font stack, spacing step and radius of
  the style guide, for dark and light. `src/theme/theme.ts`: `createTheme`
  with `cssVariables: true` and `colorSchemes: { dark, light }`, dark as the
  default, light from `prefers-color-scheme`; `typography` from the guide's
  scale; `shape.borderRadius` 4; `spacing` in 4 px steps; component overrides:
  `MuiButton` (radius 2, uppercase, no elevation), `MuiCard` and `MuiPaper`
  (1 px border, no shadow in dark), `MuiChip` (uppercase monospace label),
  `MuiTab` (uppercase monospace, 44 px), `MuiAlert`, `MuiTextField`,
  `MuiSelect`, `MuiRadio`, `MuiFocusVisible` (3 px accent outline, 2 px offset).
- `src/main.tsx`: `ThemeProvider` + `CssBaseline` (+ `InitColorSchemeScript`
  if needed for no flash).
- Components, one by one, behaviour unchanged:
  - Header: `AppBar` (static, no elevation) + `Toolbar`; person picker as MUI `Select` with its label.
  - Tabs: MUI `Tabs` / `Tab` / tab panels (MUI already follows the WAI-ARIA tabs pattern; keep the accessible names "Home" and "Entry").
  - Indicator card: `Card` + `CardContent`; the badge always on its own row
    under the title so every card in the grid lines up; the reading in the
    monospace font; units never uppercased. Grid with MUI `Grid` (3, 2, 1 columns).
  - `AttentionBadge`: `Chip` with the icon and the visible text, status
    colours from the tokens, never colour alone.
  - `Notice`: `Alert` (info, warning, success). "Content problems (for the
    team)" moves out of the astronaut's Home: show it only when the URL has
    `?team=1`, so the demo video never shows it.
  - `Disclosure`: MUI `Button` + `Collapse`, keeping `aria-expanded` and `aria-controls`.
  - Entry: `TextField`, `Select`, `RadioGroup` + `FormControlLabel` for the
    1-to-5 scale, `FormHelperText` for errors linked to the field, the unit as
    an `InputAdornment`, `Button variant="contained"` for "Save entry", native
    time input kept (`type="time"`).
- Delete from `styles.css` every rule MUI now covers; keep only what is left
  (technical grid background, anything MUI has no prop for). Remove dead classes.
- `src/theme.test.ts`: read the pairs from `tokens.ts` instead of `styles.css`;
  every pair still passes.
- Tests: update queries only where the DOM really changed; never weaken an
  assertion. All tests, lint and build pass. Report the bundle size before and
  after.
- Note for Eng 1: three libraries need rows in `docs/DECISIONS.md` (MIT).

## T-58 · Sign in with the face, on the device (P2)
Read `team/eng2/notes/face-login-proposal.md` first. Frontend only: no
backend call, no cloud service, nothing from a CDN.
- Add exactly `@vladmandic/face-api@1.7.15` (MIT). Copy only the model files
  you need (tiny face detector, 68-point landmarks, face recognition) from the
  package's `model/` folder into `frontend/public/models/`, with its licence
  file next to them. Load them with `faceapi.nets.*.loadFromUri('./models')`.
- `src/face/` module, imported with a dynamic `import()` only when the user
  opens "Sign in with face", so the main bundle does not grow.
- `src/face/descriptors.ts` (pure, tested without a camera): average several
  descriptors, euclidean distance, best match under a threshold of 0.5 (a
  constant with a comment naming the face-api documentation as its source),
  read and write `{ personId, descriptor: number[] }[]` under the
  `localStorage` key `hemoso:face:v1` with try/catch like the entry store.
- `src/screens/FaceSignIn.tsx`: Register (pick the person, take 5 frames over
  about 2 s, store the average) and Sign in (one look, best match selects the
  person in App, else "Face not recognised. Pick your name instead.").
  The `<video>` is shown only while the camera is on; every track is stopped
  when the screen closes. No frame or image is stored or sent.
- A "Sign in with face" button in the header next to the person picker; the
  picker stays and keeps working.
- Tests: descriptors.ts fully; the screen with `getUserMedia` and the face
  module mocked (registered, recognised, not recognised, camera denied).
- Note for Eng 1: a `docs/DECISIONS.md` row for the library and its models.

## T-59 · Face sign-in consent, delete and fallback (P2)
- Before the camera opens: a consent notice "Your face is turned into numbers
  stored only in this browser. No picture is kept and nothing is sent. This is
  a quick way to pick your name, not a security lock." with "Continue" and
  "Cancel".
- "Delete my face data" for the selected person, with a confirmation.
- Camera denied, missing or busy: a clear message and focus back on the person
  picker. Everything works by keyboard; the video has a text label.
- Tests for each path.

## T-55 · FRONT_TOBACK.md (P1) · not for Flash
Written by Claude Code at the end, from the final code and the contract of T-54.
