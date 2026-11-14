# Decision record

Every decision the team takes, with the reason, including what was rejected.
Before proposing a tool or approach, look here; after deciding, add a row.
Decisions: **Use** · **Plan B** · **Rejected** · **Out of scope** · **Open**.

## Team plan and tooling (decided before the event)
| Decision | What | Why |
| --- | --- | --- |
| Use | Only rules-compliant preparation in this repository before Saturday 9:00 | Space Apps: teams may study the challenges and prepare, but not start working on them before the event |
| Use | One branch and one folder per person | Work never collides; each agent knows its paths |
| Use | Merges into `main` through one pull request per branch at each checkpoint | Links and closes the cards; Eng 1 tests before merging |
| Use | GitHub's built-in Status field on the board | GitHub's automations (closed → Done) work on it |
| Rejected | A custom "Stage" status field | GitHub's automations ignore it; it duplicated Status |
| Use | Board views built from a browser prompt (Eng 1) | GitHub has no API to create views |
| Use | Team scripts in Python | Same behaviour on Linux, macOS and Windows |
| Rejected | Team scripts in shell (except `setup.sh`) | Windows users would need Git Bash for everything |
| Use | Lockfiles and frozen installs | Ranges in manifests do not pin versions |
| Use | Anything added must serve a requirement or a task | Keeps the weekend on the judged work |
| Use | No external AI services inside the solution | Team rule; also keeps it working offline |
| Use | Internal freeze Sunday 13:30; official close Sunday 23:59 local | Margin before the mentors at 14:00; the official close is the hard limit |
| Rejected | A general "no NASA logos" rule | Not in the guides as such. What applies: AI-generated content may not use or modify NASA branding, and the Space Apps brand guide for its marks |
| Use | Team name ReTardis, product name HeMoSo | ReTardis is the team registered on the Space Apps page; the submission uses it |
| Use | Five people: Bio 1 (content and pitch), Bio 2 (rules, thresholds and submission), Phys (data, NASA sources, measurement), Eng 1 (backend, merges, requirements), Eng 2 (frontend and demo) | The team changed from six to five on Saturday morning; Bio 3 and Bio 4 duties were redistributed |
| Use | Initial commit without requirements; Eng 1 writes them after checking the official page (T-05) | The first commit holds only the plan and tooling |
| Use | A separate development repository (hemoso-dev) for board, script, deploy and heavy tests only | Product work stays in this repository so its history shows who did what and when |
| Use | git credentials through `gh auth setup-git` | HTTPS push with a password is refused by GitHub; this reuses the gh login |
| Use | Possible conditions shown as probabilities, never as a certainty; the CMO or flight surgeon confirms | Team decision in T-06; replaces the earlier "never diagnose" rule |
| Use | Face and eye analysis for signs of fatigue, stress, mental state and sleep | Team decision in T-06; runs on the device, no external AI services |
| Use | Learning from each person's own records; thresholds set to astronaut ranges, researched or derived, each sourced or marked Assumption | Team decision in T-06 |
| Rejected | Reusing material written before the event | The team builds from its base idea during the event; nothing written earlier is copied in |
| Use | Challenge resources read two levels deep, plus four evidence reports and NASA-STD-3001 Vol 1 Rev C (`team/eng1/notes/challenge-resources.md`) | Question 4 (when a result needs attention) has almost no in-flight thresholds in NASA sources; it must be sourced elsewhere or marked Assumption |

## Solution (T-06) · DRAFT until the team fills every line below

