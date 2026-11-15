# Changelog

Written by Eng 1 at every merge into `main`. Newest entry first.

## submission-update · Sunday 14:50 (tag `submission-update`, merges #211)
- eng1: a clearly labelled link to the source code on GitHub in the top bar
  and a footer line on every phase (#211).

## submission · Sunday 14:15 (tag `submission`, merges #207, #208, #209)
- eng1: the review polish (#207): Assumption rows never raise a review in the
  app, as in the API; baseline texts count days; the Report grid on desktop;
  link preview tags; README and docs say what the app does.
- Owners' texts, done by Eng 1 at Wambi's request (#208): the submission page
  and the script match the app (twelve indicators, symptoms ship, evidence
  score, no unsourced delay), the fever condition cites NIH MedlinePlus and
  WHO, docs/sources.md has the WHO row and no broken characters, FORMATS says a
  symptom counts on the newest mission day with a report, DECISIONS records
  that rule, the "watch" label and the API rate limit of 600 a minute.
- bio2 (#209): the seven slides, the stack and the platform field map.
- The demo video: https://youtu.be/MsjzAZ2Txwc (0:29), on the submission page,
  the README and docs/DEPLOY.md.

## Final polish · Sunday 13:45 (merges the review branches)
- eng1: the app no longer raises "needs review" for a crossed Assumption row
  when a baseline exists, as the API and F-phys-02 say; the baseline texts
  count days with a reading; a lone half-width Report row spans its line on
  desktop; the page has a description, link preview tags and a no-script line;
  README and docs say what the app does (face sign-in on the Identify screen,
  the offline limit, the SQLite path, deploy).

## Pre-submission · Sunday 12:40 (merges #158 to #206 and #186)
- eng1: the README as a product page with screenshots and the award story on
  the submission page (#186); urgent symptoms lead the evidence board and
  low-priority cards fold on phones; the Flight Day follows the synced
  mission start in Report and in a saved reaction run, with a second-browser
  e2e; a send count while readings go out; a larger desktop orbit where a tap
  on the body opens the pain picker; the top bar without overlap and an
  app-styled mission start field (#205); the reaction check stays the 90 s
  simple test of F-phys-06 (#206, a 50 s colour version was reverted).
- eng1, #159 to #201: visual rounds on Report, Status, History and Identify;
  face sign-in on more devices with a scan, success and failure animation;
  readings sent as soon as they are saved; keyboard and screen-reader fixes on
  the judges' path; frontend parity with the API (daily window, on-threshold
  rows); symptoms in Report and in the device score; the intro title under the
  orbits and idle performance fixes.
- eng2: pain report kind and mission start in the API (#171), a value on a
  threshold triggers it (#173), the window checked against the shared vectors
  (#181), the video stills and draft v4 (#177, #180, #203).
- phys: symptoms, source index and the PVT-B correction (#162), NASA resource
  label, body mass on both sides (#187), the NIH fever definition (#198),
  flight instruments checked row by row and the eye closure check written as
  EAR, not PERCLOS (#204).
- bio1: reaction and nutrition texts (#163, #169), the video shot table and
  nutrition floors (#202).
- bio2: every conditions row has its symptoms cell (#176), the body mass floor
  at 45 kg (#190), the fever line cites NIH MedlinePlus and WHO (#192, #199).
- Left out: the on-device eye check (#195, #197 closed; the branches stay).

## cp3 · Sunday 07:27 (tag `cp3`, merges #155 phys, #156 bio2, #151 eng2, #157 eng1)
- phys: indicators with tier and system, glucose at tier A with the i-STAT,
  `docs/nasa_data.md` and five findings; the baseline window as the daily mean
  over the last 14 mission days with seven window test vectors (W-1,
  F-phys-02); the reaction indicators as a 90-second test adapted from the
  3-minute PVT-B, a lapse at 355 ms or more (T-76, F-phys-06); the ten glucose
  symptoms and a synthetic symptom log (T-78); appetite, fluid intake and body
  mass with checked sources and demo rows (T-77).
- bio2: 12 attention thresholds with their side, conditions with signal sides
  and the current state condition (T-73), the evidence score (F-bio2-02), the
  blood pressure rule (F-bio2-01), a review of the content files, the symptoms
  layer in `FORMATS.md` with test vectors, and the submission page draft with
  its checklist.
- bio1: the seven content files with the baseline states and attention levels,
  the two-minute pitch script and the video script (merged before cp3).
- eng2: the condition evidence score route, the worse of the two blood
  pressure states, the state window without the tested reading, accounts with
  a PIN and session tokens, cited limits before the baseline (T-75), the pain
  reports route, and the demo video recording plan.
- eng1, frontend: reading context and the backend state route; history read
  from the backend; sign-in with the face, a username and PIN, or the open
  demo, with "Create an account" as its own tab (T-70); a mission start date
  per astronaut; the reaction check (REQ-38); the 3D body with the pain and
  injury picker; the body at the centre of the Status orbits; the possible
  conditions panel with evidence scores (REQ-06); History as a trend view per
  indicator; pain reports and mission start synced with the account once the
  server has the routes; NASA crew terms from the STANDARDS glossary; the
  telemetry console, cyan and violet accents, stage depth and the channel
  switch, and seven visual rounds across Identify, Report, Status and phone
  layouts. Live at hemoso.space.
- eng1, docs and scripts: decisions for the 600 kB budget, accounts, the
  per-astronaut day, the reaction changes, the console, the accents and the
  body in the orbits; the nutrition ids in `FORMATS.md`; `check_sources.py`
  fails only on links that are gone; cards T-60 to T-81.
- Checks on `main` after the merges: content 0 errors (8 `--strict` errors
  listed below), script tests 155 passed, backend 306 passed, frontend lint
  clean, 1126 unit tests, build 421.6 kB first load, e2e 39 passed 1 skipped.
- Open for submission: five content files (the two reaction indicators, T-74,
  and the three nutrition indicators, Bio 1) and three attention rows for the
  nutrition indicators (Bio 2), the 8 `--strict` errors; slides and the
  submission page with the AI-use disclosure; the Supabase SQL and PR #143
  (pain kind and mission start); PRs #152 and #154 (daily-average window and
  symptoms in the score); the demo rows for the reaction and nutrition
  indicators in Supabase.

## cp2 · Saturday 17:00 (closed 17:30)
- phys: the team's seven indicators with `min_spread`, `tier` and `system`, a
  NASA hazard page for each hazard named, demo data with `context` (218 rows,
  seed 20261114), `docs/sources.md`, and the moving-window baseline rule
  (F-phys-02).
- eng1: formats for indicators, tiers, systems, baseline and `context`;
  `check_content.py --strict`; precheck ignores commits merged from other
  branches; backend stores `context`, answers a re-sent entry once (200/201/409)
  and a failed save with 502. Backend deployed on Railway with Supabase
  storage; frontend on Vercel at hemoso.space with `VITE_API_BASE_URL`.
- eng2: entry form, Home status, attention badge, history view against the
  person's own earlier values, offline outbox that sends one entry at a time to
  the backend, keyboard and accessibility test of the demo path.
- bio2: attention levels decided, `rules/conditions.csv` with seven possible
  conditions mapped to indicator ids and sourced; `rules/attention.csv` has its
  header only (thresholds next).
- bio1: findings F-bio1-01 to F-bio1-03, the status and next-step text shape
  and the first content draft (still in `team/bio1/notes/`, not in
  `config/content/` yet).
- Open for cp3: attention thresholds (REQ-05), the seven content files
  (REQ-26, REQ-04), how condition probabilities are computed (REQ-06, team
  decision), `context` in the entry form, `docs/nasa_data.md` (REQ-19).

## cp1 · Saturday 12:00
- eng1: repository, board and team scripts; challenge notes checked against the
  official page and its resources mapped (T-05); 35 general requirements with one
  owner each; the team's solution paragraph and decisions (T-06, draft).
- bio1: branch set up.
- bio2, phys, eng2: branches not created yet (T-03 open).
