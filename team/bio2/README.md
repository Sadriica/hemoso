# Bio 2 · Rules, thresholds and submission

**Name:** Cami
**Branch:** `bio2`
**Agent:** `.opencode/agents/bio2.md`
**Owns:** `config/rules/`, `submission/submission.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sat 11:40
- **Done:** clone and `scripts/setup.sh bio2` (T-03). Author set to Cami
  <pamirestrepo@gmail.com>, `commit-msg` hook active, branch `bio2` pushed.
- **In progress:** the rules file format. `config/rules/` cannot be written
  until `FORMATS.md` fixes its columns (T-06).
- **Next:** draft of the thresholds table in `team/bio2/notes/` with one source
  per number; log the answers to T-04; review Bio 1's status texts (REQ-10).

## Blockers
- `FORMATS.md` is empty: no agreed file and columns for `config/rules/` (T-06).
  Bio 1 and Phys are blocked by the same card.
- `python scripts/board.py` cannot run here: `scripts/board.json` exists only on
  the `eng1` branch. Bio 2 reads the cards with `gh issue list --label bio2`.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `bio2` agent and read this file and `LOG.md`.
