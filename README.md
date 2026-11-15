# HeMoSo · team ReTardis · Space Apps 2026

HeMoSo is the product; ReTardis is the team
(https://www.spaceappschallenge.org/2026/find-a-team/tardis2/). NASA Space Apps
Challenge 2026 · Medellín · Challenge: *Create Health Monitoring
Software for Astronauts on Space Missions*.

What the challenge asks: `docs/CHALLENGE.md`.

## What HeMoSo is

_Draft, the team confirms the wording._

HeMoSo is a health monitoring application for astronauts on a mission, meant
for continuous use. Each astronaut records their health data and symptoms and
can consult their own history and trends at any time. The app compares each
reading with the person's earlier readings and with attention thresholds, and
tells them the next step in plain words. Its thresholds are set to astronaut
ranges, from a source or marked as Assumption.

How it presents health content, now and as it grows: a possible condition is a
probability with what it is based on, never a certainty, and the crew medical
officer or the flight surgeon confirms it. HeMoSo does not replace them.

**Works now**
- Home: the status of each indicator, from the latest reading and
  `config/rules/attention.csv`, and the next step for that level.
- Entry: one measurement, with the fields and checks of `FORMATS.md`.
- History: the latest reading against the median of the person's earlier ones,
  and every reading newest first.
- Storage in the browser (`localStorage`), plus an outbox that sends entries to
  the API when `VITE_API_BASE_URL` is set.
- Synthetic demo data from `config/data/demo_data.csv`, written on the first
  run, and loadable into the API with the seed command below.

**Planned** (decided in `docs/DECISIONS.md`, not in the app yet)
- Possible conditions as probabilities with their basis (`config/rules/conditions.csv`).
- A 3D body built by layers: body zones, muscles, bones, ligaments, organs.
- Face and eye analysis from the camera for fatigue, stress, mental state and sleep.
- The state against each person's baseline (median and spread of the last 14
  readings, `docs/findings/phys-02-baseline-state-rule.md`) exists in the API
  (`GET /people/{person_id}/indicators/{indicator_id}/state`, `docs/API.md`);
  the screens do not use it yet.
- Learning from each person's records.

Every value in the app, in the database and in the deployments is synthetic
(REQ-14). There are no real personal health data anywhere.

## Run it

Prerequisites, from `docs/STACK.md`:

| Tool | Version |
| --- | --- |
| Python | 3.13 |
| uv | 0.13 |
| Node | 24 LTS (22.12 minimum) |
| pnpm | 12, through `npx -y pnpm@12.20.0`; no global install needed |

### Backend (API)

From `backend/`:

```bash
uv sync --frozen                            # install from uv.lock
cp .env.example .env                        # empty values: SQLite store, repository config/
uv run --env-file .env python -m app.seed   # load config/data/demo_data.csv; prints added and skipped
uv run --env-file .env uvicorn app.main:app --port 8000
```

The API answers on http://127.0.0.1:8000; `GET /health` returns
`{"status":"ok"}`. Uvicorn does not read `.env` on its own, so pass
`--env-file .env`. Tests and lint: `uv run ruff check . && uv run pytest`.
The contract is in `docs/API.md`.

### Frontend (app)

From `frontend/`:

```bash
npx -y pnpm@12.20.0 install --frozen-lockfile
VITE_API_BASE_URL=http://127.0.0.1:8000 npx -y pnpm@12.20.0 run dev
npx -y pnpm@12.20.0 run build               # type-check and build to dist/
```

