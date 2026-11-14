# HeMoSo · code analysis of origin/main (38baa27)

Read-only review, Sat 14 Nov. Worktree `Sadriica/main-analysis` at 38baa27 (= origin/main).
No tracked file changed; experiments ran in a scratch copy outside the repository.

## Commands run and results

| Command | Result |
| --- | --- |
| `cd frontend && npx -y pnpm@12.20.0 install --frozen-lockfile && … lint && … test && … build` | exit 0. Lint clean; 22 test files, 172 tests passed; build 46 modules, `dist/assets/index-*.js` 260.35 kB |
| `cd backend && uv sync --frozen && uv run ruff check . && uv run pytest` | exit 0. `All checks passed!`; `51 passed, 1 warning` (starlette httpx deprecation, harmless) |
| `python scripts/check_content.py` | `0 error(s), 9 warning(s)`: attention.csv, conditions.csv and the seven `content/<id>.md` files are missing |
| `python scripts/check_content.py --strict` | `9 error(s), 0 warning(s)`, exit 1 (same nine files) |
| `python -m unittest discover -s scripts -p "test_*.py"` | `Ran 99 tests … OK` |
| `python scripts/si_use.py --check` | `SI-USE.md is up to date.` |
| `python scripts/check_sources.py --offline` | 11 links "not in docs/sources.md" (see L3, M5) |
| `gh run view 43640233086` (Checks on main, 38baa27) | Frontend job ran: install, lint, test and build all `success` |
| `grep hr_bpm frontend/dist/assets/*.js` | present: the build does embed the real `config/` |

Probes (a copy of `frontend/` plus `config/` in the scratch folder, one extra Vitest file):

```
PROBE1 rules below 37.5 crew + below 36.0 cmo, value 35
       -> {"kind":"attention","level":"watch",...threshold 37.5}   keys: indicatorId, side, threshold, attentionLevel, sources
PROBE2 real config: 7 indicators, 210 demo rows, problems:
       Indicator 'hr_bpm' has no source or Assumption.   (same for bp_sys_mmhg, bp_dia_mmhg, temp_core_c, sleep_h, mood_1_5)
       Unknown indicator id 'example_indicator' in attention rules.
       Missing content file for indicator '<each of the 7>'.
       hr_bpm sources: []
PROBE3 two LocalEntryStore on one storage, one add each, reload -> entries 1, pending 1
PROBE4 latestEntry of two rows with the same day and time -> "first"
PROBE5 CSV with a newline inside a quoted cell -> CsvError: Line 2 has 1 columns; expected 2.
```

## High

### H1 · Status ignores `notify` and picks the first matching row, not the most severe
- `frontend/src/domain/attention.ts:3-20` ("The first matching rule wins"), `frontend/src/content/rules.ts:33-39` (no `notify` read), `frontend/src/domain/types.ts:22-29` (`AttentionRule` has no `notify`).
- FORMATS.md section 3, `config/rules/attention.csv`: "When several rows match a value, the row with the most severe `notify` wins", with the worked example `below 37.5 crew` and `below 36.0 cmo`, value 35 → `cmo`.
- Confirmed: PROBE1 with that exact example returns level `watch` (the crew row at 37.5), not the cmo row. The parsed rule has no `notify` key, so the app can never say who acts.
- Not visible yet only because `config/rules/attention.csv` does not exist (the placeholder has one row). The moment Bio 2 adds stepped rows, Home will show the milder level for the most extreme values.
- `scripts/check_content.py:65-68, 263-298` does read `notify` and checks the escalation, so the checker and the app disagree.
- Smallest fix: add `notify: 'crew' | 'cmo' | 'flight_surgeon'` to `AttentionRule`, parse and validate it in `rules.ts`, and in `attentionFor` collect all matching rules and return the one with the highest notify rank (ties: the more extreme threshold). Add the FORMATS example as a test. Update `src/content/placeholder/attention.csv` to the six FORMATS columns.

