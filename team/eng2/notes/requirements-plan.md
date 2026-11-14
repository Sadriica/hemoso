# Eng 2 · assigned requirements and work plan

Requirements assigned to @julimejia on the board, checked Sat 14 at 11:20,
and the frontend work that serves each one. Wambi moves requirement cards;
this file only tracks the frontend side.

## Assigned requirements
| Card | Ref | Requirement | Priority | Block | Shared with | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| #20 | REQ-09 | Optional considerations chosen or left out on purpose | P1 | B1 | Eng 1 | Each optional consideration has a row in `docs/DECISIONS.md`: use or leave out, and why |
| #11 | REQ-01 | A visual tool astronauts use to assess their own health and act on its status | P0 | B2 | Bio 1 | The astronaut sees the status of each indicator they track and what to do next, on one screen |
| #13 | REQ-02 | Indicators entered by keyboard and clicks; camera optional | P0 | B2 | — | Every chosen indicator can be entered without special hardware; units shown at entry |
| #23 | REQ-12 | Indicators over time against the person's own earlier values | P1 | B3 | Eng 1 | Each indicator has a history view; the comparison uses that astronaut's own earlier values |
| #24 | REQ-13 | Works with delayed or no contact with Earth | P1 | B3 | Eng 1 | The app and its data work with no network; anything for the ground waits and is sent later |
| #26 | REQ-15 | Readable and usable without colour alone or a mouse | P1 | B3 | — | Every state has text or an icon besides colour; the demo path works by keyboard |
| #27 | REQ-16 | Everything submitted is in English | P0 | B4 | Bio 2 | Page, app, slides and linked materials in English |
| #28 | REQ-17 | Demo video of 30 s or less with English subtitles, or 7 slides at most | P0 | B4 | Bio 1 | Length checked; hosted outside Space Apps; the link opens with no login |
| #29 | REQ-18 | Public link to the final project | P0 | B4 | Eng 1 | Repository and running app open in a private window with no login |
| #33 | REQ-22 | No images, video, audio or likeness of people under 18 | P0 | B4 | Bio 1 | Every image and clip checked before upload |

#12 is a duplicate of #11 (REQ-01); Wambi knows.

## Work list
| # | Work | Serves | Status |
| --- | --- | --- | --- |
| 1 | Frontend skeleton: Vite, React, TypeScript, pnpm lockfile, `base: './'`, Vitest | T-03, all | In progress |
| 2 | Local data store in the browser, no network needed | REQ-13 | Todo |
| 3 | Status badge: colour, icon and text together; visible keyboard focus | REQ-15, REQ-01 | Todo |
| 4 | Entry form by keyboard and clicks, units shown (mock indicators until `FORMATS.md`) | REQ-02 | Todo |
| 5 | One-screen overview: state of each indicator and what to do next | REQ-01 | Todo |
| 6 | History view against the astronaut's own earlier values | REQ-12 | Todo |
| 7 | "Synthetic data" notice and visible sources | REQ-14, REQ-10 | Todo |
| 8 | Playwright demo path, accessibility check, screenshots at 1280 × 800 | REQ-15, REQ-17 | Todo |
| 9 | Read the real `config/` files once `FORMATS.md` is agreed | REQ-02 | Waiting on T-06 |
| 10 | Deploy pipeline (see below) | REQ-18, T-13 | To do, Eng 1 |
| 11 | Vercel pipeline: tests gate every deploy (see below) | REQ-18, T-13 | Vercel project `hemoso` live (CLI deploy); git link waits for Eng 1 |

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
- `FORMATS.md` is still empty (T-06). The real indicators, units and states come from it.
- `git push` fails with "Password authentication is not supported"; GitHub
  login on this machine is pending.
