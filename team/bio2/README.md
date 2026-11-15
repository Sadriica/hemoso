# Bio 2 · Rules, thresholds and submission

**Name:** Cami
**Branch:** `bio2`
**Agent:** `.opencode/agents/bio2.md`
**Owns:** `config/rules/`, `submission/submission.md`

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sat 18:00
- **Done:** setup and branch (T-03). `main` merged twice, up to the checkpoint
  `cp1` and the `notify` column commit. Attention levels decided: `watch`,
  `consult`, `urgent` (`team/bio2/notes/attention-levels.md`). `attention.csv`
  with 12 rows, at least one per indicator: heart rate, both pressures, core
  temperature, glucose, sleep and mood, each with a source or `Assumption`
  (REQ-05). `conditions.csv` has the seven conditions (REQ-06). The pressure
  rule is in `docs/findings/bio2-01` and the evidence score in
  `docs/findings/bio2-02`; the percentage note is marked superseded. The
  glucose review now has the in-flight analyser source (REQ-03).
- **In progress:** Eng 1 has to record the two rules in `docs/DECISIONS.md`;
  Bio 1 needs `### watch` headings for sleep and mood.
- **Done today, outside the code:** the five members are on the Members tab of
  ReTardis (REQ-24, checked at 19:35).
- **Next:** review Bio 1's status texts (REQ-10); start the submission page on
  Sunday.
- **T-04 answered** Sat 23:40: the official close is 23:59 local with no earlier
  cut; the mentor presentation is feedback, not scored; the demo is 7 slides in
  English or a 30 s video in English or with English subtitles, not one second
  more. Card #4 waits for Wambi to move it to Review.
- **Board:** open cards #4, #16, #17, #21, #27, #31, #34, #35, #36, #38, #41, #50.

## Blockers
- `conditions.csv` cannot separate hyperglycaemia from hypoglycaemia, or the
  two pairs that share every input, without a direction or an extra symptom
  (REQ-06).
- `config/data/indicators.csv` still says glucose has no in-flight device and
  `docs/DECISIONS.md` still lists it as tier C. Phys and Eng 1 own those files;
  the source is in `team/bio2/notes/indicators-review.md`.
- T-04 is answered (Sat 23:40); card #4 waits for Wambi.
- The board is read-only for this account: `board.py move` fails with "does not
  have the correct permissions to execute UpdateProjectV2ItemFieldValue", so
  Wambi has to move the cards.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `bio2` agent and read this file and `LOG.md`.
