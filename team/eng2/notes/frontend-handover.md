# Frontend handover · Juli to Wambi

Sat 14 Nov 19:55. Roles swapped at 19:40 (`docs/DECISIONS.md`, 1014687):
Wambi owns `frontend/` from now on. This file is everything needed to keep
building it without asking. State: `main` at 776920e (merge #87) holds all
of Juli's frontend work; nothing is left on `eng2`.

## 1. What the app is now
A guided health check in three phases, always in this order, with no menu
(T-60, dec97ba, Juli's design):

| Phase | Eyebrow | What happens | Code |
| --- | --- | --- | --- |
| Identify | `01 / IDENTIFY` | Pick a name; face sign-in only with `?face=1` | `src/phases/IdentifyPhase.tsx`, `src/screens/FaceSignIn.tsx`, `src/face/` |
| Report | `02 / REPORT` | Enter today's readings, unit beside the field, 1-to-5 choice for the two scales, 24-hour time; "See my status" works with zero readings | `src/phases/ReportPhase.tsx`, `src/screens/Entry.tsx`, `entryDraft.ts` |
| Status | `03 / STATUS` | Cards with reading, badge, next step, who to tell, details, sources; history of one indicator with chart, table and a comparison sentence | `src/phases/StatusPhase.tsx`, `src/screens/Home.tsx`, `History.tsx` |

Frame: `Topbar` (identity, metadata `HEMOSO / CREW HEALTH · DAY N · NOW HH:MM`,
sync status, motion switch, synthetic data sentence), `PhaseHeading`,
`PhaseRail` (progress only, not navigation), `Starfield` (own code, stops with
reduced motion or the switch). Styles: `src/styles.css` (tokens, dark default,
light under `prefers-color-scheme: light`) and `src/phases.css` (the frame).
No UI library: MUI was tried (d5e9850) and removed in dec97ba.

URL switches:
- `?face=1`: face sign-in and its lazy engine and models. Without it nothing
  face-related renders or is requested.
- `?team=1`: shows "Content problems (for the team)". Never in the video.

## 2. Code map
| Folder | Holds | Rule |
| --- | --- | --- |
| `src/content/` | Readers for `config/` (CSV, Markdown), validation, problems list; `load.ts` reads `../../../config/**` with `import.meta.glob` at build time | Pure functions; problems are collected, never thrown |
| `src/domain/` | Types, attention rules, mission clock, sources | Pure; no React |
| `src/data/` | `LocalEntryStore` (`localStorage` key `hemoso:v2`), outbox, sync client | Every storage call in try/catch |
| `src/hooks/` | `useEntries`, `useOutbox`, `useSync` | Thin wrappers |
| `src/face/` | Camera, descriptors, engine (`@vladmandic/face-api` 1.7.15, loaded with `import()`) | Never imported statically |
| `src/screens/`, `src/phases/`, `src/components/` | UI | Every visible text lives in `src/strings.ts` |
| `public/models/` | Three face models (6.5 MB) and their MIT licence | Loaded only with `?face=1` |
| `e2e/` | Playwright: guided check by keyboard with axe on every phase, history, 320 px, face-off; phone (Pixel 7) and desktop | Not part of `pnpm test` |

## 3. Checks (run before every commit)
From `frontend/`:
```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm exec tsc -b
pnpm test          # Vitest, 391 tests at dec97ba
pnpm build         # first load 290 kB raw / 88 kB gzip at dec97ba
pnpm e2e           # Playwright on port 4399, strict; 7 passed, 1 skipped
```
Vercel runs `lint`, `test` and `build` on every deploy (`frontend/vercel.json`);
a failing test stops the deploy and the last good one stays online. e2e does
not run on Vercel (no browsers there).

## 4. Rules the code already keeps (do not break)
- No diagnosis, no probabilities, no risk percentages; none of the words
  listed in `STANDARDS.md` 5 appears in the product (`AGENTS.md`).
- No health logic in code: indicators, units, thresholds, levels and texts
  come only from `config/`. With no attention rule a card says "No threshold
  yet" and points to the CMO, never "In range".
- Unknown ids from the CSV (hazard, level, unit) are content problems, never
  shown raw or prettified.
- Units keep their case (`mmHg`, `mg/dL`); mission time is `DAY N`, clock
  `HH:MM` 24-hour; a scale reads `4 / 5`.
- Never colour alone: every badge has an icon and text. Contrast pairs are
  tested in `src/theme.test.ts` (reads `src/theme/tokens.ts`) for both themes.
- Keyboard through every phase with visible focus; 44 px targets; no
  sideways scroll at 320 px; reduced motion respected.
- Synthetic data only, and the sentence "Demo with synthetic data only." on
  every phase (REQ-14).
- No CDN: fonts are system fonts; nothing loads from another host.

## 5. Open frontend work (now yours)
| Card | Work | Serves | P | State | Notes |
| --- | --- | --- | --- | --- | --- |
| T-53 | Read Bio 2's `config/rules/attention.csv` and Bio 1's `config/content/<id>.md` | REQ-01 | P0 | 50 % | Readers and `notify` ("Tell the crew / CMO / flight surgeon", most severe wins) are done; waits for the files on `main` |
| T-51 | Wording pass | REQ-30 | P0 | 0 % | Raw person id `demo_astronaut_1` shown as a name; "Nothing waiting to be sent" and "Not sent yet" repeat each other; "Sign in" vs "Sign in with face" |
| T-48 | Service worker, offline after first load | REQ-28 | P1 | 0 % | Runtime-cache `/models/` only after a `?face=1` visit; never precache them (the face-off e2e test checks no `/models/` request) |
| T-54 | Read history from the backend | REQ-12 | P1 | 0 % | Route `GET /people/{person}/indicators/{indicator}/history` (`docs/API.md`); the sync client already posts to `POST /entries` |
| T-58 | Face sign-in, iteration 2 | REQ-36 (proposed) | P2 | 60 % | Inside Identify; delete check and button names |
| T-59 | Face consent, delete, fallback | REQ-36 (proposed) | P2 | 40 % | Consent text and picker fallback done |
| T-50 | Public link on desktop and phone | REQ-32 | P0 | 40 % | 320 px and Pixel 7 tested; https://hemoso.vercel.app still serves the 11:58 CLI build, while `main` deploys to Wambi's Vercel project; pick one link for the submission |
| T-55 | `frontend/FRONT_TOBACK.md` | all | P1 | 0 % | After T-54 |

Briefs for earlier cards: `team/eng2/notes/flash-tasks.md`; board rows:
`team/eng2/notes/frontend-tasks.csv`; architecture:
`team/eng2/notes/frontend-architecture.md`; review checklist:
`team/eng2/notes/frontend-review.md`.

## 6. Requirements handed over
| ID | Dev | Evidence | Missing |
| --- | --- | --- | --- |
| REQ-01 | 70 % | Status phase cards (dec97ba) | T-53 |
| REQ-02 | 100 % on `main` | Report phase | Public link |
| REQ-12 | 75 % | History in Status: chart, table, comparison | T-54 |
| REQ-15 | 100 % on `main` | e2e keyboard + axe, every phase, phone and desktop | Public link |
| REQ-28 | 65 % | Outbox, sync client, status row | T-48 |
| REQ-30 | 70 % | All strings English | T-51 |
| REQ-32 | 50 % | 320 px, Pixel 7, first load 290 kB | T-50 |
| REQ-36 (proposed) | 50 % | Face behind `?face=1` (f0ff594) | REQ-14 exception, T-58, T-59 |

## 7. Decisions waiting for you (`docs/DECISIONS.md`)
- Use: `@playwright/test` 1.65.1 (Apache-2.0) and `@axe-core/playwright`
  4.14.0 (MPL-2.0), dev only, REQ-15 and REQ-32 (785bed5).
- Rejected: MUI 9.5.0 + Emotion 11.14, replaced by custom CSS (dec97ba); the
  three MUI rows in the d5e9850 body are void.
- REQ-14 exception for face sign-in (Use, with REQ-14's done-when naming it,
  or Rejected). Until then face stays behind `?face=1` and out of the video.
- `@vladmandic/face-api` 1.7.15 (MIT) and its models (f0ff594 body); Phys
  adds the `docs/sources.md` row.

## 8. Settings outside the code
- `VITE_API_BASE_URL` on Vercel: safe to set now (idempotent backend #24 is on
  `main`). Without it the app says "No server set up for this demo" and keeps
  entries in the browser.
- Railway: `STORAGE=supabase` with the Supabase variables (SQLite on Railway is
  lost on every deploy). Backend: https://hemoso-production.up.railway.app
  (`/health` 200 at 19:55).

## 9. Pitfalls already met
- A leftover `vite preview` on port 4399 makes `pnpm e2e` fail at start
  ("already used"); stop it and run again.
- Building inside `frontend/` while e2e runs from the same folder breaks the
  e2e run (shared `dist/`). Run checks one at a time, or on a copy.
- A stopped automated run kept writing files after it was told to stop.
  Before a commit, check no such process is still running.
- When two runs work at once, only one may edit `src/strings.ts` and each
  stylesheet, or one silently overwrites the other.
- `config/` sits outside `frontend/`: a deploy from `frontend/` alone builds
  with placeholders. With the git link keep "Include files outside the root
  directory" on.

## 10. Juli from now on
Backend, `docs/API.md`, `docs/openapi.json`: REQ-27 (prove storage in
production) and REQ-31 (demo video). For the video she needs the public link
serving `main`, recorded without `?team=1` or `?face=1`.
