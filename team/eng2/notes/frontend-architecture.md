# Frontend architecture (Eng 2) · version 2

Follows Eng 1's `FORMATS.md` draft (Sat 14 12:31) and the solution decisions
in `docs/DECISIONS.md` (12:45): React app on Vercel, stored data behind a
FastAPI backend with Supabase, content read from `config/`. Version 1 (from
the 12 Nov MVP document) is in git history at d847581.

No indicator, attention level, threshold or text is invented here. Until Phys,
Bio 1 and Bio 2 fill `config/`, the app runs on the placeholder rows that
`FORMATS.md` itself uses as examples (`example_indicator`, `example_level`),
and every screen says the data is synthetic.

## Requirements served
| Ref | Done when (short) | Where |
| --- | --- | --- |
| REQ-01 | One screen: status of each indicator and a clear next step, content from `config/` | `screens/Home` |
| REQ-02 | Every indicator entered by keyboard and clicks, unit shown | `screens/Entry` |
| REQ-12 | History per indicator against the person's own earlier values | `screens/History` |
| REQ-15 | Never colour alone; demo path works by keyboard | every component, e2e with axe |
| REQ-28 | Works offline after first load; pending items and last sync time visible | `data/`, `components/SyncStatus`, `public/sw.js` |
| REQ-30 | Every screen, label and message in English | `strings.ts` |
| REQ-31 | 30 s video from the app with English subtitles | e2e recording |
| REQ-32 | Public link, desktop and phone | Vercel, responsive layout |

## Layers
| Folder | Holds | Depends on |
| --- | --- | --- |
| `src/content/csv.ts` | A small CSV parser (quoted fields, commas, CRLF), no library | nothing |
| `src/content/markdown.ts` | Splits an indicator's `.md` into the `FORMATS.md` headings; renders paragraphs and numbered lists as plain text, no HTML injection | nothing |
| `src/content/load.ts` | Reads `config/` at build time with `import.meta.glob('../../../config/**/*.{csv,md}', { query: '?raw', eager: true })`; validates rows; falls back to `src/content/placeholder/` when a file is missing | `csv`, `markdown`, `domain` |
| `src/domain/` | Types from `FORMATS.md` section 3 and pure functions: `attentionFor`, `compareToOwnHistory` | nothing |
| `src/data/` | `EntryStore` (browser storage + outbox), `SyncClient` (FastAPI when configured), `lastSync` | `domain` |
| `src/components/` | `AttentionBadge`, `SyncStatus`, `SourceList`, `SyntheticNotice`, `IndicatorChart` (own SVG) | `domain` |
| `src/screens/` | `Home`, `Entry`, `History`, `IndicatorDetail` | all above |
| `src/App.tsx` | Tabs (no path routes), person picker, layout | `screens` |

Rules:
- Screens never call `fetch`, `localStorage` or `import.meta.glob` directly.
- Every medical text on screen comes from `config/` (REQ-26) and shows its sources or the word "Assumption".
- Mission time is "Day N"; clock times are 24-hour `HH:MM` (STANDARDS.md 4).
- No probabilities or condition names on screen: `rules/conditions.csv` is not read until the team settles how it fits `AGENTS.md` ("never diagnose, no risk percentages").

## Types (`src/domain/types.ts`), from `FORMATS.md`
```ts
type Direction = 'higher' | 'lower' | 'both'
type Source = { title: string; url: string } | 'Assumption'

interface Indicator {            // config/data/indicators.csv
  id: string; name: string; unit: string; direction: Direction
  measuredOnBoard: string; hazards: string[]; sources: Source[]
}
interface AttentionRule {        // config/rules/attention.csv
  indicatorId: string; side: 'below' | 'above'; threshold: number
  attentionLevel: string; sources: Source[]
}
interface IndicatorContent {     // config/content/<id>.md
  indicatorId: string; name: string
  whyItMatters: string; howSpaceflightAffectsIt: string
  measurementSteps: string[]
  statusAndNextSteps: Record<string, string>   // key: attention_level
  howToPrevent: string; sources: Source[]
}
interface Entry {                // same columns as config/data/demo_data.csv
  id: string; personId: string; indicatorId: string
  value: number; unit: string; missionDay: number; time: string   // HH:MM
}
type Attention =
  | { kind: 'in_range' }
  | { kind: 'attention'; level: string; rule: AttentionRule }
  | { kind: 'no_data' }
```
`attentionFor(value, rules)`: a rule with side `above` matches when value > threshold, `below` when value < threshold; the first match wins; none is `in_range`. If Eng 1 moves this to the backend, the screen reads the result instead and this function goes.

## Data and sync (REQ-27 shape, REQ-28)
- `EntryStore`: entries under one `localStorage` key `hemoso:v2`, every read and write in try/catch, memory fallback with a visible "not saved on this device" note. Seeded once from `demo_data.csv`.
- Every new entry also enters the outbox. `SyncStatus` shows "N waiting to be sent" and "Last sent: Day N HH:MM" or "Not sent yet".
- `SyncClient`: `NoopSync` when `VITE_API_BASE_URL` is empty (the public demo); `HttpSync` posts `{ entries }` to `${VITE_API_BASE_URL}/entries` and expects `{ accepted: string[] }`. Sync runs on the `online` event and on a "Send now" button; the app never waits for it.
- Offline after first load: `public/sw.js`, hand-written, caches the built app shell on install and serves it cache-first; registered only in production builds.

## Accessibility (REQ-15)
- `AttentionBadge`: icon + text always ("In range", the attention level name, "No data"); colour only reinforces.
- Charts: SVG with a text summary and a data table.
- Keyboard: native controls, visible focus, tabs with arrow keys (WAI-ARIA tabs pattern).
- Phone: layout works from 320 px wide (REQ-32).

## Work blocks (4 iterations each, one opencode session per block)
1. Build. 2. Fix the review of 1. 3. Fix the review of 2. 4. Final polish and tests.
The session stays idle between iterations while the review is written; the next
iteration continues it with `opencode run -s <session>`.

| Block | Work | Serves |
| --- | --- | --- |
| B | Realign block A to `FORMATS.md`: CSV and Markdown readers, content loader with placeholder fallback, domain types and `attentionFor`, `AttentionBadge`, `Home` screen; remove the MVP-only parts (five systems, mission control role, green/yellow/orange story) | REQ-01, REQ-26, REQ-15, REQ-30 |
| C | `EntryStore`, outbox, `SyncClient`, `SyncStatus`, `Entry` screen | REQ-02, REQ-28 |
| D | `History` screen with `IndicatorChart` against the person's own earlier values; `IndicatorDetail` with the Markdown sections; service worker | REQ-12, REQ-28 |
| E | Playwright demo path with axe on every screen, phone viewport, screenshots and the 30 s recording | REQ-15, REQ-31, REQ-32 |
