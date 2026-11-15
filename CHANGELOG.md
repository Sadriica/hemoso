# Changelog

Written by Eng 1 at every merge into `main`. Newest entry first.

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
