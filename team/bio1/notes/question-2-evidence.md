# Question 2 evidence · why each indicator is needed

Working table for `## Why it matters` in `config/content/<indicator_id>.md`
(REQ-04). Every link was opened on Sat 14 between 15:45 and 16:10. The finding
that carries this to the team is `docs/findings/bio1-01-question-2-sources.md`.

The ids are proposals: they change if `config/data/indicators.csv` (Phys,
REQ-03) uses another name. The reason does not change with the name.

| Indicator (proposed id) | Plain-language reason, first draft | Source opened | Status |
| --- | --- | --- | --- |
| Resting heart rate (`resting_heart_rate`) | Resting heart rate shows how hard your heart works when you are still. In space the heart and blood vessels change, and the crew can get rhythm problems, blood clots and low blood pressure. | Risk of Cardiovascular Adaptations: https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ | Clear |
| Blood pressure (`blood_pressure`) | Blood pressure shows how your body copes with gravity. In flight the readings change, and low blood pressure after landing can make astronauts faint. | Same page: "low blood pressure which elevates the chances of fainting at landing"; Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/ | Clear |
| Body temperature (`body_temperature`) | Body temperature at rest goes up about 1 °C in space and stays higher after 2 to 3 months. This mild, constant fever costs about 20% more energy. | Stahn et al. 2017: https://www.nature.com/articles/s41598-017-15560-w · ESA, Space fever: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Space_fever | Sourced (F-bio1-02) |
| Sleep hours (`sleep_hours`) | Crews sleep about 6 hours a night in flight. Short sleep over weeks lowers attention, mood and how the body uses energy. | Human Research Roadmap, sleep risk: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100 | Clear |
| Mood (`mood`) | Isolation and confinement wear down mood. Changes in mood are an early sign of a behavioural health problem, and NASA uses questionnaires and journaling to catch them early. | Hazard: Isolation and Confinement: https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ · Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/ | Clear |

## The temperature question, settled

The first draft said "a fever is often the first sign of an infection", which
the NASA immune pages do not say. The ESA article and the 2017 study behind it
give a better and sourced reason: body temperature rises about 1 °C in flight
and stays there (F-bio1-02). That reason goes in `## Why it matters`.

The infection sentence is still useful as advice, not as the reason: it moves to
`## Status and next steps`, marked `Assumption`.

## What this table does not cover

- **How each indicator is measured in flight**: Phys, REQ-03.
- **When a reading needs attention**: Bio 2, REQ-05. None of these pages gives an
  in-flight threshold.
- **Blood glucose and bone density**: no pair of "reason + in-flight method" was
  found for either. Glucose stays out unless Phys finds a source for measuring
  it on board; bone density has no in-flight measurement system (OCHMO-TB-030,
  p20).

## Next step

Copy the reason of each row into `## Why it matters` of its content file, one
sentence per line, with the link under `## Sources`. Rewrite the draft sentence
if it reads like a translation: the astronaut reads it on a screen, in a hurry.
