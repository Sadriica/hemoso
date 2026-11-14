# Eng 2 · assigned requirements and work plan

Requirements and tasks assigned to @julimejia on the board, checked Sat 14 at
14:30 after Eng 1 split every shared requirement to one owner
(`docs/requirements.md` on `eng1`, commit ae3761f). Wambi moves requirement
cards; this file only tracks the frontend side.

## Assigned requirements
| Card | Ref | Requirement | Priority | Block | Done when | Depends on |
| --- | --- | --- | --- | --- | --- | --- |
| #11 | REQ-01 | A visual tool astronauts use to assess their own health and act on its status: the screens | P0 | B2 Sat 13:30-17 | On one screen the astronaut sees the status of each indicator they track and a clear next step; content comes from `config/` (REQ-26) | T-06 |
| #13 | REQ-02 | Gather health indicators from user input: keyboard and clicks; camera or images optional | P0 | B2 Sat 13:30-17 | Every chosen indicator can be entered without special hardware; units shown at entry | T-06 |
| #23 | REQ-12 | History view: each indicator against the person's own earlier values | P1 | B3 Sat 17-1 | Each indicator has a history view comparing with that astronaut's own earlier values, reading the stored history (REQ-27) | REQ-27 |
| #26 | REQ-15 | Readable and usable without colour alone or a mouse | P1 | B3 Sat 17-1 | Every state has text or an icon besides colour; the demo path works by keyboard | REQ-01 |
| #44 | REQ-28 | Interface works offline and shows what is waiting to be sent | P1 | B3 Sat 17-1 | The app opens and works with the network off after the first load; pending items and the last sync time are visible | REQ-13 |
| #46 | REQ-30 | The app interface is in English | P0 | B4 Sun 9-12 | Every screen, label and message of the app in English | REQ-01 |
| #47 | REQ-31 | Demo video recorded with English subtitles and a public link | P0 | B4 Sun 9-12 | Video of 30 s or less recorded from the app, English subtitles burned in, hosted outside Space Apps, link opens with no password, permission or registration | REQ-17 |
| #48 | REQ-32 | Running app published at a public link | P0 | B4 Sun 9-12 | The app opens at a public link in a private window with no login, on desktop and phone | T-13 |

No longer mine after the split: REQ-09, REQ-13, REQ-16, REQ-17, REQ-18 and
REQ-22 (each now has one owner in `docs/requirements.md`). #12, the duplicate
REQ-01, is closed.

## Assigned tasks
| Card | Ref | Task | Priority | Block | Done when | Status |
| --- | --- | --- | --- | --- | --- | --- |
| #3 | T-03 | Clone, `setup.sh`, open the agent | P0 | B0 | Every branch exists and every agent answers | Done on my side: `eng2` pushed |
| #6 | T-06 | Choose the solution and write `FORMATS.md` (whole team) | P0 | B1 | `FORMATS.md` agreed by everyone; architecture in `docs/DECISIONS.md` | Draft by Eng 1 on `eng1` (12:31); open questions remain |
| #39 | T-13 | Public demo online and checked anonymously | P0 | B4 | Links open in a private window without login | https://hemoso.vercel.app live from `eng2` |
| #52 | T-16 | Record the demo video, add English subtitles and publish it | P0 | B4 | Video of 30 s or less with burned-in English subtitles at a public link | Todo, after the demo path exists |

## Requirements I depend on (other owners)
| Ref | What the frontend needs from it |
| --- | --- |
| REQ-26 | Content read from `config/`: the files and headings of `FORMATS.md` |
| REQ-27 | Stored history (Supabase, per `docs/DECISIONS.md`): the history view reads it |
| REQ-29 | Synthetic demo data: `config/data/demo_data.csv` |
| REQ-13 | Working with delayed or no contact with Earth: still "Open" in `docs/DECISIONS.md` now that the app uses a network; REQ-28 follows its answer |

