# Brief: reaction check and current psychological state (REQ-38, T-71)

For Wambi's frontend agent. Branch `eng1-reaction` from `main`, worktree.
Team decision Sat 14 Nov 22:41 (Wambi with Bio 2), recorded in
docs/DECISIONS.md. Talk with Wambi in Spanish; everything you write is in
English.

```text
Build the reaction check in the frontend (card T-71, REQ-38). The team chose it
from the mentor's notes: a short test where the astronaut answers a light or a
sound as fast as possible. You build only this; the idea, the indicators, the
thresholds and the texts belong to the team (Phys T-72, Bio 2 T-73, Bio 1 T-74).

Read first: AGENTS.md, FORMATS.md (indicators, attention, conditions, content),
frontend/DESIGN.md (Observatory), docs/DECISIONS.md (rows "Reaction check" and
"Current psychological state"), the three-phase flow (frontend/src/phases/),
the entry store and outbox (frontend/src/data/), and how the report phase saves
an entry.

WHAT TO BUILD
1. An optional step inside the report phase: "Reaction check", after the
   readings and before "See my status". It can be skipped in one action and the
   demo path must not wait for it.
2. The astronaut picks LIGHT or SOUND before starting (light is the default;
   sound needs a user gesture to start the Web Audio context, so start it from
   the Start button).
3. The test: a fixed number of trials or a fixed duration (take the numbers
   from Phys's finding for T-72; until it lands, use a constant in one file,
   clearly named, so it changes in one place). Before each stimulus a random
   wait; the stimulus is a light (a large shape that appears) or a short tone
   (Web Audio oscillator, no audio file). The answer is a tap anywhere on the
   test area or the space bar. Measure with performance.now().
   - An answer before the stimulus is a false start: count it, show "Too
     early", restart that trial's wait.
   - No answer within the lapse cut-off counts as a lapse (cut-off from Phys).
4. At the end, compute the median reaction time (ms) and the number of lapses,
   show them in plain words ("Median reaction: 312 ms · Lapses: 1"), and save
   them as two entries through the existing entry store and outbox, with the
   current mission day, time and the reading context. The indicator ids come
   from config/data/indicators.csv (Phys adds them in T-72); until they exist,
   the step is hidden, never a crash.
5. The status phase shows the two indicators like the others (icon, instrument,
   state, history). The current psychological state appears through the
   conditions route as an evidence score with its signals (REQ-06), worded as
   how the person is today: never a label, a disorder, a percentage or a
   diagnosis, and always with "Your CMO or flight surgeon confirms".

RULES
- Offline: nothing needs the network; the result waits in the outbox.
- Accessibility (REQ-15): keyboard (space bar) and touch, visible focus, light
  mode never relies on colour alone (shape and size change), sound mode has a
  visible cue for people who cannot hear it, and the whole test can be stopped
  with Escape. No flashing faster than 3 times per second (photosensitivity).
- Reduced motion: the stimulus appears without animation; the test still works.
- No new dependency. No images or video of people. No health wording of your
  own: the texts come from config/content/ (Bio 1).
- Tests: unit tests for the timing logic with a fake clock (median, lapses,
  false starts), a component test, and one e2e test that takes the test by
  keyboard. Keep lint, test, build and e2e green.
- Git and logs as in AGENTS.md: branch eng1-reaction, commits with (#<card>),
  no mention of AI, one row per finished step in team/eng1/notes/si-use-log.md
  (tell Wambi; do not leave it uncommitted in the shared copy).
- STOP and ask Wambi if you need a file outside frontend/, a new dependency, or
  a behaviour this brief does not describe.

First message to Wambi, in Spanish, three lines: what you read, your plan in
steps, and what you need from Phys before you can finish.
```
