# Elena demo texts · draft

Status: draft for Bio 1. Not product content yet. Lives in `team/bio1/notes/`
until `config/data/indicators.csv` and `config/rules/attention.csv` exist.

Purpose: write the texts the jury reads on screen during the four demo moments,
in the shape the frontend already uses (`whatChanged`, `usuallyRelated`,
`whatToCheck`, `whatToDo`, `escalation`), so they can move to
`config/content/<indicator_id>.md` without rewriting.

## What this is and what it is not

- It is the story text for two systems: `heart` and `immune`.
- It is not a diagnosis. Conditions are suggested, never confirmed, and the CMO
  or flight surgeon decides.
- Every level and every `notify` value is a placeholder until Bio 2 publishes
  `config/rules/attention.csv`.
- The day numbers follow the team plan: 22, 41, 42 and 46. The frontend mock
  currently uses 14, 22, 41 and 42; day 14 is not in this draft.

## The four moments

| Day | Level | System | What the astronaut sees |
| --- | --- | --- | --- |
| 22 | green | heart | One high reading, normal trend, no action |
| 41 | yellow | heart, immune | Three days outside the usual range, crew review |
| 42 | orange | heart, immune | Fever and sore throat, flight surgeon notified |
| 46 | green | heart, immune | Back in the usual range, keep the routine |

## Day 22 · green · isolated heart-rate spike

### heart

- **whatChanged:** One resting heart rate reading was above your usual range at
  14:10.
- **usuallyRelated:** A single reading after activity, a warm module or a short
  night. Assumption.
- **whatToCheck:** Rest 10 minutes and measure again.
- **whatToDo:** No action today. HeMoSo keeps watching your 7-day trend.
- **escalation:** No one is notified.
- **notify:** none (green)

### immune · prevention

- Keep your sleep schedule. Report any sore throat, rash or new pain.
  Assumption.

## Day 41 · yellow · three days outside the usual range

### heart

- **whatChanged:** Resting heart rate has been above your usual range for 3
  days. HRV has been below it.
- **usuallyRelated:** A mild infection is possible. Probability and basis
  pending (Bio 2). Poor sleep and low fluid intake can also raise it.
- **whatToCheck:** Core temperature, sore throat and sleep hours.
- **whatToDo:** Repeat the evening routine. Answer the two questions.
- **escalation:** Your CMO is notified on board. No link to Earth is needed.
- **notify:** crew (placeholder)

### immune

- **whatChanged:** Skin temperature has been above your usual range for 3 days.
- **usuallyRelated:** A mild infection is possible. Probability and basis
  pending (Bio 2). A warm module or a blanket can also raise skin temperature.
- **whatToCheck:** Measure core temperature twice today.
- **whatToDo:** Rest, drink water and repeat the measurement tonight.
- **escalation:** Your CMO is notified on board.
- **notify:** crew (placeholder)

## Day 42 · orange · fever and sore throat

### heart

- **whatChanged:** Resting heart rate is far above your usual range and HRV is
  low.
- **usuallyRelated:** A mild infection is possible. Probability and basis
  pending (Bio 2). Dehydration can also do this.
- **whatToCheck:** Core temperature, sore throat, fluid intake and urine color.
- **whatToDo:** Tell your CMO today. Rest and drink water.
- **escalation:** The flight surgeon is notified at the next link.
- **notify:** flight_surgeon (placeholder)

### immune

- **whatChanged:** Fever of 38.5 °C and sore throat. Core and skin temperature
  are above your usual range.
- **usuallyRelated:** A mild infection is possible. Probability and basis
  pending (Bio 2).
- **whatToCheck:** Repeat temperature in 4 hours. Note any new symptom.
- **whatToDo:** Rest, drink water and tell your CMO today.
- **escalation:** The flight surgeon is notified at the next link.
- **notify:** flight_surgeon (placeholder)

## Day 46 · green · recovery

### heart

- **whatChanged:** Resting heart rate and HRV are back within your usual range
  for 3 days.
- **whatToDo:** Keep the routine. Measure at the same hour.
- **notify:** none (green)

### immune

- **whatChanged:** Core and skin temperature are back within your usual range.
  No new symptom.
- **whatToDo:** Keep the routine.
- **notify:** none (green)

## How this maps to `config/content/<indicator_id>.md`

| Draft field | Section in the content file |
| --- | --- |
| whatChanged | `## Status and next steps`, under the `### <level>` heading |
| whatToDo | `## Status and next steps`, under the same heading |
| escalation | `## Status and next steps`, under the same heading, or the `notify` value |
| whatToCheck | `## Status and next steps` (no field today) |
| usuallyRelated | no field today; the frontend expects it |
| prevention | `## How to prevent problems` |

The format captures two of the five fields. `whatToCheck`, `usuallyRelated`
and the escalation text have no place in `FORMATS.md` yet. Either the format
adds them or the frontend stops expecting them.

## Pending before this becomes product content

- [ ] Indicator ids, from `config/data/indicators.csv` (Phys).
- [ ] Attention level names, from `config/rules/attention.csv` (Bio 2).
- [ ] `notify` value for each level (Bio 2).
- [ ] Probability and basis for every suggested condition (Bio 2).
- [ ] Decide one id vocabulary: the frontend uses `resting_hr`, Phys uses
      `hr_bpm`.
- [ ] Add `system` to `indicators.csv` or define the indicator-to-system map.
- [ ] Confirm day 46 in the demo and in the frontend mock.
- [ ] One source of truth for these texts: `config/` or the frontend mock.

## Sources

- NASA Human Research Program, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA Human Research Program, 5 Hazards of Human Spaceflight: https://www.nasa.gov/hrp/hazards/
- NASA Human Research Program, Ongoing HRP Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
- Canadian Space Agency, Why do we conduct science experiments in space?: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

## Why the sources support this story

- The heart changes in weightlessness: the HRP risks page says weightlessness
  alters blood circulation and how the heart and blood vessels work, and can
  raise the risk of cardiovascular events. https://www.nasa.gov/hrp/risks/
- Infection and skin: the same page says the stresses of spaceflight can wake
  inactive viruses and cause rashes and other symptoms. https://www.nasa.gov/hrp/risks/
- Sleep: the same page names chronic sleep loss and irregular schedules as
  stressors. https://www.nasa.gov/hrp/risks/
- Long missions: the CSA page lists more time in weightlessness, more
  radiation, isolation, communication delay and less reliance on Earth for
  emergency medical help. https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- Hazards combine: the hazards page states that the five hazards can feed off
  one another. https://www.nasa.gov/hrp/hazards/
- Fluid pressure and eyes: the ongoing research page lists Brain Fluid
  Pressure, Thigh Cuff and Venous Haemostasis studies. https://www.nasa.gov/hrp/ongoing-hrp-research/
