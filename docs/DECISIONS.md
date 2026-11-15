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
measured on board. Blood sugar is measured with the i-STAT blood analyser from
a fingerstick sample, not continuously (Bio 2 found the source on Sat 19:30; it
was tier C until then). Ids in `FORMATS.md` section 2.

**Demo format:** video of 30 s or less, or 7 slides (the other one is plan B).

**Third-party code and assets we use:** name, licence, what for. Backend libraries and face-api also have their own rows below.

| Name | Licence | What for |
| --- | --- | --- |
| React 19.3.1, React DOM | MIT | The app's screens |
| @vladmandic/face-api 1.7.15 and its models | MIT | Face sign-in on the device (REQ-36) |
| three (version pinned in frontend/package.json) | MIT | The 3D body: rotate, see the systems, select where it hurts (REQ-15) |
| Barlow Condensed, Inter, JetBrains Mono (self-hosted woff2 in `frontend/public/fonts/`) | SIL OFL 1.1 | The display, body and mono typefaces of the interface (`frontend/DESIGN.md` section 4); no CDN (REQ-28) |
| Vite 8.3.8, TypeScript 6.0.3 | MIT, Apache-2.0 | Build and types (development only) |
| Vitest, Testing Library, jsdom | MIT | Frontend tests (development only) |
| Playwright, axe-core | Apache-2.0, MPL-2.0 | End-to-end and accessibility tests (development only) |
| ESLint, typescript-eslint | MIT | Lint (development only) |
| FastAPI, Pydantic, httpx, uvicorn | MIT, MIT, BSD-3-Clause, BSD-3-Clause | The API (rows below) |
| uv, Python 3.13 image | MIT or Apache-2.0, PSF | Backend install and container |
| Vercel, Railway, Supabase | Hosted services (free plans) | Frontend hosting, backend hosting, database |
| NASA and CSA pages in `docs/sources.md` | Public pages, credited | Sources for indicators, hazards and thresholds |

**Where AI tools helped:** reading and summarising sources, requirements and
planning, wording, and code. Not the base idea. Kept in `team/eng1/notes/si-use-log.md`.

**What we leave out on purpose:**