**What HeMoSo is** (the team's words, Sat 14 Nov 12:07):

HeMoSo is a health monitoring application for astronauts on a mission, meant
for continuous use. Each astronaut records their health data and symptoms and can
consult their own history and trends at any time. From those records, the app
suggests what the astronaut may have, as probabilities and never as a certainty,
and recommends actions based on the symptoms. A 3D body lets the astronaut select
where it hurts and shows them, graphically, where the discomfort may be. The camera
looks at the face and eyes for signs of fatigue, stress, mental state and sleep.
The app learns from each person's own records, while its thresholds are set to
astronaut ranges, researched or derived from other sources. HeMoSo builds on
open-source code from existing projects: face recognition, anatomy, and earlier
work in health and gym apps that already model how the body works and how its
parts act together. What sets it apart is the amount of information it gathers,
its forecasting and symptom-recognition models, thresholds specific to
spaceflight, learning that is biased to the fact that the user is an astronaut,
and a core of face and eye analysis.

**Where the idea came from:** the team's base idea, from Wambi: a health monitoring
tool for astronauts for this challenge that reuses open-source code from existing
repositories and apps (face recognition, anatomy, health and gym apps) where their
licences allow it, and shows the body in 3D, including muscles, ligaments and bones.

**Indicators we chose, and why** (Sat 14 Nov 15:37): the six the challenge
statement names: heart rate, blood pressure (systolic and diastolic), body
temperature, sleep hours, mood and blood sugar. Each has a source for how it is
measured on board, except blood sugar, which no in-flight source covers: it is
explained (tier C), never an input. Ids in `FORMATS.md` section 2.

**Demo format:** video of 30 s or less, or 7 slides (the other one is plan B).

**Third-party code and assets we plan to use:** name, licence, what for.

**Where AI tools helped:** reading and summarising sources, requirements and
planning, wording, and code. Not the base idea. Kept in `team/eng1/notes/si-use-log.md`.

**What we leave out on purpose:**

## Solution decisions (from Saturday 9:00)
| Decision | What | Why | Serves |
| --- | --- | --- | --- |
| Use | The app works with a network connection: React frontend on Vercel under the team's domain, Supabase for stored data, FastAPI backend (Wambi, Sat 14 12:45) | A public link with no login (REQ-32) and a history that survives a reload (REQ-27); the team already has the domain | REQ-27, REQ-32 |
| Use | Each indicator compared with the person's own baseline over a rolling 14-day window; clinical or assumed limits from `rules/attention.csv`; possible conditions as probabilities with their basis | Team decision Sat 15:37, combining Phys's finding F-phys-01 with the team's probabilities decision | REQ-05, REQ-06, REQ-12, REQ-27 |
| Use | The 3D body is built by layers in this order: body zones, then muscles, then bones, then ligaments, then organs, until the full body | Team decision Sat 15:37: the full body stays the goal; each layer ships on its own | REQ-01, REQ-09 |
| Use | Indicators grouped by tier (A measured, B self-reported, C explained) and by body system, as columns of `data/indicators.csv` | From Phys's proposal (`team/phys/notes/indicators-proposal.md`) | REQ-03, REQ-07 |
| Use | `min_spread` column in `data/indicators.csv`: the smallest spread the baseline uses per indicator (Assumption values from F-phys-02); mood scale 1 = very low to 5 = very good, answered before sleep | Phys's format v2 proposal, accepted Sat 16:10; without a floor a flat history flags every small change | REQ-05, REQ-27 |
| Rejected | Separate `reference-bands.csv`, `baseline.csv` and `demo-astronaut.csv` | Limits already live in `rules/attention.csv` (Bio 2), the baseline is computed from history, and demo data is `data/demo_data.csv` | REQ-05, REQ-27, REQ-29 |
| Open | Where the FastAPI backend runs; Railway is the candidate | Vercel serves the frontend; the backend needs its own host | REQ-27 |
| Open | REQ-13 and REQ-28 (working with delayed or no contact with Earth) now that the app needs a network: entries kept in the browser and sent later, or left out on purpose | `docs/STACK.md` rule 5 asked for offline-friendly; the network decision changes it | REQ-13, REQ-28 |
| Use | Only synthetic data in Supabase and in every public deployment | The deployed app and its database are public infrastructure; no real personal data anywhere | REQ-14, REQ-29 |
| Use | fastapi 0.162.7, MIT | The web framework for the entries and history routes | REQ-27 |
| Use | pydantic 2.14.3, MIT | The `Entry` model and its validation | REQ-27 |
| Use | httpx 0.28.1, BSD-3-Clause | The HTTP client the Supabase storage talks through | REQ-27 |
| Use | uvicorn 0.54.0, BSD-3-Clause | The server that runs the FastAPI app | REQ-27 |
| Use | pytest 9.2.0, MIT | The backend tests | REQ-27 |
| Use | ruff 0.17.5, MIT | The backend lint | REQ-27 |
| Use | No Supabase client library: the backend calls the Supabase REST API with httpx | One dependency less; its licence row is httpx's | REQ-27 |
| Use | Face sign-in on the device (REQ-36), off unless the URL has `?face=1`: consent first, the descriptor stays in the person's own browser, never sent to the backend; exception to REQ-14 limited to that | Juli's proposal (team/eng2/notes/face-login-proposal.md), accepted by Wambi Sat 18:25; first step toward the team's face and eye analysis | REQ-36, REQ-14 |
| Use | @vladmandic/face-api 1.7.15, MIT, with its tiny detector, tiny 68-point landmark and recognition models copied to `frontend/public/models/` with the licence | Runs in the browser with no external service and no CDN; loaded only when the face panel opens | REQ-36 |
| Open | Colour coding: the statement offers it as a consideration (`docs/CHALLENGE.md`). Today `frontend/src/styles.css` sets one text and one background colour for each status: in your usual range, needs review, no data (lines 34–39, and their light-theme values at 100–105); `frontend/src/components/AttentionBadge.tsx` pairs the colour with an icon and the status in words, and the History table uses the words only (`frontend/src/components/attentionText.ts`) | Optional in the statement; whether the palette stays at these three statuses or adds one colour per body system is not recorded: the team answers in T-06 | REQ-09 |
| Open | Dynamic charts: the statement offers "dynamic charts over time" (`docs/CHALLENGE.md`). Today the History tab shows one comparison sentence and a table of the readings, with no chart (`frontend/src/screens/History.tsx`); card T-46 in `team/eng2/notes/frontend-tasks.csv` draws the chart and is not done; `frontend/package.json` has no chart library | Optional in the statement; the chart changes what the History tab shows (REQ-12), so the team answers in T-06 | REQ-09 |
| Open | Routine prompts: the statement offers "measurements or actions prompted as part of the mission routine" (`docs/CHALLENGE.md`). Today the astronaut opens the Entry tab and saves; the only automatic action is sending the outbox on load, on the browser's `online` event and from the "Send now" button (`frontend/src/hooks/useSync.ts`); nothing in `frontend/src` schedules, reminds or notifies | Optional in the statement; a prompt needs a crew routine and a schedule the team has not written: the team answers in T-06 | REQ-09 |
| Open | Gamification: the statement offers it, sets no limits, and "without rankings" would be the team's own choice (`docs/CHALLENGE.md`). Today the interface has one badge per indicator carrying the status in words (`frontend/src/components/AttentionBadge.tsx`); `frontend/src` holds no points, streak, level or reward code | Optional in the statement; a reward for recording would work against the data being honest, and the team has not weighed it: the team answers in T-06 | REQ-09 |
| Open | Mission environments: the statement offers spacecraft, station, rover, base on a planet or moon (`docs/CHALLENGE.md`). Today the interface is one page with three tabs, Home, Entry and History (`frontend/src/App.tsx`); nothing in `frontend/src` names, selects or draws an environment | Optional in the statement; an environment changes the wording and the art of every screen, so the team answers in T-06 | REQ-09 |
| Open | Animations: the statement offers "animations and interactivity" (`docs/CHALLENGE.md`). Today `frontend/src/styles.css` animates only the hover and focus colour of buttons and the disclosure toggle (lines 225, 726) and the quarter turn of the disclosure chevron (line 736), the two disclosure ones switched off under `prefers-reduced-motion` (lines 803–806) | Optional in the statement and competing with the demo's 30 s or 7 slides: the team answers in T-06 | REQ-09 |
| Open | Camera input: the statement gives keyboard, mouse clicks and camera images as examples of input (`docs/CHALLENGE.md`), and this file already records "Use: Face and eye analysis for signs of fatigue, stress, mental state and sleep" from T-06 (table above). Today entry is a form of select, radios, number and time inputs (`frontend/src/screens/Entry.tsx`), and no code in `frontend/src` calls the camera | The face and eye row is decided; how far the camera goes for data entry, and what happens on a device without one, is not recorded: the team answers in T-06 | REQ-09 |
