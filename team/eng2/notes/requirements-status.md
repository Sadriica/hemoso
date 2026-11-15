# Eng 2 · requirement status

Status of the requirements assigned to Juli (@julimejia). The first seven
columns are copied from `docs/requirements.md` (Eng 1 keeps them); the last
four are added here. Wambi moves the requirement cards; this file is the
evidence for each move.

Updated Sat 14 Nov 19:55 on `eng2` at 776920e (= `main`, merge #87).

Since 19:40 (`docs/DECISIONS.md`, commit 1014687) Wambi owns the frontend and
Juli owns the backend, `docs/API.md` and `docs/openapi.json`. Juli's
requirements are now REQ-27 and REQ-31. The frontend requirements she
handed over are listed at the end with their state at the handover.

How "Dev" is set: the share of the "Done when" line that can be seen now. A
requirement is ready to close only when its work is on `main` and, for the
app, at the public link.

Summary: 2 requirements, 0 ready to close, average 43 %.

| ID | Requirement | Class | Priority | Owner (GitHub) | Block | Done when | Dev | Seen now | Missing | Cards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-27 | Keep each astronaut's measurements over time so earlier values can be compared | context | P1 | Juli (@julimejia) | B3 Sat 17-1 | Every entry is stored with time, unit and person; the history survives a reload; a function returns a person's earlier values for an indicator | 85 % | On `main`: FastAPI `POST /entries` (201 new, 200 same entry again, 409 conflict), `GET /people/{person}/indicators/{indicator}/history`, `GET .../state`; stores in memory, SQLite and Supabase; rate limit. `ruff` clean, 124 tests pass (checked 19:55 in a scratch venv with the pinned versions). Deployed at https://hemoso-production.up.railway.app: `/health` 200, history of `demo_astronaut_1` empty (no client sends yet) | Proof in production: confirm `STORAGE=supabase` on Railway (SQLite on Railway is lost on every deploy, so "survives a reload" fails); one entry sent by the app and read back after a redeploy; Wambi sets `VITE_API_BASE_URL` (M1 is solved: idempotent #24 is on `main`) | #43, T-54 |
| REQ-31 | Demo video recorded with English subtitles and a public link | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | Video of 30 s or less recorded from the app, English subtitles burned in, hosted outside Space Apps, link opens with no password, permission or registration | 0 % | Nothing yet. Bio 1's story draft (`team/bio1/notes/elena-demo-texts.md`): four moments, days 22, 41, 42 and 46 | Script `submission/video.md` (Bio 1, REQ-17); the public link serving `main` (Wambi); real attention rules so the moments show states, not "No threshold yet" (Bio 2); recording without `?team=1` or `?face=1`; subtitles burned in; upload to a public host | #47, T-52, T-16 |

## Blocked by other owners
| Our ID | Waits on | State at 19:55 |
| --- | --- | --- |
| REQ-27 | Wambi: `STORAGE=supabase` and Supabase variables on Railway | Not visible from outside; `/health` does not report the store |
| REQ-27 | Wambi: `VITE_API_BASE_URL` on Vercel so the app sends entries | Unset; the app says "No server set up for this demo" |
| REQ-31 | Bio 1: `submission/video.md` script within 30 s (REQ-17) | Not on `main` |
| REQ-31 | Wambi: https://hemoso.vercel.app serving `main` | Still the 11:58 build; `main` deploys to Wambi's Vercel project |
| REQ-31 | Bio 2: `config/rules/attention.csv` rows | Drafts in `team/bio2/notes/`, not in `config/` |
| REQ-31 | Bio 2 (REQ-20): whether a screen recording of the app needs the SI watermark | To confirm; the rule names SI-generated images and video |

## Handed over to Wambi at 19:40
State of Juli's former frontend requirements when the roles swapped. All the
code below is on `main` since merge #87 (19:50).

| ID | Dev at handover | Evidence | Missing |
| --- | --- | --- | --- |
| REQ-01 | 70 % | Status phase cards, "No threshold yet" plus CMO step, who to tell, details, sources (dec97ba) | Bio 2 rules and Bio 1 texts in `config/` |
| REQ-02 | 100 % on `main` | Report phase, unit beside the field, 1-to-5 choice, 24-hour time | Public link |
| REQ-12 | 75 % | History in the Status phase: chart, table, comparison sentence | Read the backend history (T-54) |
| REQ-15 | 100 % on `main` | e2e: guided check by keyboard with axe on every phase, phone and desktop | Public link |
| REQ-28 | 65 % | Outbox, sync client, status row | Service worker (T-48, never precache `/models/`) |
| REQ-30 | 70 % | All strings in English | Wording pass (T-51) |
| REQ-32 | 50 % | 320 px and Pixel 7 tested; first load 290 kB / 88 kB gzip | Public link serving `main` |
| REQ-36 (proposed) | 50 % | Face sign-in behind `?face=1` (f0ff594) | REQ-14 exception row; T-58 iteration 2, T-59 |

## Warning M1 (solved)
The idempotent backend (#24, 200 for a known entry and 409 for a conflict) is
on `main`, so `VITE_API_BASE_URL` can be set on Vercel without duplicating
measurements on retries.

## Change log
| Time | Change |
| --- | --- |
| 19:55 | Scope moved to REQ-27 and REQ-31 after the 19:40 role swap; backend checked (124 tests, Railway `/health` 200); frontend requirements listed as handed over; M1 solved |
| 19:45 | T-60 (dec97ba) checked: 391 unit tests, e2e 7 passed; REQ-12 75 %, REQ-15 95 % |
| 17:08 to 19:40 | T-45, T-49, T-46, T-47, face sign-in, MUI tried and rejected, T-60 (see `git log` of this file) |
| 16:31 | File created, in the column format of `docs/requirements.md` |
