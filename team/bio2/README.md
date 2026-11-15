# Bio 2 · Rules, thresholds and submission

**Name:** Cami
**Branch:** `bio2`
**Agent:** `.opencode/agents/bio2.md`
**Owns:** `config/rules/`, `submission/submission.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sun 06:00
- **Done:** `attention.csv` has the two reaction rows; `conditions.csv` has
  `current_state`; the symptom formats and the five decisions of the night
  block are pushed in `1f0b88c`; the symptom test vectors are in
  `team/bio2/notes/symptom-test-vectors.md`; `submission/submission.md` is
  drafted with every page field, the five judging criteria and the five names;
  the seven content files of Bio 1 are reviewed in
  `team/bio2/notes/content-review.md`.
- **In progress:** T-78 is pushed and waits for Wambi's checker (optional fifth
  column) and Phys's `symptoms.csv`; T-81 waits for Phys's profile and labs.
- **Next:** sleep, shift B (4:30-8:00, already late). On waking: fill the three
  links in `submission.md` (app, demo, team), confirm with Juli that every
  "what it does" line is in `main`, then T-15.
- **T-04 answered** Sat 23:40: the official close is 23:59 local with no earlier
  cut; the mentor presentation is feedback, not scored; the demo is 7 slides in
  English or a 30 s video in English or with English subtitles, not one second
  more. Card #4 waits for Wambi to move it to Review.
- **Board:** open cards #16, #17, #21, #27, #31, #34, #35, #36, #38, #41, #50,
  #114 (T-73, ready for review), #123 (T-78), #130 (T-81).

## Blockers
- Four untracked frontend files in the tree keep `precheck` red; they belong to
  Juli (`AppHeader.tsx`, `ScreenTabs.tsx`, `tabs.ts`, `theme.ts`).
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
