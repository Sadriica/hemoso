# F-bio1-01 · each tracked indicator has a source for why it matters

**Status:** Draft
**Owner:** bio1
**Date:** Sat 14, 16:10
**Reviewed by:** <bio2, once reviewed>

## Claim

Each of the five indicators HeMoSo tracks has a NASA source that names the
in-flight problem it is meant to catch, so `## Why it matters` is written with a
link and no Assumption. Body temperature also has a stronger reason, the space
fever, in F-bio1-02.

## Evidence

| Indicator | Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- | --- |
| Heart rate | Risk of Cardiovascular Adaptations | "potentially leading to blood clots, heart arrythmias, cardiovascular disease, and low blood pressure" | NASA | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ |
| Heart rate, blood pressure | Risks of Human Spaceflight | "Weightlessness alters blood circulation and how the heart and blood vessels function, potentially increasing the risk of cardiovascular events." | NASA | https://www.nasa.gov/hrp/risks/ |
| Blood pressure | Risk of Cardiovascular Adaptations | "low blood pressure which elevates the chances of fainting at landing" | NASA | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ |
| Body temperature | Risk of Altered Immune System Responses | "Some astronauts aboard the International Space Station have reported cold sores, rashes, atypical allergies, and infections" | NASA | https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/ |
| Body temperature | Human Research Roadmap, immune risk | "On-orbit clinical issues believed related to persistent immune dysregulation include increased incidence of skin rashes, various infectious processes" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 |
| Sleep hours | Human Research Roadmap, sleep risk | "There is evidence of sleep deficiency inflight as crews sleep 6 h/night" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100 |
| Sleep hours | Human Research Roadmap, sleep risk | "these risk factors cause short-term performance, mood, psychosocial, and metabolic decrements" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100 |
| Mood | Risks of Human Spaceflight | "Isolation, radiation, distance from Earth, and other intense space stressors may all take a toll on the mental health of the crew." | NASA | https://www.nasa.gov/hrp/risks/ |
| Mood | Hazard: Isolation and Confinement | "Sleep loss, circadian desynchronization, and work overload compound this issue and may lead to decreased performance, adverse health outcomes" | NASA | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ |

## Confidence

High, because every row is a NASA page opened on Sat 14 and quoted in its own
words. Body temperature has a second, stronger source in F-bio1-02 (ESA and one
peer-reviewed study), and no sentence in `## Why it matters` needs an
Assumption.

## What it changes in the solution

- `config/content/resting_heart_rate.md`, `blood_pressure.md`, `sleep_hours.md`
  and `mood.md`: `## Why it matters` written with a link, no Assumption.
- `config/content/body_temperature.md`: the reason is the space fever in
  F-bio1-02 (+1 °C at rest, sourced). The sentence "a fever is often the first
  sign of an infection" moves to the advice in `## Status and next steps`, where
  it is marked `Assumption`.
- The indicator list can be closed on question 2 without guessing: an indicator
  that fails this test leaves the list, with its row in `docs/DECISIONS.md`.

## Limits and open questions

- The pages name the problem, not a threshold. "When does a result need
  attention" is still the gap (REQ-05): no in-flight heart-rate, blood-pressure,
  temperature, sleep or mood cut-off appears in these pages.
- The pages say nothing about how each value is measured on board; that is
  Phys's row in `config/data/indicators.csv` (REQ-03).
- Crews sleeping 6 h per night is what the sleep page reports, not a target and
  not a threshold.
- Body temperature: the NASA immune pages support "infections happen in orbit",
  not a temperature threshold. The 1 °C rise is ESA and one peer-reviewed study
  (F-bio1-02), so the source for that number is not NASA.
- Blood glucose and bone density: no page read gives reason and in-flight method
  together. Neither is in the five.