The dev server prints its address (http://localhost:5173). Without
`VITE_API_BASE_URL`, entries stay in the browser and the app works the same.

### How they connect

The app reads the API URL from `VITE_API_BASE_URL`, never a hard-coded host.
The API accepts the Vite dev server origin when `ALLOWED_ORIGINS` is unset or
empty: `backend/app/main.py` then allows http://localhost:5173. For any other
origin, list it in `ALLOWED_ORIGINS` in `backend/.env`, comma-separated. The app
reads `config/` from the repository root at build time, so both folders stay
where they are.

### Checks before a push

From the repository root (`AGENTS.md` rule 6); GitHub runs the same checks on
every push and pull request (`.github/workflows/checks.yml`).

```bash
python -m unittest discover -s scripts -p "test_*.py"   # team script tests
python scripts/check_content.py                         # config/ against FORMATS.md (--strict: every file required)
python scripts/si_use.py --check                        # SI-USE.md matches the SI log
python scripts/precheck.py                              # branch, paths, messages, secrets
```

## Project map

| Path | Holds |
| --- | --- |
| `backend/` | FastAPI API: health, entries, history per person and indicator; SQLite by default, Supabase by `STORAGE` |
| `frontend/` | Vite, React and TypeScript app, with the Home, Entry and History screens |
| `config/` | The health content and data the app reads: indicators, demo data, attention rules, conditions, per-indicator text (`FORMATS.md`) |
| `docs/` | Requirements, decisions, API contract, tools and versions, deploy, privacy, sources, NASA data, findings |
| `scripts/` | Team scripts: precheck, board, content and source checks |
| `submission/` | Pitch script, slides, video and the submission text |
| `team/` | One folder per person: role, status, log and notes |
| `.github/` | The checks that run on every push and pull request |

Key documents: `docs/API.md` (the API contract), `docs/DEPLOY.md` (public links
and the video), `docs/PRIVACY.md` (what is stored and where the keys live),
`FORMATS.md` (the files in `config/`), `SI-USE.md` (how SI tools helped).
Requirements: `docs/requirements.md`. Decisions: `docs/DECISIONS.md`.

## Live demo

- App: https://www.hemoso.space (synthetic data only; open in a private window, no login)
- API: https://hemoso-production.up.railway.app (`/health`, interactive docs at `/docs`)
- Face sign-in, off by default: https://www.hemoso.space/?face=1

---

## How we work

| Role | GitHub | Branch | Agent | Personal folder |
| --- | --- | --- | --- | --- |
| Bio 1 · Health content and pitch | @sofiaruizt | `bio1` | `bio1` | `team/bio1/` |
| Bio 2 · Rules, thresholds and submission | @pamirestrepo-code | `bio2` | `bio2` | `team/bio2/` |
| Phys · Data, NASA sources and measurement | @IsabellaCabreraquintero | `phys` | `phys` | `team/phys/` |
| Eng 1 · Integrator, frontend and requirements | Wambi (@Sadriica) | `eng1` (and merges into `main`) | `eng1` | `team/eng1/` |
| Eng 2 · Backend and demo | Juli (@julimejia) | `eng2` | `eng2` | `team/eng2/` |

Full rules: `AGENTS.md`. `config/` formats (from Saturday 10:00): `FORMATS.md`. Units, glossary,
findings and status messages: `STANDARDS.md`. Skills: `SKILLS.md`.
Saturday setup: `docs/SETUP.md`. Board: `docs/BOARD.md`.
Tools and versions: `docs/STACK.md`. Public links and video: `docs/DEPLOY.md`.
Decisions and rejected options: `docs/DECISIONS.md`.
Privacy: `docs/PRIVACY.md`. SI use: `SI-USE.md`.

### The usual way: ask your agent
- "save my progress" → checks the branch, proposes `git add` of your paths, commit and push.
- "pull main" → brings in the latest after a checkpoint.
- "@reviewer review my last change" → review without editing.
- "show my cards", "start #12", "send #12 to review" → the board (`kanban` skill).

### If the agent fails: five commands
```bash
git branch --show-current                 # 1. am I on my branch?
git status                                # 2. what did I change?
git add <my files>                        # 3. never "git add ."
git commit -m "type(area): what changed"  # 4. one sentence, in English
git push                                  # 5. upload
```
Pull `main`: `git fetch origin && git merge origin/main`.

### Checkpoints
Saturday 12:00 · Saturday 17:00 · Sunday 8:00 (feature freeze) · Sunday 13:00 (submission).
Internal freeze Sunday 13:30; official close Sunday 23:59 local.
15 minutes before: update `team/<person>/README.md`, commit, push and post
"ready". Eng 1 merges, tests and tags (`cp1`, `cp2`, `cp3`, `submission`).

### Never
`git push --force` · `git reset --hard` · `git rebase` · commit to `main` ·
commit `.env` or keys · touch someone else's files.
