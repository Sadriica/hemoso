# Content draft · resting heart rate (REQ-04 pilot)

Draft for `config/content/resting_heart_rate.md`. Lives in `team/bio1/notes/`
until `config/data/indicators.csv` publishes the id (Phys). Then the file is
copied to `config/content/` and `python scripts/check_content.py` checks it.

The headings and their order are the ones in `FORMATS.md` §3. Nothing outside
those headings goes in the product file.

## The five questions in this one file

| Question in the statement | Answer in this file | Owner of the answer |
| --- | --- | --- |
| 1. Can it be measured in space, and how? | `## Measurement steps`, plus `measured_on_board` and `unit` in `data/indicators.csv` | Phys (REQ-03); Bio 1 writes the steps |
| 2. Why is it needed? | `## Why it matters` | Bio 1 (REQ-04), sourced in F-bio1-01 |
| 3. How do the hazards affect it? | `## How spaceflight affects it` | Bio 1 from Phys's findings (REQ-07) |
| 4. When does a result need attention? | `## Status and next steps` + `rules/attention.csv` | Bio 2 (REQ-05); Bio 1 writes the texts |
| 5. What prevents a critical condition? | `## How to prevent problems` + `rules/conditions.csv` | Bio 1 from Bio 2's findings (REQ-06) |

That table is the answer to "assembled in one place": one file, five answers,
and the app shows them together in the indicator view.

## Draft

```markdown
# Resting heart rate

## Why it matters

Resting heart rate shows how hard your heart works when you are still. In space
the heart and blood vessels change, and the crew can get heart rhythm problems,
blood clots and low blood pressure.

## How spaceflight affects it

Fluids move from your legs to your head and chest, and your heart changes shape.
When you come back to gravity you may feel lightheaded, and some astronauts
faint. Sleep loss and stress raise your resting heart rate too.

## Measurement steps

1. Sit still for 5 minutes.
2. Put the sensor on as your CMO showed you. Assumption.
3. Measure for one minute. Assumption.
4. Write the number in HeMoSo.

## Status and next steps

### at_baseline

Your resting heart rate is at your baseline today.

No action today. Measure again at the same hour tomorrow.

No one is notified for now.

### outside_baseline

Your resting heart rate has been above your baseline for 3 days.

Rest 10 minutes and measure again. Check your temperature, how you slept last
night and your fluid intake. Assumption.

Your CMO is notified on board.

### needs_flight_surgeon

Your resting heart rate is far above your baseline and today it is still high.

Tell your CMO today. Rest, drink fluids and measure again in 2 hours. Assumption.

Your CMO tells the flight surgeon at the next link with Earth.

## How to prevent problems

Exercise every day and eat well. Drink fluids before landing and wear the
compression garment when your CMO asks. Assumption.

## Sources

- Risk of Cardiovascular Adaptations: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- Hazard: Gravity Fields: https://www.nasa.gov/hrp/hazard-gravity-fields/
- Hazard: Isolation and Confinement: https://www.nasa.gov/hrp/hazard-isolation-and-confinement/
- Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
```

## What is still open in this draft

- **Id and unit**: `resting_heart_rate` and `beats/min` are proposals. Phys sets
  both (REQ-03).
- **Measurement steps**: steps 2 and 3 are generic on purpose. The in-flight
  method (ECG, chest strap or Bio-Monitor) and its exact steps are Phys's, and
  the text cannot describe a device the team has not chosen.
- **Prevention**: the cardiovascular page names exercise, diet, lower-body
  compression and fluids before landing. It says nothing about when, so the
  sentence carries `Assumption`.
- **Attention levels and thresholds**: Bio 2 (`attention.csv`). The three
  headings here are placeholders.
- **Conditions**: `conditions.csv` is Bio 2's; nothing in this file names a
  condition.

## Check before it moves to config/

- [ ] `id` in `data/indicators.csv` matches the file name.
- [ ] Every `###` heading is an `attention_level` in `rules/attention.csv`.
- [ ] `python scripts/check_content.py` runs with no error for this file.
- [ ] Bio 2 has read it for plain language (REQ-08) and sources (REQ-10).
