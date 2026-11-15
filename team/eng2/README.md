# Eng 2 (Juli) · Backend and demo video

**Name:** Juli
**Branch:** `eng2` (work branches `eng2-*`)
**Agent:** `.opencode/agents/eng2.md`
**Owns:** `backend/`, `docs/API.md`, `docs/openapi.json`, `team/eng2/` (since the role swap of Sat 19:40; Wambi owns the frontend and stays integrator)

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sun 06:40
- **Done:** #88 T-66 conditions route; #89 T-67 blood pressure state; #95 T-68 state window; #103 T-69 accounts; #119 T-75 safety order (all on `main`, closed by PR #151); B-3 pain reports on `main` (#138), `/pain` 200 in production; REQ-27 proven in production (entry of Sat 23:56 read back after the #138 deploy)
- **In progress:** PR #152 W-1 daily-average window (checks green); PR #154 #128 T-79 symptoms in the score (431 tests, checks running); PR #151 closing the five cards above
- **Next:** #52 T-16 demo video with English subtitles (block Sun 9:00 to 12:00); production check after each merge
- **Chat line:** `[eng2] ready · done: 7 (T-66, T-67, T-68, T-69, T-75, B-3, REQ-27) · next: T-79 (#154), W-1 (#152), T-16 · blocked: none`

## Blockers
- None. Waiting on others, not blocked: SQL blocks of PR #143 and #154 in Supabase (Wambi or Juli), `symptoms.csv` and `symptom_log.csv` (Phys), the `symptoms` column in `conditions.csv` (Bio 2), the two reaction content files (Bio 1).

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `eng2` agent and read this file and `LOG.md`.
