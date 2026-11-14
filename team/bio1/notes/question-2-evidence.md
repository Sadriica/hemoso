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
| Body temperature (`body_temperature`) | A fever is often the first sign that the body is fighting an infection, and infections happen more often in orbit. | Risk of Altered Immune System Responses: https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/ · Human Research Roadmap, immune risk: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 | One sentence is an Assumption: see below |
| Sleep hours (`sleep_hours`) | Crews sleep about 6 hours a night in flight. Short sleep over weeks lowers attention, mood and how the body uses energy. | Human Research Roadmap, sleep risk: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100 | Clear |
| Mood (`mood`) | Isolation and confinement wear down mood. Changes in mood are an early sign of a behavioural health problem, and NASA uses questionnaires and journaling to catch them early. | Hazard: Isolation and Confinement: https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ · Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/ | Clear |

## The one Assumption

The immune pages say that infections and rashes happen in orbit, and that crews
may be more susceptible to disease. They do not say that a raised temperature is
the sign to watch. The sentence "a fever is often the first sign of an
infection" is general clinical practice, not a statement from those pages. It
goes in the content marked `Assumption`, and Bio 2 sees it in the review
(REQ-10).

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
