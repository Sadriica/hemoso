# Bio 1 · Health content and pitch

**Name:** _(fill in)_
**Branch:** `bio1`
**Agent:** `.opencode/agents/bio1.md`
**Owns:** `config/content/`, `submission/script.md`, `submission/slides.md`, `submission/video.md`

## Current status
_Update before every checkpoint and at every shift change._

[bio1] ready · done: F-bio1-01, F-bio1-02, F-bio1-03 (fluid deferred), 7 content files · next: level names from attention.csv, then REQ-08 · blocked: indicators.csv (Phys), attention.csv (Bio 2)

- **Time:** Sat 19:00
- **Done:** F-bio1-01 with the question 2 source for the proposed indicators (`team/bio1/notes/question-2-evidence.md`); F-bio1-02 on space fever; F-bio1-03 proposing fluid intake (deferred by the team); the REQ-26 text shape (`team/bio1/notes/status-texts.md`); the seven content files in `config/content/` for the six indicators of the statement, with `check_content.py` at 0 errors
- **In progress:** waiting for `config/data/indicators.csv` to confirm the ids, and `config/rules/attention.csv` for the level names
- **Next:** adjust the level headings when `attention.csv` lands, then move to REQ-08 and the pitch

## Blockers
- `config/data/indicators.csv` (Phys, REQ-03): the ids and units in the content files are the ones listed in the task, not read from the file.
- `config/rules/attention.csv` (Bio 2, REQ-05): the three `###` headings per file are provisional.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `bio1` agent and read this file and `LOG.md`.
