# Draft for `config/rules/attention.csv` (REQ-05) · real ids

Sat 14 Nov 16:00. Ids copied from `config/data/indicators.csv` (Phys, 15:50).
Ready to transcribe when the team confirms the approach below.

## What changed after F-phys-01 and F-phys-02

Phys found that no NASA source sets in-flight cut-offs, and proposed that the
app compare each reading with the crew member's own baseline (median and 3
spreads). In that design the everyday states ("in your usual range", "outside
your usual range") come from the baseline, **not from this file**.

So this file holds only **clinical boundaries that a source states**. A row
here means: this value is beyond a published limit, so a person reviews it. The
mild steps I had drafted (37.5 °C, 120 bpm) are gone: they were my invention,
the baseline already covers them, and they would have shown a "watch" for a
value that is normal for that crew member.

Consequence: only `consult` and `urgent` are used. `watch` stays defined in
`team/bio2/notes/attention-levels.md` and is unused until a source states a mild
limit.

## Rows

| indicator_id | side | threshold | level | notify | source |
| --- | --- | --- | --- | --- | --- |
| temp_core_c | above | 38.0 | consult | cmo | JSC 22538 |
| temp_core_c | below | 36.0 | consult | cmo | Assumption |
| hr_bpm | above | 100 | consult | cmo | AHA |
| hr_bpm | below | 50 | consult | cmo | Assumption |
| bp_sys_mmhg | above | 140 | consult | cmo | WHO |
| bp_sys_mmhg | above | 180 | urgent | flight_surgeon | WHO |
| bp_dia_mmhg | above | 90 | consult | cmo | WHO |
| bp_dia_mmhg | above | 120 | urgent | flight_surgeon | WHO |
| glucose_mgdl | above | 126 | consult | cmo | ADA |
| glucose_mgdl | below | 70 | consult | cmo | Assumption |

Links (the `source` cell holds the link, not the label):

- JSC 22538 Rev F, Flight Crew Health Stabilization Program: fever is 100.4 °F
  (38.0 °C) or more. It is a pre-launch document, so the number is used as the
  fever definition, not as an in-flight criterion.
  https://ntrs.nasa.gov/api/citations/20230012738/downloads/JSC%2022538%20Health%20Stabilization%20Program%20Rev%20F%20Clean.pdf
- AHA: resting heart rate 60–100 bpm; over 100 is tachycardia, under 60 is
  bradycardia, and fit adults rest near 40.
  https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse
- WHO: hypertension is 140/90 mmHg or higher measured on two different days;
  values of 180/120 or higher with symptoms need care at once.
  https://www.who.int/news-room/fact-sheets/detail/hypertension
- ADA: fasting glucose under 100 is normal, 100–125 prediabetes, 126 or more on
  a second test is diabetes. https://diabetes.org/about-diabetes/diagnosis

## Rows I did not write, and why

| indicator_id | Why no row |
| --- | --- |
| `sleep_h` | NASA defines sleep disturbance as under 8 h, but it is a description of the finding, not a limit that triggers a review. The baseline covers the change; a source-stated review limit does not exist |
| `mood_1_5` | The 1–5 scale is not defined yet, and a self-report does not trigger a medical review by itself |

## Before this goes into the file

1. **Blood pressure**: two rows per number cannot express the clinical "or". A
   person with 120/95 must reach the diastolic state. Decision needed from Eng 1
   and Bio 1; recorded in `docs/DECISIONS.md` (see
   `team/bio2/notes/indicators-review.md` point 2).
2. **Fever in microgravity**: 38.0 °C comes from a pre-launch programme. The
   interface must show the source and that a clinician confirms, never "you have
   a fever".
3. **`hr_bpm` below 50**: fit crew members rest near 40, so this row can fire on
   a healthy person. Either raise it or accept it and say why in the LOG.
4. **Every row notifies a person, never a diagnosis.** The probability of a
   condition lives in `config/rules/conditions.csv`, not here.
