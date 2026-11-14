# frontend/ · Eng 2

Vite + React + TypeScript app, managed with pnpm 12. This is the HeMoSo
frontend shell. Tools and versions: `docs/STACK.md`; public link and video:
`docs/DEPLOY.md`.

## Setup (from `frontend/`)
```bash
pnpm install --frozen-lockfile
```

## Commands
```bash
pnpm dev       # start the dev server
pnpm build     # type-check (tsc -b), then build to dist/
pnpm preview   # serve the production build locally
pnpm lint      # ESLint
pnpm test      # Vitest, runs once
```

## Notes
- `base: './'` in `vite.config.ts` so the build works from any static host
  (GitHub Pages).
- The shell shows synthetic data only. The real indicators and their units come
  from `config/` once `FORMATS.md` is agreed.

## Project structure
| Folder | Holds |
| --- | --- |
| `src/content/` | Reading and validating the `config/` files: `csv.ts` (CSV parser and cell helpers), `markdown.ts` (indicator `.md`), `indicators.ts`, `rules.ts`, `entries.ts` (row validation), `load.ts` (reads `config/` at build time and orchestrates), `placeholder/` (fallback files). |
| `src/domain/` | Types from `FORMATS.md` and pure functions with no React: `attention.ts`, `entries.ts`, `clock.ts` (mission day and `HH:MM`), `source.ts`. |
| `src/data/` | The browser store: `entryStore.ts` (entries and outbox), `storedState.ts` (the stored shape), `entryId.ts` (ids for new entries). |
| `src/hooks/` | React bindings for the store: `useEntries`, `useOutbox`. |
| `src/components/` | Presentational pieces: `AttentionBadge`, `Disclosure`, `SyntheticNotice`. |
| `src/screens/` | Full screens: `Home` (status of each indicator and its next step). |
| `src/App.tsx` | Tabs, person picker, layout and skip link. |
| `src/strings.ts` | Every English label and message in one place. |

## Content from `config/`
The app reads these files, all in the shapes from `FORMATS.md`:
- `config/data/indicators.csv` — the indicators.
- `config/rules/attention.csv` — the attention thresholds and levels.
- `config/data/demo_data.csv` — synthetic measurements.
- `config/content/<indicator_id>.md` — the plain-language text per indicator.

When a required file is missing, the app falls back to the `FORMATS.md`
placeholder examples in `src/content/placeholder/`, and shows
"Showing example content until the team adds config files." Validation
problems (unknown ids, unit mismatches, missing sources, malformed rows and
the like) do not crash the app; they appear under
"Content problems (for the team)" on the Home screen.

## Data in the browser
Entries live in one `localStorage` key, `hemoso:v2`, holding
`{ version: 2, entries, pendingIds, lastSent }`:
- `entries` is every measurement, with the same columns as `demo_data.csv`.
- `pendingIds` is the outbox: ids of entries the server has not accepted yet.
  New entries go in when they are saved and leave it when they are sent;
  `lastSent` keeps the mission day and time of the last accepted send.
- The demo rows from `demo_data.csv` are written once, on the first run, when
  the key is absent. Seeded rows are not waiting to be sent.
- Stored data that cannot be read (another version, broken JSON, a row that
  breaks the rules) is replaced by the seed rows. `wasReset()` returns true in
  that case, so a screen can tell the astronaut that the stored entries were
  lost; a first run is not a reset.
- If the browser blocks storage, the app keeps working in memory for that tab
  and `isPersistent()` returns false.

`useEntries(store)` and `useOutbox(store)` read the store with
`useSyncExternalStore`, so a saved entry shows on Home at once and the waiting
count follows every change.
