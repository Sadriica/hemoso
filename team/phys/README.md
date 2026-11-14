# Phys · Data, NASA sources and measurement

**Name:** Isabella Cabrera Quintero
**Branch:** `phys`
**Agent:** `.opencode/agents/phys.md`
**Owns:** `config/data/`, `docs/sources.md`, `docs/nasa_data.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sat 14, 15:45
- **Done:** the team's 7 indicators with a hazard page per hazard named; degraded hazards removed where no page was read; moving-window rule in `phys-02`; `team/phys/notes/format-v2-proposal.md` with the 5 points answered; demo rebuilt (210 rows); check_content: 0 errors
- **In progress:** none
- **Next:** `docs/nasa_data.md` and `docs/sources.md` (both empty and both mine)

## Blockers
- The team's list adds `tier` and `system` columns. `FORMATS.md` and `scripts/check_content.py` still expect 7 columns, so Eng 1 has to update both before those columns can be committed.
- `scripts/precheck.py` fails after any merge into a personal branch: it diffs against the upstream and counts the files that came from `main` as yours. Fix: `origin/main...HEAD` instead of `upstream..HEAD`.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `phys` agent and read this file and `LOG.md`.
