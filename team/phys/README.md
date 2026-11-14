# Phys · Data, NASA sources and measurement

**Name:** Isabella Cabrera Quintero
**Branch:** `phys`
**Agent:** `.opencode/agents/phys.md`
**Owns:** `config/data/`, `docs/sources.md`, `docs/nasa_data.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sat 14, 15:35
- **Done:** branch `phys` created and pushed; `team/phys/notes/measurement-in-flight.md`; `team/phys/notes/nasa-data-draft.md`; `docs/findings/phys-01-baseline-over-fixed-ranges.md`; `team/phys/notes/indicators-proposal.md`; `config/data/indicators.csv` with 9 indicators, each with instrument, hazards and source (check_content: 0 errors)
- **In progress:** none
- **Next:** `config/data/demo_ranges.csv` and `demo_data.csv` (REQ-29); `docs/nasa_data.md` and `docs/sources.md`; the review of the solution paragraph

## Blockers
- `config/data/indicators.csv` uses 9 ids that are not in the section 2 table of `FORMATS.md` yet. Eng 1 has to add them there, because that file is his.
- `scripts/precheck.py` fails after any merge into a personal branch: it diffs against the upstream and counts the files that came from `main` as yours. Fix: `origin/main...HEAD` instead of `upstream..HEAD`.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `phys` agent and read this file and `LOG.md`.
