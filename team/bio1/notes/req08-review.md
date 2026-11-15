# REQ-08 review · the seven content files

REQ-08 asks for simple instructions, numbered steps, one action per sentence and
no assumed expertise, and it is done when Bio 2 has reviewed every text for plain
language. This note records the pass Bio 1 did on the seven files in
`config/content/` before handing them to Bio 2.

## What changed

| File | Change |
| --- | --- |
| `hr_bpm.md` | Prevention split into four short sentences (exercise, diet, fluids, garment) |
| `bp_sys_mmhg.md` | Steps 4 and 5 became four steps: measure once, wait, measure again, write the top number |
| `bp_dia_mmhg.md` | Same change, and "write the bottom number" |
| `temp_core_c.md` | "Weightlessness" became "in space"; prevention split into three sentences |
| `sleep_h.md` | "Circadian misalignment" became "your body clock shifts"; last step split in two |
| `mood_1_5.md` | "Behavioural health problem" became "mental health problem"; prevention split |
| `glucose_mgdl.md` | "Glucose metabolism" became "the body handles sugar"; hand-washing became two steps |

## Words left on purpose

- **baseline**: it is the word the app uses everywhere and NASA's own term. The
  first time it appears, the file explains it with the indicator itself.
- **CMO**: the crew medical officer on board. The astronaut works with this
  person every day.
- **sensor**, **cuff**, **meter**, **compression garment**: names of the things
  the crew actually uses. They are concrete, not clinical.

## What Bio 2 should check

1. Read each text aloud. Any sentence that needs a second breath is too long.
2. Every numbered step starts with an action, not with a fact.
3. No sentence asks the astronaut to know a number, a unit or a term that the
   screen does not show.
4. `Assumption` appears where the advice is the team's own, not NASA's.
5. Nothing says "you have" and no file names a condition.

## What is still open

- The three `###` headings per file are provisional until `rules/attention.csv`
  exists (Bio 2, REQ-05).
- The measurement steps for temperature, sleep and glucose describe a method
  Phys has not confirmed (REQ-03); they carry `Assumption` until then.
- Glucose is the weakest file: the reason is sourced, the in-flight measurement
  is not.