### H2 · Six of seven indicators show "No sources listed" although they have links
- `frontend/src/domain/source.ts:5-9`: a source cell is accepted only as one bare link (`/^https?:\/\/\S+$/`) or `Assumption`.
- STANDARDS.md §6: "In tables: the link alone, several separated by a space." `config/data/indicators.csv` uses two or three links per row; `scripts/check_content.py:100-105` (`valid_source`) accepts that.
- Confirmed: PROBE2 lists `Indicator 'hr_bpm' has no source or Assumption.` for six indicators, and `hr_bpm` sources is `[]`. On Home the Sources disclosure for these cards then reads "No sources listed." (`Home.tsx:112-114`) and the problems box lists six false source errors. Only `glucose_mgdl` (Assumption) works.
- This is visible in the demo today and it breaks the "every statement carries a source" rule on screen.
- Smallest fix: in `parseSource` (or a new `parseSources`) split the cell on whitespace, accept it when every token is a link, return one `Source` per link; keep `Assumption` as is. Add a test with the real `hr_bpm` row.

### H3 · Nothing is ever sent to the backend; the outbox only grows
- `grep -rn "fetch\|import.meta.env" frontend/src` (non-test) finds nothing; `VITE_API_BASE_URL` is declared in `src/vite-env.d.ts:4` and never read. `useOutbox` (`src/hooks/useOutbox.ts`) is used by no screen; `markSent` is called only from tests.
- Effect: every saved entry stays in `pendingIds` forever, the header never shows the pending count or last sync time (REQ-28 acceptance: "pending items and the last sync time are visible"), and entries never reach SQLite or Supabase (REQ-27 "history survives a reload" holds only through this browser's localStorage). The 200/201/409 handling asked about cannot be checked because there is no client.
- `strings.entry.saved` "Saved. Waiting to be sent." promises a send that does not exist.
- Smallest fix: a small `sendPending(store, baseUrl)` that POSTs each pending entry in order (`missionDay`, `time`), calls `markSent` on 200/201, also on 409 (keep it in a "conflict" list rather than retrying forever), keeps it pending on network error/5xx, retries on `online` and on load; show `useOutbox` in the header. Read the base URL from `import.meta.env.VITE_API_BASE_URL` and skip sending when it is empty.

## Medium

### M1 · Backend on main is not idempotent; the idempotency work is only on `origin/eng1`
- `backend/app/main.py:49-58` always answers 201 and calls `store.add`; `backend/app/storage.py` SQLite/Supabase/Memory all append (`INSERT`), no unique key; `backend/supabase/schema.sql` has no unique index; `docs/API.md` on main documents only `201` and `422`.
- `git log origin/main..origin/eng1` shows `0d21875 feat(api): idempotent POST /entries on natural key (#24)`, `e38471b docs(api): document 200/201/409`, `50f754e fix(api): dedup existing rows before unique index`. So the brief's "idempotent POST" is not on main yet.
- Risk: AGENTS.md merge order is `phys, bio1, bio2, eng2, eng1`. If eng2 adds a sender (H3) built against the eng1 API.md, it lands on main one merge before the backend that answers 200/409; a retry then stores a duplicate. Re-running `app.seed` is safe (it dedups by key in `seed.py:105-109`), POST is not.
- Smallest fix: merge eng1's #24 before (or with) any frontend sender; when it lands, run the Supabase migration from that branch before deploying.

### M2 · Two open tabs overwrite each other's entries
- `frontend/src/data/entryStore.ts:148-166`: the store reads localStorage once in the constructor and writes its whole in-memory state on each change; there is no `storage` event listener.
- Confirmed: PROBE3, two stores on one storage, one `add` each, reload → 1 entry, 1 pending. The first tab's entry is lost.
- Smallest fix: in `commit`, re-read and merge the stored entries/pendingIds (union by id) before writing, and listen to `window` `storage` events to refresh `state` and notify listeners.

### M3 · A corrected reading in the same minute is ignored on Home
- `frontend/src/domain/entries.ts:16`: `entry.time > latest.time` is strict, so on an equal day and time the earlier row wins.
- Confirmed: PROBE4 returns `first` for `[first, correction]`. The Entry form keeps day and time after saving (`Entry.tsx:156-157`), so re-saving a fixed value right away is the normal path, and Home keeps showing the old value and status.
- Smallest fix: use `>=` (later in the array wins), since `add` appends. With eng1's natural key (M1) the same key with a different value will also be a 409, so decide which one the app keeps; that is the team's call.

### M4 · Lost or reset local data is never shown to the user
- `entryStore.ts:20-25` says "the screens then say the entries are not saved on this device", but `isPersistent()` and `wasReset()` are used by no component (`grep -rn "isPersistent\|wasReset" src` outside `src/data/` and tests: no match).
- When the stored payload fails to parse (`storedState.ts:34-55`, e.g. after a `STORAGE_VERSION` bump or one bad row), `restore()` silently replaces it with the demo seed (`entryStore.ts:142-148`), dropping unsent entries.
- Smallest fix: show a warning `Notice` in `App` when `!store.isPersistent()` or `store.wasReset()`. Optionally keep the unreadable payload under a backup key before overwriting.

### M5 · `docs/sources.md` is empty while config uses 11 links
- STANDARDS.md §6: "Every source also goes into `docs/sources.md` (kept by Phys)." `docs/sources.md` has only the header and one empty row; `check_sources.py --offline` reports 11 links missing, all from `config/data/` and `docs/findings/phys-01-*`.
- Owner: Phys. Fix: one row per link (the script has `--add`).

### M6 · Vercel build may silently use placeholder content (unconfirmed)
- `frontend/src/content/load.ts:28-32` globs `../../../config/**/*.{csv,md}`, outside `frontend/`. `frontend/vercel.json` implies the Vercel Root Directory is `frontend/`. Vercel includes files outside the root directory only when the project setting "Include files outside the root directory in the Build Step" is on (it is on by default for new projects, but I could not check this project).
- If it is off, the glob returns `{}`, `readConfigFile` falls back to the placeholders, and the build passes (no test asserts the real config is present: the `load.test.ts` cases inject files). The deployed app would show `example_indicator`.
- CI locally and on GitHub does embed the real config (`hr_bpm` in `dist`), so only Vercel is in doubt.
- Smallest fix: one test that calls `loadContent()` with the default files and expects `usingPlaceholders === false` for `indicators.csv` and `demo_data.csv` (or a `build` check), and a line in `docs/DEPLOY.md` naming the Vercel setting and `VITE_API_BASE_URL`.

## Low

### L1 · Markdown `## Sources` lines without a title are dropped
- `frontend/src/content/markdown.ts:247-251` only accepts `- <Title>: <link>`. A line `- https://…` is ignored; `check_content.py:485-490` accepts any link under `## Sources`. The file then shows no sources unless the word Assumption appears. Confirmed by reading the regex (`(.*?):\s+` needs a colon followed by a space; `https://` has none). Fix: also accept a bare link (title = url) and report a problem instead of dropping it.

### L2 · Frontend CSV reader differs from the checker
- `frontend/src/content/csv.ts:91-100` splits on newlines before handling quotes, so a quoted cell with a line break fails (PROBE5), while Python's `csv` reads it; the frontend also skips `#` lines that the checker treats as data, and `Number('0x10')` is 16 where the checker rejects it. None of today's files hit this. Fix: parse quotes across lines in `splitRows`, or reject quoted newlines in `check_content.py` so both agree.

### L3 · `check_sources.py` captures the next CSV cell as part of a link
- `scripts/check_sources.py:23` `URL = re.compile(r"https?://[^\s<>\"'|\]]+")` does not stop at `,` (or `)` in Markdown links). Confirmed: it reports `https://www.who.int/news-room/fact-sheets/detail/hypertension,Synthetic (used in config/data/demo_ranges.csv)`. Online mode would test that wrong URL. Fix: add `,` and `)` to the excluded characters, or parse CSV cells with `csv` first.

### L4 · Placeholder attention row produces a permanent false problem
- With the real `indicators.csv` but no `attention.csv`, the placeholder row for `example_indicator` yields `Unknown indicator id 'example_indicator' in attention rules.` (PROBE2) in the "Content problems" box. Fix: skip placeholder files whose ids are not in the loaded indicators, or use placeholders only when `indicators.csv` is also a placeholder.

### L5 · Stale names between docs and code
- `docs/API.md:10` says the frontend reads an `API_URL` placeholder; the code declares `VITE_API_BASE_URL`. `docs/DEPLOY.md` lists only backend variables. Fix: name `VITE_API_BASE_URL` in both (Eng 1 owns them).
- `frontend/src/screens/Entry.test.tsx:9-19` uses `sleep_quality_1_5` "with the ids and units of config/data/indicators.csv"; that id left the list in `dfc7ab2` (nine → seven). Tests still pass; the fixture comment is wrong. `entryDraft.ts:7-9` and `Entry.tsx:25-26` comments still mention sleep quality.

### L6 · FORMATS.md section 2 still lists no real ids
- FORMATS.md section 2 holds only `<indicator_id>` placeholders, yet the seven ids are in `config/data/indicators.csv` and section 3 says "`id` in section 2". `check_content.py` does not enforce section 2, so this passes. Fix: Eng 1 writes the seven ids, names and units into the table (FORMATS.md is his file).

### L7 · One commit message on main mentions AI
- `e80eda8 chore(eng1): add supervisor prompt and AI-use log` (Wambi, Sat 11:09) matches the precheck `FORBIDDEN` pattern (`(?-i:\bAI\b)`). AGENTS.md rule 8 says commits never mention AI tools. It is already pushed and history may not be rewritten (AGENTS.md "Forbidden"), so: no action except keeping later messages clean.

## Areas with no findings
- Frontend lint, tests and build; backend ruff and pytest; script tests; `si_use.py --check`.
- CI: `checks.yml` runs the frontend install, lint, test and build on push and PR, and they passed on main (run 43640233086). The backend job and the Python matrix run too.
- Backend since the last audit: 502 on storage errors (`main.py:53-58, 66-71`), Supabase settings checked at startup, Dockerfile copies `config/` and sets `CONFIG_DIR=/config`, non-root user. CORS: `GET`/`POST` with `ALLOWED_ORIGINS`, enough for a JSON POST preflight.
- Config data agreement: the seven ids, units and columns match across `indicators.csv`, `demo_ranges.csv`, `demo_data.csv` (210 rows), the frontend parser (no unit or id problems in PROBE2), the backend `Entry` model and `indicators.py` (`°C` read as UTF-8), and `check_content.py` (0 errors). Time is `HH:MM` 24-hour and mission day a positive integer in all four.
- XSS: Markdown is parsed into plain strings and rendered as React text; no `dangerouslySetInnerHTML` or `innerHTML`; source links come only from `https?://` matches, so no `javascript:` URLs.
- Accessibility (REQ-15): every badge and notice has visible text plus an icon, colour only reinforces; tabs follow the ARIA tabs pattern with arrow keys, skip link, visible focus outline, labelled fields, errors linked with `aria-describedby` and focus moved to the first error.
- English UI (REQ-30): all strings in `src/strings.ts` are English.
- Synthetic notice (REQ-14): "Demo with synthetic data only." always in the header.
- Wording: no "you have", "diagnosis", "disease", "certain" or "confirmed" in `frontend/src` or `config/`; a missing rule shows "No threshold yet", never "In range".
- Medical values: the demo ranges are marked Assumption or cite the WHO fact sheet; I opened it and it gives ≥140 mmHg systolic and ≥90 mmHg diastolic, as the generation notes say. The NASA wearable page does describe the T-Mini core temperature headband. No invented value found.
- AI mentions: none in product code, config, READMEs or code comments; the mentions in `docs/` are the team's own rules and disclosure plans.
- Owned paths: every commit on main since Sat 09:38 touches only its author's paths (julimejia: `frontend/`, `team/eng2/`; IsabellaCabreraquintero: `config/data/`, `team/phys/`, `docs/findings/phys-*`; Wambi: the eng1 paths; the only Wambi commit in other people's folders is the `chore: set up repository` scaffold).
