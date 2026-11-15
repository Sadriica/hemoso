# Changelog

Written by Eng 1 at every merge into `main`. Newest entry first.

## cp3 · Sunday 08:00 (draft, written Sun 05:00; final merges at 07:45)
- phys: indicators with tier and system, glucose at tier A with the i-STAT,
  `docs/nasa_data.md`, five findings, the baseline rule with cited limits first
  (F-phys-02), and the two reaction indicators with the 3-minute PVT-B method
  (F-phys-06).
- bio2: 12 attention thresholds with their side, conditions with signal sides
  and the current state condition (T-73), the evidence score (F-bio2-02), the
  blood pressure rule (F-bio2-01), and a review of the seven content files.
- bio1: the seven content files with the baseline states and attention levels,
  the two-minute pitch script and the video script.
- eng2: the condition evidence score route, the worse of the two blood
  pressure states, the state window without the tested reading, accounts with
  a PIN and session tokens, cited limits before the baseline (T-75), and the
  pain reports route.
- eng1, frontend: reading context and the backend state route; history read
  from the backend; sign-in with the face, a username and PIN, or the open
  demo; a mission start date per astronaut; the reaction check (REQ-38, a 90 s
  run adapted from the PVT-B, colour targets off until Phys confirms); the 3D
  body with the pain and injury picker and a 2D fallback when WebGL fails; the
  possible conditions panel with evidence scores (REQ-06); NASA crew terms
  (Flight Day, GMT, Post-sleep, Pre-sleep) from the STANDARDS glossary; the
  visual layer in three rounds and the telemetry console for Report and Status;
  self-hosted fonts. Live at hemoso.space.
- eng1, docs: decisions for the 600 kB budget, accounts, face shown by
  default, the per-astronaut day, the reaction changes and the console; the
  STANDARDS glossary with NASA sources; the REQ-37 and REQ-38 rows; cards T-60
  to T-81.
- Open for submission: the two reaction content files (T-74, the only
  `--strict` errors), the 90 s method text in `indicators.csv` (Phys), slides
  and the submission page with the AI-use disclosure, the Supabase SQL and the
  merge of PR #143 (pain kind and mission start) after cp3.

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
