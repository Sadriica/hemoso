# Changelog

Written by Eng 1 at every merge into `main`. Newest entry first.

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
