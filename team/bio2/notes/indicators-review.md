# Review of `config/data/indicators.csv` (Bio 2, REQ-10)

Sat 14 Nov 17:50, after the `cp2` merge. Read-only review: the file belongs to
Phys. `python3 scripts/check_content.py` reports 0 errors; the 7 warnings are
the missing content files, which are Bio 1's.

## 1. `glucose_mgdl` can meet REQ-03: the analysis in flight exists

`measured_on_board` says "No in-flight device in the sources read; manual entry
only", and that is not accurate: the ISS carries a point-of-care blood
analyser.

- The ISS uses the **Abbott i-STAT 1** as its current blood analyser, and the
  cartridges take a capillary or venous sample with no preparation. The NTRS
  slide names it as the "Current ISS Technology Level".
  https://ntrs.nasa.gov/api/citations/20150012223/downloads/20150012223.pdf
- Glucose is one of the analytes. The FDA decision summary for the CG8+
  cartridge says glucose is measured amperometrically from whole blood,
  including capillary blood.
  https://www.accessdata.fda.gov/cdrh_docs/reviews/K223710.pdf
- The flight validation study: "Assessment of a portable clinical blood analyzer
  during space flight", Clinical Chemistry, 1997. It measured glucose among the
  analytes and agreed with laboratory methods.
  https://doi.org/10.1093/clinchem/43.6.1056

What this changes: the indicator is measurable on board, so REQ-03 is
satisfiable. What it does not change: it is a **fingerstick with a cartridge,
not continuous monitoring**, so a value arrives only when the crew takes a
sample, and the app must say so. Phys's row needs the source above instead of
`Assumption`, and `docs/DECISIONS.md` still says glucose is tier C ("never an
input").

## 2. Two blood-pressure ids cannot express the clinical rule

`bp_sys_mmhg` and `bp_dia_mmhg` are separate indicators, and
`config/rules/attention.csv` evaluates one indicator at a time. Every clinical
source states the rule across both numbers ("stage 2 if systolic at least 140
**or** diastolic at least 90"). Two independent rows cannot say "or".

Needs a decision with Eng 1 and Bio 1, and it goes in `docs/DECISIONS.md`:
either the app takes the worse state of the two, or a combined indicator is
added. Without it, a person with 120/95 gets the state of systolic only.

## 3. The mood scale is defined; sleep quality is gone

`FORMATS.md` now defines `mood_1_5` as 1 = very low, 2 = low, 3 = neutral,
4 = good, 5 = very good, answered before sleep (team decision, Sat 16:10). The
old `sleep_quality_1_5` row is no longer in `indicators.csv`. The mood boundary
in `attention.csv` is still `Assumption`, because no source states a cut-off on
this scale.

## 4. The ids are in `FORMATS.md` section 2

Section 2 now lists the seven ids, their units, directions, tiers and systems.
The checker can compare units across files.

## 5. The ids carry units

`hr_bpm`, `temp_core_c`, `glucose_mgdl`. It is explicit and readable, and it
works. The cost: if a unit changes, the id is wrong, and the id also names Bio
1's content file. Keeping it is fine if nobody changes a unit; it is worth one
line in `docs/DECISIONS.md` so the next person does not rename anything.

## 6. `spo2_pct` is no longer in the list

The earlier review asked for a source for its cut-off. Phys removed the
indicator, so no row is needed and the question is closed.

## What is done and correct

- One row per indicator, no duplicates, `direction` is `higher`, `lower` or
  `both` in every row.
- `min_spread`, `tier` and `system` are filled and use the allowed values.
- `hazards` uses only the five allowed names.
- Every row has a `source`, and the one with no source says `Assumption`.
- The set covers the six examples of the statement (heart rate, blood
  pressure, glucose, temperature, sleep, mood).

## What I cannot change

`config/data/indicators.csv` and `docs/DECISIONS.md` are Phys's and Eng 1's
files. The glucose row still says there is no in-flight device and tier C; the
sources above are for whoever updates those two files.
