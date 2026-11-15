# Eng 2 (Juli) · Backend and demo video

**Name:** Juli
**Branch:** `eng2` (work branches `eng2-*`)
**Agent:** `.opencode/agents/eng2.md`
**Owns:** `backend/`, `docs/API.md`, `docs/openapi.json`, `team/eng2/` (since the role swap of Sat 19:40; Wambi owns the frontend and stays integrator)

## Current status
_Update before every checkpoint and at every shift change._

- **Time:** Sun 07:45
- **Done:** #88 T-66 conditions route; #89 T-67 blood pressure state; #95 T-68 state window; #103 T-69 accounts; #119 T-75 safety order (closed by PR #151, merged); B-1 REQ-27 proven in production (entry of Sat 23:56 read back after the #138 deploy); B-3 pain reports on `main` (#138), `/pain` 200 in production
- **In review:** see "Pull requests" below
- **Next:** #52 T-16 demo video with English subtitles (block Sun 9:00 to 12:00); production check after each merge
- **Chat line:** `[eng2] ready · done: 7 (T-66, T-67, T-68, T-69, T-75, B-1, B-3) · review: #152 W-1, #154 T-79 · next: T-16 video 9:00 from https://www.hemoso.space · blocked: none (T-16 waits for Bio 1's shot map and the NASA line from Phys)`

## Pull requests

| PR | Card | State | What it needs to merge |
| --- | --- | --- | --- |
| #151 | closes #88 #89 #95 #103 #119 | Merged | Nothing |
| #152 | W-1, daily-average window (#14) | Open, checks green, no conflicts | Wambi merges. Then `frontend/src/domain/state.ts` (Wambi) moves from 14 readings to 14 mission days, or the frontend uses the state route only |
| #154 | #128 T-79, symptoms in the score | Open, 431 tests, `main` merged at b607937 | Wambi merges; Bio 2 then adds the `symptoms` column to `conditions.csv` (her rows: `team/bio2/notes/glucose-symptoms.md`); the `symptom_reports` block of `schema.sql` runs in Supabase |
| #142, #143 | Wambi's: mission start (#100), pain kind (#26) | Open, checks green | The `kind` and `mission_start` blocks of `schema.sql` run in Supabase first; otherwise the person routes answer 502 |

## Pending, by owner

| What | Owner | Blocks |
| --- | --- | --- |
| Shot map of the video against today's screens (`team/eng2/notes/t16-recording-plan.md`) | Bio 1 | T-16 |
| NASA resource line for the video caption | Phys (REQ-19) | T-16 |
| `ffmpeg` on the recording machine | Juli | T-16 |
| SQL in Supabase: `kind`, `mission_start`, `symptom_reports` | Wambi or Juli | #142, #143, #154 in production |
| `symptoms` column in `conditions.csv` | Bio 2, after #154 | Symptoms in the score |
| Content files for the reaction and nutrition indicators (5) | Bio 1 | Next step text for those indicators |
| `attention.csv` rows for appetite, fluid intake and body mass | Bio 2 | `check_content` warnings |

Done by others since Sun 06:00: `symptoms.csv` and `symptom_log.csv` (Phys, #155); with them and Bio 2's rows the seed loads 368 readings and 8 symptom reports on a test config.

## Blockers
- None. The public demo is https://www.hemoso.space: no login, Sun 07:30 build, connected to Railway (checked anonymously at 07:55). `hemoso.vercel.app` is an old project of mine on the Sat 11:58 build; it is not the team's link.

## Shift
- Sleep shift: _(A: 1:00–4:30 · B: 4:30–8:00)_
- If someone else continues my work: use the `eng2` agent and read this file and `LOG.md`.
