# Review of `config/data/indicators.csv` (Bio 2, REQ-10)

Sat 14 Nov 15:55. Read-only review: the file belongs to Phys. `python3
scripts/check_content.py` reports 0 errors; the 9 warnings are the missing
content files, which are Bio 1's.

The file is usable as it stands. Six points, in order of risk.

## 1. `glucose_mgdl` can meet REQ-03: the analysis in flight exists

Correction to my first review. `measured_on_board` says "No in-flight device in
the sources read; manual entry only", and that is not accurate: the ISS carries
a point-of-care blood analyser.

- The ISS has used the **i-STAT Portable Clinical Blood Analyzer (PCBA)** since
  the early 2000s: a drop of blood of about 65 µL on a cartridge, and glucose is
  read by amperometry. The current station technology level is the Abbott
  i-STAT.
  https://academic.oup.com/milmed/article-pdf/169/8/631/21977888/milmed.169.8.631.pdf
  https://ntrs.nasa.gov/api/citations/20230006919/downloads/ELA_AsMA_2023_v4.pdf
- The flight validation study: "Assessment of a portable clinical blood analyzer
  during space flight", Clinical Chemistry, 1997.
  https://pubmed.ncbi.nlm.nih.gov/9191561/

What this changes: the indicator is measurable on board, so REQ-03 is
satisfiable. What it does not change: it is a **fingerstick with a cartridge,
not continuous monitoring**, so a value arrives only when the crew takes a
sample, and the app must say so. Phys's row needs the source above instead of
`Assumption`.

## 2. Two blood-pressure ids cannot express the clinical rule

`systolic_bp` and `diastolic_bp` are separate indicators, and
`config/rules/attention.csv` evaluates one indicator at a time. Every clinical
source states the rule across both numbers ("stage 2 if systolic at least 140
**or** diastolic at least 90"). Two independent rows cannot say "or".

Needs a decision with Eng 1 and Bio 1, and it goes in `docs/DECISIONS.md`:
either the app takes the worse state of the two, or a combined indicator is
added. Without it, a person with 120/95 gets the state of systolic only.

## 3. The 1–5 scales are not defined

`sleep_quality_1_5` and `mood_1_5` have unit `1 to 5`. `FORMATS.md` asks every
non-SI indicator for "its range and what each end means". Nothing in the
repository says what 1 and 5 are yet, so Bio 1 cannot write the questionnaire
and I cannot write a boundary.

## 4. The ids are not in `FORMATS.md` section 2 yet

Section 2 is the summary every file reads against, and it is still empty. While
it is empty the checker cannot compare units across files, so a typo in a unit
reaches the app. Eng 1 writes section 2.

## 5. The ids carry units

`hr_bpm`, `temp_core_c`, `glucose_mgdl`. It is explicit and readable, and it
works. The cost: if a unit changes, the id is wrong, and the id also names Bio
1's content file. Keeping it is fine if nobody changes a unit; it is worth one
line in `docs/DECISIONS.md` so the next person does not rename anything.

## 6. `spo2_pct` has no boundary source yet

The indicator is well chosen: lower is worse, and a drop is one of the few
in-flight signs that matters fast. But no source in the repository states the
cut-off. It is the first indicator where I need a clinical source I have not
found yet.

## What is done and correct

- One row per indicator, no duplicates, `direction` is `higher`, `lower` or
  `both` in every row.
- `hazards` uses only the five allowed names.
- Every row has a `source`, and the one with no source says `Assumption`.
- The set covers the six examples of the statement (heart rate, blood
  pressure, glucose, temperature, sleep, mood) plus oxygen saturation and sleep
  quality. Nothing in the statement is missing.
