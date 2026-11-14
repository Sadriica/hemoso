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

**Indicators we chose, and why:**

**Demo format:** video of 30 s or less, or 7 slides (the other one is plan B).

**Third-party code and assets we plan to use:** name, licence, what for.

**Where AI tools helped:** reading and summarising sources, requirements and
planning, wording, and code. Not the base idea. Kept in `team/eng1/notes/si-use-log.md`.

**What we leave out on purpose:**

## Solution decisions (from Saturday 9:00)
| Decision | What | Why | Serves |
| --- | --- | --- | --- |
| Use | The app works with a network connection: React frontend on Vercel under the team's domain, Supabase for stored data, FastAPI backend (Wambi, Sat 14 12:45) | A public link with no login (REQ-32) and a history that survives a reload (REQ-27); the team already has the domain | REQ-27, REQ-32 |
| Open | Where the FastAPI backend runs; Railway is the candidate | Vercel serves the frontend; the backend needs its own host | REQ-27 |
| Open | REQ-13 and REQ-28 (working with delayed or no contact with Earth) now that the app needs a network: entries kept in the browser and sent later, or left out on purpose | `docs/STACK.md` rule 5 asked for offline-friendly; the network decision changes it | REQ-13, REQ-28 |
| Use | Only synthetic data in Supabase and in every public deployment | The deployed app and its database are public infrastructure; no real personal data anywhere | REQ-14, REQ-29 |
| Use | fastapi 0.162.7, MIT | The web framework for the entries and history routes | REQ-27 |
| Use | pydantic 2.14.3, MIT | The `Entry` model and its validation | REQ-27 |
| Use | httpx 0.28.1, BSD-3-Clause | The HTTP client the Supabase storage talks through | REQ-27 |
| Use | uvicorn 0.54.0, BSD-3-Clause | The server that runs the FastAPI app | REQ-27 |
| Use | pytest 9.2.0, MIT | The backend tests | REQ-27 |
| Use | ruff 0.17.5, MIT | The backend lint | REQ-27 |
| Open | Licence rows for each client library added (Supabase clients and others) | `docs/STACK.md` rule 2: every library gets a row with its licence when it is added | |
