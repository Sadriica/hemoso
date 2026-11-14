# Phys · Data, NASA sources and measurement

**Name:** Isabella Cabrera Quintero
**Branch:** `phys`
**Agent:** `.opencode/agents/phys.md`
**Owns:** `config/data/`, `docs/sources.md`, `docs/nasa_data.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sat 14, 16:00
- **Done:** `config/data/indicators.csv` (9 indicators), `demo_ranges.csv` (9 ranges with source) and `demo_data.csv` (30 days, 270 rows, seed 20261114); `docs/findings/phys-01` and `phys-02`; 3 notes; check_content: 0 errors
- **In progress:** none
- **Next:** `docs/nasa_data.md` and `docs/sources.md` (both still empty and both mine)

## Blockers
- `config/data/indicators.csv` uses 9 ids that are not in the section 2 table of `FORMATS.md` yet. Eng 1 has to add them there, because that file is his.
- `scripts/precheck.py` fails after any merge into a personal branch: it diffs against the upstream and counts the files that came from `main` as yours. Fix: `origin/main...HEAD` instead of `upstream..HEAD`.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `phys` agent and read this file and `LOG.md`.
