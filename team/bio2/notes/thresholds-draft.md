# Thresholds for `config/rules/attention.csv` (REQ-05)

Sat 14 Nov 17:30. The rows below are in the file. Ids come from
`config/data/indicators.csv` (Phys, 15:50).

## What this file holds

Only clinical boundaries that a source states, plus the rows marked
`Assumption` where the team has no source yet. The everyday states ("in your
usual range", "outside your usual range") come from the person's own baseline
(F-phys-02), not from this file. A row here means: this value is beyond a
published limit, so a person reviews it. Sleep and mood keep a `watch` row
marked `Assumption` so every indicator has at least one state.

## Rows

| indicator_id | side | threshold | level | notify | source |
| --- | --- | --- | --- | --- | --- |
| temp_core_c | below | 35 | urgent | flight_surgeon | NASA-STD-3001 Vol. 1 Rev. C |
| temp_core_c | above | 38 | consult | cmo | JSC 22538 Rev. F |
| hr_bpm | below | 50 | consult | cmo | Assumption |
| hr_bpm | above | 100 | consult | cmo | MedlinePlus, NIH |
| bp_sys_mmhg | above | 180 | urgent | flight_surgeon | WHO |
| bp_sys_mmhg | above | 140 | consult | cmo | WHO |
| bp_dia_mmhg | above | 120 | urgent | flight_surgeon | WHO |
| bp_dia_mmhg | above | 90 | consult | cmo | WHO |
| glucose_mgdl | above | 126 | consult | cmo | American Diabetes Association |
| glucose_mgdl | below | 70 | consult | cmo | American Diabetes Association |
| sleep_h | below | 6 | watch | crew | Assumption |
| mood_1_5 | below | 2 | watch | crew | Assumption |
| appetite_1_5 | below | 3 | watch | crew | Assumption |
| fluid_intake_ml | below | 2500 | watch | crew | OCHMO-TB-027 Rev C |
| body_mass_kg | below | 70 | watch | crew | Assumption |

The two blood-pressure steps are written most severe first. The frontend
returns the first matching rule, and `FORMATS.md` says the most severe rule
wins; the file order keeps both behaviours the same until the code applies the
rule from the format.

## Sources

- NASA-STD-3001 Volume 1, Revision C, **Appendix C (Definitions)**, p. 63 of
  86: normal body temperature is around 37 °C, and hypothermia is below 35 °C.
  The definition is in Appendix C, not Appendix A.
  https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf
- JSC 22538 Revision F, section 7.1.B: if temperature is measured, fever is
  100.4 °F (38.0 °C) or greater. It is a pre-launch screening document, so the
  number is used as the fever definition, not as an in-flight criterion.
  https://ntrs.nasa.gov/api/citations/20230012738/downloads/JSC%2022538%20Health%20Stabilization%20Program%20Rev%20F%20Clean.pdf
- MedlinePlus, NIH: a normal adult resting heart rate is 60 to 100 bpm; trained
  athletes can rest at 40 to 60. Over 100 is tachycardia and below 60 is
  bradycardia. https://medlineplus.gov/ency/article/003399.htm
- WHO, Hypertension: 140/90 mmHg or higher measured on two different days is
  hypertension; 180/120 mmHg or higher with symptoms needs care at once.
  https://www.who.int/news-room/fact-sheets/detail/hypertension
- American Diabetes Association, Diagnosis: fasting glucose of 126 mg/dL or
  higher is diabetes. https://diabetes.org/about-diabetes/diagnosis
- American Diabetes Association, Low blood glucose: below 70 mg/dL needs
  action. https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
- OCHMO Technical Brief 027 Rev C, Water, page 4: potable water for hydration,
  "Minimum 2.5 L (84.5 fl oz) per crewmember per day"; page 3: 2.5 L/day "for
  direct consummation and for rehydration of food", and the average intake on
  past programmes (2.0 to 2.3 L/day on ISS Expeditions).
  https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-027-water.pdf
- OCHMO Technical Brief 013 Rev E, Food and Nutrition, page 3: inadequate food
  and nutrition "has led to weight loss, bone and muscle loss"; page 12: waste
  system odours "caused a decrease in appetite" and "Control of SAS is
  essential for a healthy appetite". No appetite scale and no normal band.
  https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-013-food-and-nutrition.pdf
- Zwart et al., Body mass changes during long-duration spaceflight, Aviat Space
  Environ Med 85(9):897-904, 2014: mean loss of 2.8 % by SLAMMD and 4.4 % by
  BMMD in 25 crew members, and constant mass after the first 30 days; no fixed
  kg boundary. https://pubmed.ncbi.nlm.nih.gov/25197887/

## Why these choices

- **Heart rate below 50 is an Assumption.** A fit crew member can rest near 40,
  so the published bradycardia limit of 60 would fire on healthy people. The
  team can raise or remove this row once it has a flight-surgeon source.
- **Sleep below 6 h is an Assumption.** NASA-STD-3001 recommends an 8.5 h sleep
  period, but that is a planned opportunity, not an observed cut-off.
- **Mood below 2 is an Assumption.** The team defined the scale as 1 = very
  low to 5 = very good (`FORMATS.md`, Sat 16:10). The row only fires on the
  lowest answer.
- **Fever is a pre-launch definition.** It is the only source-backed fever
  number in the repository, and the interface must say that a clinician
  confirms.
- **Hypothermia is a definition, not an in-flight rule.** NASA states the
  boundary, not an operational alert. The app uses it because it is published,
  and sends the case to the flight surgeon.
- **Appetite below 3 is an Assumption.** The 1 to 5 scale is ours
  (`FORMATS.md`, Sun 06:50); the food and nutrition brief gives no appetite
  scale and no normal band. The row fires on the two lowest answers ("very low"
  and "low") and asks the crew to repeat the question the next day and check
  fluid intake. The baseline still catches a slow drift on its own.
- **Fluid intake below 2500 mL is the requirement, not a clinical alert.**
  NASA-STD-3001 Volume 2 requires at least 2.5 L (2500 mL) of potable water per
  crew member per day for drinking and for rehydrating food, which is exactly
  what `fluid_intake_ml` counts. The same brief records 2.0 to 2.3 L/day as the
  average intake on ISS Expeditions, so the row fires on an ordinary day and
  only asks the crew to drink and to keep logging. A CMO step below it has no
  source, so it is not written.
- **Body mass below 70 kg is a stand-in, not a limit.** No source gives a fixed
  kg boundary. Zwart et al. report a mean in-flight loss of 2.8 % measured with
  SLAMMD and 4.4 % with the BMMD, and body mass that stays constant after the
  first 30 days. A percentage of the person's own pre-mission mass is what the
  study supports, and `rules/attention.csv` can only hold an absolute value in
  the indicator unit. 70 kg is about 3 % below the 72.3 kg the demo astronaut
  starts at, inside the loss the study reports. The row needs a percentage of
  the pre-mission mass once the app stores that value (code change, Eng 1), and
  until then it fires too late for a small crew member and too early for a
  heavy one.

## Open points for the team

1. **Blood pressure is two indicators.** The clinical rule is "systolic at
   least 140 **or** diastolic at least 90". Two independent rows cannot say
   "or". The app must take the worse state of the two, or a combined indicator
   must be added. Decision for Eng 1 and Bio 1, then a row in
   `docs/DECISIONS.md`.
2. **The frontend comparison is strict.** It uses `value > threshold` and
   `value < threshold`, so exactly 140 mmHg or 38.0 °C does not trigger. The
   team must decide whether to use `>=` / `<=` or a threshold one decimal below
   the published value.
3. **The first matching rule wins in the frontend.** `FORMATS.md` says the most
   severe rule wins. The file is ordered severe first, but the code should
   follow the format.
4. **Every row notifies a person, never a diagnosis.** The probability of a
   condition lives in `config/rules/conditions.csv`, not here.
