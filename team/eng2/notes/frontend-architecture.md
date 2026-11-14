# Frontend architecture (Eng 2)

How the frontend implements the team's MVP baseline document (Wambi, 12 Nov).
The backend (FastAPI, Eng 1) computes baselines, sustained deviations, alert
levels and related situations (MVP 9). The frontend only shows them, collects
routine measurements and never recomputes health logic. Content comes from
`config/` in the formats of `team/eng2/notes/formats-proposal.md` until
`FORMATS.md` is agreed.

## Layers
| Folder | Holds |
| --- | --- |
| `src/api/types.ts` | Response and request types. Hand-written now to match `docs/CONTRACTS.md` and `docs/API.md` (Eng 1); replaced by types generated with `openapi-typescript` once the backend exposes OpenAPI (MVP 8.3) |
| `src/api/client.ts` | `ApiClient` interface; `HttpClient` (local FastAPI, `VITE_API_BASE_URL`) and `MockClient` (synthetic demo story, no server). `createClient()` picks `MockClient` when the variable is empty, so the Vercel demo works without a backend |
| `src/api/mock/` | The synthetic story of MVP 4.2 as fixed snapshots per mission day. Texts copied from the MVP document, sources `Assumption` until `related.csv` exists |
| `src/strings.ts` | Every text on screen, in English (MVP 8.2) |
| `src/components/` | `LevelBadge`, `BodyFigure`, `SystemPanel`, `BaselineChart`, `CardView`, `RoutineStep`, `SourceList`, `SyntheticNotice` |
| `src/screens/` | `AstronautHome` (body figure + panel), `Cards`, `Routine`, `MissionControl` |
| `src/App.tsx` | Role and screen switcher, mission day and environment bar |

Rules:
- Screens get data only through `ApiClient`; no `fetch` elsewhere.
- No health logic in the frontend: levels, deviations and "related" come from the API.
- No path routes (static hosting): screens switch with React state, shown as tabs.
- Mission time is "day N" everywhere, never a calendar date (STANDARDS.md 4).

## API the frontend expects (to agree with Eng 1)
| Call | Returns | Used by |
| --- | --- | --- |
| `GET /crew` | Crew ids and labels | Role and person picker |
| `GET /mission` | Environment, current day, phase | Top bar |
| `GET /crew/{id}/status?day=N` | Level per system, worst level, alert (4 parts), prevention per system | Body figure, panel |
| `GET /crew/{id}/series/{signal}?to=N` | Daily values plus baseline median and band | Baseline chart |
| `GET /cards` and `GET /cards/{indicator}` | Card index and card Markdown | Cards screen |
| `GET /routines/{routine}` | Steps with instructions and seconds | Routine screen |
| `POST /crew/{id}/measurements` | The stored measurements | Routine screen |
| `GET /mission-control/status?day=N` | Fitness per person only, no medical detail (MVP-06) | Mission control |
| `POST /link/sync` | Simulated link with Earth (MVP 2.2) | "Send to ground" button |

## Core types (`src/api/types.ts`)
```ts
type Level = 'green' | 'yellow' | 'orange'
type SystemId = 'heart' | 'immune' | 'mood_sleep' | 'metabolism' | 'bone_muscle'
type Fitness = 'fit' | 'fit_with_restrictions' | 'not_fit'
type Source = { title: string; url: string } | 'Assumption'

interface Alert {                       // MVP 3.1, always these four parts in this order
  whatChanged: string
  usuallyRelated: { situation: string; sources: Source[] }[]   // at most 3, no percentages
  whatToCheck: string
  whatToDo: string
  escalation: string                    // the exact condition that alerts the flight surgeon
}

interface SystemStatus {
  system: SystemId
  level: Level
  changedSignals: string[]
  alert?: Alert                         // present when level is yellow or orange
  prevention?: { text: string; sources: Source[] }   // present when green (MVP-14)
}

interface CrewStatus {
  crewId: string
  day: number
  phase: string
  environment: 'ship' | 'station' | 'rover' | 'base'
  worstLevel: Level
  systems: SystemStatus[]
  streakDays: number
}

interface SeriesPoint { day: number; value: number | null; median: number; low: number; high: number }
```

## Accessibility (REQ-15, MVP 3.4)
- Every level shows colour + icon + text: `Green · OK`, `Yellow · Watch`, `Orange · Needs attention`.
- Every system on the body figure shows its written name and is a button reachable by keyboard.
- Charts have a text summary and a data table next to them.
- Visible focus outline; text contrast at least 4.5:1.

## Health content rules
- Words from MVP 3.2: "what changed", "usually related"; never "diagnosis", "you have X", percentages, "predicts".
- Guidance names who to involve and never replaces the flight surgeon or the CMO.
- Synthetic data notice always visible (REQ-14).

## Testing
- Vitest + Testing Library: every component, the mock client and the content checks of `formats-proposal.md` section 4.
- Playwright (`@playwright/test`) + `@axe-core/playwright`: the demo script of MVP 11.2, screenshots at 1280 × 800.

## Work blocks (4 iterations each, in one opencode session per block)
1. Build. 2. Fix the review of 1. 3. Fix the review of 2. 4. Final polish and tests.
Between iterations the session stays open and idle while the review is written;
the next iteration continues the same session (`opencode run -s <session>`), so
it keeps the context of the block.
| Block | Work | Serves |
| --- | --- | --- |
| A | API types, `MockClient` with the day 14, 22, 41 and 42 snapshots, `HttpClient`, `strings.ts`, `LevelBadge`, app shell with role, day and environment bar | MVP-02, MVP-07, REQ-13, REQ-15 |
| B | `BodyFigure` (own SVG, 5 systems) and `SystemPanel` (4 parts, prevention in green) | MVP-10, MVP-11, MVP-14, REQ-01 |
| C | `BaselineChart`, `Cards` screen, `Routine` screen with step instructions and entry | MVP-12, MVP-13, REQ-02, REQ-12 |
| D | `MissionControl` view, streak and weekly goal, Playwright demo path with axe | MVP-06, REQ-15, REQ-17 |
