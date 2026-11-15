# Bio 2 · Rules, thresholds and submission

**Name:** Cami
**Branch:** `bio2`
**Agent:** `.opencode/agents/bio2.md`
**Owns:** `config/rules/`, `submission/submission.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sun 05:40
- **Done:** `attention.csv` has the two reaction rows; `conditions.csv` has
  `current_state`; the symptoms, symptom-log, profile and labs formats are in
  `FORMATS.md`; the symptom test vectors are in
  `team/bio2/notes/symptom-test-vectors.md`; the five decisions of the night
  block are in `docs/DECISIONS.md` with the 06:00 cutoff.
- **In progress:** the work is written but uncommitted. T-78 waits for
  Juli/Wambi to accept the optional fifth column and the test vectors; T-81
  waits for Phys's `premission_profile.csv` and `labs.csv`.
- **Next:** Wambi adds the two shared paths or commits them; then push this
  branch before the 06:00 cutoff and hand it over.
- **T-04 answered** Sat 23:40: the official close is 23:59 local with no earlier
  cut; the mentor presentation is feedback, not scored; the demo is 7 slides in
  English or a 30 s video in English or with English subtitles, not one second
  more. Card #4 waits for Wambi to move it to Review.
- **Board:** open cards #16, #17, #21, #27, #31, #34, #35, #36, #38, #41, #50,
  #114 (T-73, ready for review), #123 (T-78), #130 (T-81).

## Blockers
- `python scripts/precheck.py` fails on `FORMATS.md` and `docs/DECISIONS.md`
  because they are outside Bio 2's paths. Wambi asked for those edits; he has to
  add the paths or commit the files.
- Four untracked frontend files in the tree block `precheck` too; they belong to
  Wambi and Juli.
- Phys has not added `symptoms.csv`, `symptom_log.csv`,
  `premission_profile.csv`, `labs.csv` or the three nutrition rows.
- Bio 1 has not added `content/reaction_median_ms.md` or
  `content/reaction_lapses.md`; `check_content.py` reports two warnings.
- The board is read-only for this account: `board.py move` fails with "does not
  have the correct permissions to execute UpdateProjectV2ItemFieldValue", so
  Wambi has to move the cards.

## Shift
- Sleep shift: B (4:30–8:00). Awake until 4:30; the 7:45 checkpoint needs a
  cover from someone else.
- If someone else continues my work: use the `bio2` agent and read this file and `LOG.md`.
