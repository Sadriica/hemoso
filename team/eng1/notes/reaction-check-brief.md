# Brief: reaction check (REQ-38, T-71) — v2, Sat 23:25

For Wambi's frontend agent. Team decision Sat 22:41 (docs/DECISIONS.md);
method and numbers from Phys (T-72, branch phys, commit c02f42a).

```text
Build the reaction check in the frontend (card T-71, REQ-38). The team chose it;
the indicators, thresholds and texts belong to Phys, Bio 2 and Bio 1. You build
only the screen, the timing and the saving. Talk to Wambi in Spanish; write
code, commits and docs in English.

SETUP
- Worktree from origin/main: git worktree add ../hemoso-reaction -b eng1-reaction origin/main
- Then merge origin/phys into it (it has the two indicator ids and the demo data;
  it may already be in main when you start: check first).
- Read: AGENTS.md, FORMATS.md (indicators table, rows reaction_*), frontend/DESIGN.md,
  docs/DECISIONS.md (rows "Reaction check" and "Current psychological state"),
  frontend/src/phases/ReportPhase.tsx, frontend/src/screens/Entry.tsx,
  frontend/src/screens/entryDraft.ts (readingRows), frontend/src/data/entryStore.ts.

FIXED NUMBERS (from Phys, NASA Reaction Self Test; put them in ONE constants file)
- Duration: 3 minutes of trials (also a 30-second DEMO length, behind a clearly
  named constant, used only by the demo path and e2e).
- Random wait before each stimulus: 2 to 10 s (uniform).
- A press before the stimulus = false start: count it, show "Too early", restart
  that wait. False starts are not saved as an indicator.
- A trial above 500 ms = lapse. No answer within 500 ms still waits up to 2 s,
  then counts as a lapse and moves on.
- Valid trials: 100 ms or more (below that is a false start).
- Result: reaction_median_ms = median of valid trials (ms, integer);
  reaction_lapses = count of trials above 500 ms.

IMPORTANT: indicators.csv drives readingRows(). Once phys is merged the two
reaction ids would appear as fields to type by hand. Exclude them from the typed
rows (by system neuro_behavioural or an explicit list of the two ids, in one
place, with a test) and fill them only from the check.

WHAT TO BUILD
1. An optional "Reaction check" block in the report phase, after the readings,
   that never blocks "See my status" and can be skipped in one action.
2. Before starting, the person picks LIGHT (default) or SOUND. Sound uses a Web
   Audio oscillator (about 1 kHz, 150 ms, no audio file); create/resume the
   AudioContext from the Start button (user gesture).
3. During the test: one large test area. Answer by tap/click anywhere on it or
   the space bar. Measure with performance.now() from the stimulus to the
   answer. Show a progress bar of the time left. Escape stops and discards.
4. At the end: "Median reaction: 312 ms · Lapses: 1" in plain words, then save
   two entries through the existing entry store/outbox with the same mission
   day, time and context as the rest of the report. Offline: it waits in the
   outbox like any other reading.
5. The status phase already shows any indicator; check that the two appear with
   their icon (add a glyph for neuro_behavioural in the icon set) and history.
6. If the two ids are not in indicators.csv, the block is hidden, never an error.

NOT IN THIS CARD
- The "current psychological state" panel. It comes from the conditions route
  (GET /people/{id}/conditions), which the frontend does not show yet (REQ-06).
  Do not build it here; Wambi opens a separate card.
- No wording of your own about health, mood or mental state: use plain neutral
  labels and leave the explanatory texts to config/content/ (Bio 1).

RULES
- Accessibility (REQ-15): keyboard and touch, visible focus, light mode changes
  shape and size (not only colour), sound mode shows a visible cue too, labels
  for screen readers ("Wait", "Now", "Too early"), Escape always works.
- No flashing faster than 3 per second. Reduced motion: the stimulus appears
  without animation and the test still works.
- No new dependency. Do not touch backend/, config/ or docs other than
  FORMATS.md if needed; STOP and ask Wambi first for anything outside frontend/.
- Tests: unit tests for the timing logic with an injected clock and random
  source (median, lapses, false starts, under-100 ms, the 2 s timeout), a
  component test (keyboard run with fake timers), the readingRows exclusion,
  and one e2e that runs the DEMO length by keyboard and checks two saved
  entries. Keep lint, test, build and e2e green.
- Commits with (#71), no mention of AI. One row per finished step in
  team/eng1/notes/si-use-log.md; tell Wambi before touching it.
- When green: push eng1-reaction and tell Wambi to open the PR into eng1.

First message to Wambi, in Spanish, three lines: what you read, your plan in
steps, and anything that blocks you.
```