## Work list
| # | Work | Serves | Status |
| --- | --- | --- | --- |
| 1 | Frontend skeleton: Vite, React, TypeScript, pnpm lockfile, Vitest | T-03, all | Done (db00106) |
| 2 | API client with mock mode, status badge (colour + icon + text), app shell | REQ-01, REQ-15, REQ-30 | Block A, iteration 3 of 4 |
| 3 | One screen: status of each indicator and its next step, read from `config/` content | REQ-01 | Todo, needs the attention levels from Bio 2 |
| 4 | Entry form by keyboard and clicks, unit shown, from `config/data/indicators.csv` | REQ-02 | Todo, needs the indicator list from Phys |
| 5 | History view against the person's own earlier values | REQ-12 | Todo, needs REQ-27 |
| 6 | Offline after first load: cached app, pending entries and last sync time visible | REQ-28 | Todo, waits on the REQ-13 decision |
| 7 | Keyboard-only demo path and non-colour states, checked with axe | REQ-15 | Todo |
| 8 | Every label and message in English; one strings file | REQ-30 | In place since block A |
| 9 | Playwright demo path, screenshots at 1280 × 800, video with burned-in subtitles | REQ-31, T-16 | Todo |
| 10 | Public link checked in a private window on desktop and phone | REQ-32, T-13 | Desktop done; phone to check |
| 11 | Vercel pipeline: tests gate every deploy (see below) | REQ-32, T-13 | Project `hemoso` live (CLI deploy); git link waits for Eng 1 |

## Vercel pipeline
Status Sat 14 11:58: project `julian-mejias-projects/hemoso`, Node 24.x,
Vercel Authentication off (public, REQ-18). First deploy from branch `eng2`
(db00106) made with the CLI from `frontend/`; install, lint, test (1/1) and
build passed on Vercel.
- Production: https://hemoso.vercel.app
- Deployment: https://hemoso-bge3qfuq4-julian-mejias-projects.vercel.app
- Not linked to GitHub yet: the Vercel GitHub app is not installed on
  `Sadriica/hemoso`. Eng 1 approves it; then Root Directory `frontend`,
  production branch `main`, and pushes deploy on their own.

`frontend/vercel.json` makes Vercel run, on every push it builds:
`pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test` → `pnpm build`.
If lint or a test fails, the build fails and nothing is deployed; the last
good deploy stays online. `main` deploys to production (the public link);
other branches get preview links.

Connect once, in the Vercel dashboard:
1. Add New → Project → import `Sadriica/hemoso`. The repository belongs to
   Eng 1, so he approves the Vercel GitHub app for it.
2. Root Directory: `frontend`. Framework: Vite (read from `vercel.json`).
3. Settings → Build and Deployment → Node.js version: 24.x.
4. Production branch: `main`.
5. Open the production link in a private window: no login (REQ-18).

Manual deploy without the git link (Vercel CLI 65, from `frontend/`):
`pnpm lint && pnpm test && npx vercel@65.16.0 --prod`.

Decision for Eng 1 to record in `docs/DECISIONS.md`: Vercel for the public
demo (the plan named GitHub Pages; both serve static files only).

## To do: deploy pipeline (Eng 1 owns `.github/`)
Nothing in `.github/` is changed from this branch. What the frontend needs from
the pipeline, for Eng 1 to set up:
- Copy `docs/deploy/pages.yml` to `.github/workflows/pages.yml`, then
  Settings → Pages → Source: GitHub Actions.
- Add a test step before the build: `pnpm test` (Vitest) so a failing test
  stops the deploy.
- Optional second workflow on pull requests to `main`: install, test and
  build only, no deploy, so the checkpoint merge is checked before it lands.
- Frontend side, already handled here: `base: './'` in Vite, no path routes,
  no assets from a CDN, `pnpm-lock.yaml` committed.
- Check the public link in a private window before the internal freeze.

## Open
- `FORMATS.md` draft (Eng 1, `eng1`, 12:31) has the file shapes but no
  indicators, attention levels, body regions or conditions yet. Screens 3 to 5
  wait on Phys (indicators) and Bio 2 (attention levels).
- `docs/DECISIONS.md` (Eng 1, 12:45) moved to a networked app: React on Vercel,
  Supabase for stored data, FastAPI backend (host still open). The frontend
  client already has a mock mode and an HTTP mode; the Supabase or API
  contract is needed from Eng 1 before the HTTP mode is wired.
- `team/eng2/notes/formats-proposal.md` and the "MVP" parts of
  `team/eng2/notes/frontend-architecture.md` were written from the MVP
  baseline document of 12 Nov; where they differ from the `FORMATS.md` draft,
  the draft wins.
- GitHub login works (Git Credential Manager); `eng2` pushes.
