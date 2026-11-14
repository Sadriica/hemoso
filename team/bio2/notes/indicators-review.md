# Review of `config/data/indicators.csv` (Bio 2, REQ-10)

Sat 14 Nov 15:55. Read-only review: the file belongs to Phys. `python3
scripts/check_content.py` reports 0 errors; the 9 warnings are the missing
content files, which are Bio 1's.

The file is usable as it stands. Six points, in order of risk.

## 1. `glucose_mgdl` cannot meet REQ-03 as written

`measured_on_board` says "No in-flight device in the sources read; manual entry
only" and `source` is `Assumption`. REQ-03 closes when every indicator is
"confirmed measurable on board with a source". As it stands, one of the nine
fails that check in front of a judge.

Two ways out: find a source for an in-flight glucose measurement (blood
analyser on the ISS, or a partner agency device), or keep the indicator and say
in `docs/DECISIONS.md` why it stays with `Assumption`. The second is honest but
must be written down, not left implicit.

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