## Solution decisions (from Saturday 9:00)
| Decision | What | Why | Serves |
| --- | --- | --- | --- |
| Use | The app works with a network connection: React frontend on Vercel under the team's domain, Supabase for stored data, FastAPI backend (Wambi, Sat 14 12:45) | A public link with no login (REQ-32) and a history that survives a reload (REQ-27); the team already has the domain | REQ-27, REQ-32 |
| Use | Each indicator compared with the person's own baseline over a moving window of the last 14 readings (changed from 14 days on Sat 18:45: the store keeps mission day and time, and phys-02 and the API count readings); clinical or assumed limits from `rules/attention.csv`; possible conditions as probabilities with their basis | Team decision Sat 15:37, combining Phys's finding F-phys-01 with the team's probabilities decision | REQ-05, REQ-06, REQ-12, REQ-27 |
| Use | The 3D body is built by layers in this order: body zones, then muscles, then bones, then ligaments, then organs, until the full body | Team decision Sat 15:37: the full body stays the goal; each layer ships on its own | REQ-01, REQ-09 |
| Use | Indicators grouped by tier (A measured, B self-reported, C explained) and by body system, as columns of `data/indicators.csv` | From Phys's proposal (`team/phys/notes/indicators-proposal.md`) | REQ-03, REQ-07 |
| Use | `min_spread` column in `data/indicators.csv`: the smallest spread the baseline uses per indicator (Assumption values from F-phys-02); mood scale 1 = very low to 5 = very good, answered before sleep | Phys's format v2 proposal, accepted Sat 16:10; without a floor a flat history flags every small change | REQ-05, REQ-27 |
| Rejected | Separate `reference-bands.csv`, `baseline.csv` and `demo-astronaut.csv` | Limits already live in `rules/attention.csv` (Bio 2), the baseline is computed from history, and demo data is `data/demo_data.csv` | REQ-05, REQ-27, REQ-29 |
| Use | The FastAPI backend runs on Railway from `backend/Dockerfile`, deployed on every push to `main` that touches `backend/` or `config/`, health check `/health`, storage in Supabase (Sat 17:30) | Railway runs the existing Dockerfile with no cold start; Vercel keeps the frontend; Supabase keeps the history | REQ-27, REQ-32 |
| Use | Working with delayed or no contact with Earth: every entry is saved in the browser first and waits in an outbox; the app sends it one at a time when there is a network, and the API stores a re-sent entry once (200 the same, 201 new, 409 a different value for the same person, indicator, day and time) (Sat 17:35) | The crew keeps recording when the link is down; nothing is lost or counted twice when it comes back | REQ-13, REQ-28 |
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
| Rejected | @mui/material 9.5.0 with @emotion/react and @emotion/styled (used Sat 19:00 to 19:50) | Juli replaced it with the app's own CSS and a three-phase check (identify, report, status): first-load JavaScript went from 525 kB to 290 kB (163 to 88 kB gzip) | REQ-01, REQ-15 |
| Use | Blood pressure shows the worse of its two states (systolic or diastolic) for one reading | F-bio2-01: WHO and ACC/AHA both classify a mixed reading by the higher category | REQ-05 |
| Use | Possible conditions shown as an evidence score from 0 to 1 with a three-step label and its signals, never a percentage; each signal in `rules/conditions.csv` names its side (`indicator_id:above` or `:below`) | F-bio2-02: a percentage would need prevalence and signal rates we do not have for astronauts; the score keeps "as probabilities, never a certainty" without inventing calibration. Bio 2's proposal, accepted by Wambi Sat 19:40 | REQ-06 |
| Use | Blood glucose is tier A: i-STAT fingerstick on board, a value only when the crew takes a sample | Bio 2's review with the NTRS, FDA and Clinical Chemistry sources (`team/bio2/notes/indicators-review.md`); Phys updates `data/indicators.csv` | REQ-03 |
| Use | Roles swapped at Sat 19:40: Wambi (eng1) takes the frontend, Juli (eng2) takes the backend, `docs/API.md` and `docs/openapi.json`; Wambi stays integrator. Paths in `scripts/precheck.py` and the agent files, owners in the requirements and cards | Team decision (Wambi and Juli) | REQ-01, REQ-27 |
| Use | Visual direction: futuristic planetarium in a space mission, comfortable and simple; the app guides one step at a time and shows details on demand; palette inspired by space agency blues with a sparing signal red-orange, no agency brand colours, logos or insignia; own SVG icon per indicator coloured by body system; an animated instrument per card, a body silhouette lighting the system zone (first layer of the 3D body) and a planetarium status view with a plain list equivalent; short motion for state changes and a few cinematic moments, all off under reduced motion | Wambi, Sat 20:05; brief in `team/eng1/notes/frontend-visual-agent-prompt.md` | REQ-01, REQ-09, REQ-15 |
| Use | Visual direction round 3: the interface becomes a mission scene, not a form with a space theme; a wider shape grammar (main panel with a larger radius or cut corner, capsules for state and telemetry, orbits and arcs instead of extra boxes), a protagonist object and layered background depth built with our own CSS, Canvas and SVG, a short choreography per phase (horizon, orbits drawing, line-by-line headline, panel rising, hover and press depth) that is off under reduced motion, and a two-zone Identify with "Open the demo" as the primary action and username and PIN behind a disclosure; this replaces the earlier rule that the Starfield is the only ambient motion and keeps the palette, contrast, three-phase path and accessibility | Wambi's review, Sat 14 Nov 23:50; references studied, not copied (Aman Animates, Meng To and the Hairline idea, Emil Kowalski, 60fps.design, backgrounds.supply); no new dependency and no imported asset, so no licence row | REQ-01, REQ-09, REQ-15 |
| Use | Each content file has a status text for the baseline states (`### in_range`, `### outside_range`, optional `### no_data`, the names the API returns) and one per attention level of that indicator (the text for `needs_review`) | Bio 1 wrote texts per baseline state and Bio 2 defined attention levels; one file now holds both (Wambi, Sat 21:05) | REQ-26, REQ-05 |
| Use | Colour coding: one colour per status, always paired with an icon and the status in words, so colour is never the only signal (REQ-15) | Team decision (Wambi), Sat 18:45; the badge already pairs colour, icon and words | REQ-09, REQ-15 |
| Use | Dynamic charts over time: the History tab draws each indicator against the person's earlier values (`frontend/src/components/IndicatorChart.tsx`, merged in #67) | Team decision (Wambi), Sat 18:45; the chart is what REQ-12 compares against | REQ-09, REQ-12 |
| Use | Routine prompts: the app asks for the measurement that fits the moment of the mission routine (on waking, after exercise, before sleep), using the `context` values | Team decision (Wambi), Sat 18:45; it turns `context` into the crew's daily routine | REQ-09, REQ-02 |
| Use | Gamification without rankings: progress for keeping the routine (for example days in a row with a complete record), never a reward for a value or a comparison between crew members | Team decision (Wambi), Sat 18:45; rewarding the routine and not the result keeps the data honest | REQ-09 |
| Use | Mission environments: the crew member picks where the mission runs (station, spacecraft, lunar or Mars base) and the interface names and frames it | Team decision (Wambi), Sat 18:45 | REQ-09 |
| Use | Animations, kept short: transitions that show a change of state, all switched off under `prefers-reduced-motion` | Team decision (Wambi), Sat 18:45; they must not slow the 30 s demo | REQ-09, REQ-15 |
| Use | Camera input: face sign-in on the device (REQ-36) and, later, face and eye analysis; the form keeps working on a device without a camera | Team decision (Wambi), Sat 18:45 | REQ-09, REQ-36 |
| Use | First-load JavaScript budget of 600 kB raw, a target, not a CI check (was 300 kB in the visual brief) | Wambi, Sat 21:20: the visual layer and the state route left 0.8 kB of room, and restructuring the app to save under 1 kB risked the first screen; the face engine stays lazy and outside it; the team trims the bundle later if the demo needs it | REQ-15 |
| Use | Accounts: username and a 4 to 8 digit PIN checked on the server (salted scrypt hash in Supabase, signed session token, routes of a person with an account need it); the face stays on the device and unlocks the session stored there after one PIN sign-in; the synthetic demo astronaut stays open with one click | Team decision (Wambi), Sat 21:55: the same account must work on the PC and the phone, the face is the quick way in but cannot be checked by the server without sending biometric data, and the judges need a link with no login (REQ-32) | REQ-37, REQ-36, REQ-32 |
| Use | The 3D body is drawn with three.js from primitives (no model file, no asset licence), loaded on demand outside the first-load budget, with the 2D silhouette as the fallback without WebGL; the astronaut selects where it hurts and sets an intensity from 0 to 10, stored on the device only for now (`hemoso:pain:v1`) | Wambi, Sat 22:20: the 3D body is the core of the team's idea and only a 2D silhouette existed; the backend is paused, so pain reports stay local until it resumes; the region list lives in the frontend until the open question on `config/content/body_regions.csv` is answered | REQ-15 |
| Use | Each astronaut has their own mission start date; the mission day shown is counted from it, and nothing is shown before someone signs in. Kept on the device until the backend resumes; the demo astronaut's day comes from its synthetic data | Wambi, Sat 23:08: the day depends on the astronaut, not on the device | REQ-37, REQ-15 |
| Use | Picking a name in the list asks for that person's PIN; only the face opens a stored session without it. The demo astronaut opens with no PIN (REQ-32) | Wambi, Sat 23:08: the face is the quick way in; a name alone must not open someone's session on a shared device | REQ-37, REQ-36 |
| Use | Face sign-in is shown by default, first on the Identify screen, no longer only behind `?face=1`: with no face saved on the device it says how to add one, and after a PIN sign-in the app offers to add the face on this device. Consent still comes first, the models load only when the person chooses the face, and no face data leaves the device (REQ-36 exception unchanged) | Wambi, Sat 23:25: the face is the main way in (accounts decision, Sat 21:55), and nobody found it behind a URL flag | REQ-36, REQ-37 |
| Use | Reaction check, product changes over F-phys-06: a shorter run (90 s instead of 3 min), every completed trial is kept so a stopped run still saves what was answered, sound trials vary in pitch, loudness and length, and light trials show several colours where only green is a target (an answer to another colour counts as an error, not a reaction time) | Wambi, Sun 01:50: the 3-minute run was too long for the crew and the demo, and a varied stimulus keeps attention; this departs from the 3-minute PVT-B of F-phys-06, so Phys confirms or adjusts the indicator method and its wording | REQ-38, T-76 |
| Use | Self-host the three fonts the design system already names (Barlow Condensed, Inter, JetBrains Mono), SIL Open Font License, files in frontend/public with their licence | Wambi, Sun 01:50, from the visual review: the screens used system fallbacks and lost their character | REQ-15 |
| Use | The Report reads as a telemetry console: one panel per indicator with a channel number, a live figure drawn only from the value in the readout or the last reading (pulse trace, pressure bars, temperature ring, glucose level scale, sleep hour cells, mood steps), the value as a mono readout with its unit, the state of the last reading and a small history of the person's own earlier readings. Presentation only: validation, storage, sync and scoring are unchanged; the figures use drawing bounds, never clinical ranges, show no invented reading, are hidden from assistive technology next to their text equivalent, and stop under reduced motion and while the tab is hidden (`frontend/DESIGN.md` section 16) | Wambi, Sun 04:35: the Report looked like a medical form with a space theme; operating a physiological monitoring system is the idea of the product, and the judges score Presentation | REQ-01, REQ-02, REQ-09, REQ-15 |
| Use | Console accents and stage depth: two decoration-only tokens, an electric cyan and a violet, for the scene, the orbit arcs, the scope grid, the channel numbers, the focus glow and the scan line; a layered stage behind every phase (scientific grid, one slow orbit arc, a soft glow behind the active panel) that shifts by 12 px at most with the scroll; a phase change shown as a 400 ms channel switch, forward top to bottom and back bottom to top. No state, text or surface token changed and the contrast table only gained rows; everything is hidden from assistive technology, stops under reduced motion and while the tab is hidden, and uses CSS and one inline SVG with no new dependency (`frontend/DESIGN.md` 2.4, 6.3 and 7.3) | Wambi, Sun 05:25: the console needed its own accents and depth without touching the locked state colours, so the safe version adds tokens instead of changing them | REQ-01, REQ-09, REQ-15 |
| Use | Status: the body figure sits at the centre of the orbit system in place of the "You" node, and the indicator nodes circle it; the selected indicator lights its zone on the body; the separate Digital twin panel is removed. The 3D chunk stays lazy, a 2D silhouette holds the place while it loads and when WebGL or the chunk fails, and the body is hidden from assistive technology next to its text equivalent (`frontend/DESIGN.md` section 16) | Wambi, Sun 06:10: the Digital twin panel showed empty in production and the body belongs inside the orbit view, with the readings around it | REQ-09, REQ-15 |
| Use | Face sign-in tries the TensorFlow.js backends in order (WebGL, then WebAssembly, then CPU), each checked with one warm-up run, so a device whose GPU fails still signs in; the two WebAssembly files of the TensorFlow.js wasm backend (Apache-2.0, licence in `frontend/public/wasm/LICENSE`) are served from this site, no CDN and no new package. On iOS the video is muted, inline and played; a face check that cannot run says so and points to the username and PIN form, and the console logs only the error name and message. Face data still never leaves the device (REQ-36) | Wambi, Sun 08:05: face registration failed on other devices with a message that pointed to nothing on the screen | REQ-36, REQ-37 |
| Out of scope | The 7 slides (T-10) | The demo format is the 30 s video; slides are plan B, reopened only if the video is not published by 12:00 (Wambi, Sun 08:35) |
| Use | Reaction check (REQ-38): a short test in the app where the astronaut answers a light or a sound as fast as possible; it gives the median reaction time and the lapses, stored as two indicators and compared with the person's own baseline like any other | Team decision (Wambi with Bio 2), Sat 22:41, from the mentor's notes (reflexes, sound); NASA tracks astronauts' vigilance with a 3-minute psychomotor vigilance test (PVT-B), sensitive to sleep loss; Phys confirms the method and sources | REQ-38, REQ-12 |
| Use | Current psychological state (REQ-38): one neuro-behavioural condition in `rules/conditions.csv` that joins the reaction signals with mood and sleep through the existing evidence score. It describes how the person is today, against their own usual values; it never labels, classifies or diagnoses the person, never names a disorder, and the CMO or flight surgeon confirms | Team decision (Wambi with Bio 2), Sat 22:41: Bio 2's profile idea; "their current state, never pigeonholing them" | REQ-38, REQ-06 |
| Rejected (for now) | Camera reading at entry, erratic-movement and tic analysis, voice analysis, low-frequency sound test, crew rating each other | Mentor's notes, Sat 16:12; not enough time before the Sun 08:00 feature freeze with the reaction check chosen first; the camera reading may follow after the freeze if time allows | REQ-09 |
| Use | Baseline window (W-1): the last 14 mission days that hold a reading, one value per day (the mean of that day's readings in the context); median and spread over those daily values, 3 days minimum. Replaces "the last 14 readings" of Sat 18:45 | Wambi, Sun 05:54, from Juli's proposal (branch `eng2-window-daily-average`): a busy day can no longer push a quiet week out of the baseline. Phys updates phys-02 and its vectors; the backend (`state.py`) and the frontend (`domain/state.ts`) change together so both compute the same state; if it is not green by 12:00 it stays out of the submission | REQ-27, REQ-03 |
| Use | Symptoms (T-78 to T-80): `symptoms.csv`, `symptom_log.csv` and an optional fifth column `symptoms` in `rules/conditions.csv`; a reported symptom adds evidence to a condition like a signal, and rows with four columns stay valid | Wambi, Sun 05:54, from Bio 2's proposal (Sat 23:41): hyper- and hypoglycaemia need symptoms to reach two signals. Bio 2 writes the format, Phys the two files, Eng 1 the checker and the report checkboxes, Juli the score; if it is not green by 12:00 the fallback is the text in `glucose_mgdl.md` | REQ-06 |
| Use | Pain reports and an account's mission start travel through the API when the deployed server has the routes: an outbox sends one report per region, signing in merges the server's reports into the device store under the key the route keeps one report per (person, region, mission day, time), and the account's mission start wins over the device copy, which stays as the fallback. A 404 or 405 from a route the server does not have yet keeps the device-only behaviour, and the demo astronaut makes no request | Wambi, Sun 05:52: PR #143 is not merged, so the frontend has to work before and after the API has the routes; the same person must find their reports and their Flight Day on any device (REQ-37) | REQ-37, REQ-13 |
