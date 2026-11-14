# F-phys-01 · Compare each crew member with their own baseline, not with fixed ranges

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 12:10
**Reviewed by:** _pending_

## Claim

No NASA source we read sets in-flight cut-offs for heart rate, blood pressure,
temperature, sleep hours or mood; the limits NASA does publish are relative to the
crew member's own pre-mission values (aerobic capacity at or above 80 %, bone
mineral density at or above 95 %), so a monitoring tool can only compare a reading
with that person's own baseline and must cite any other limit it shows.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| NASA-STD-3001 Vol 1 Rev C | Permissible outcome limits are percentages of pre-mission values; no heart-rate, blood-pressure, temperature, sleep-hour or mood cut-off is set | NASA | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf |
| HRP, Risks of human spaceflight | The 17 risk pages describe what changes and what protects the crew; none gives a clinical threshold | NASA | https://www.nasa.gov/hrp/risks/ |
| Cardiovascular evidence report (2022) | In-flight heart rate and blood pressure were lower than preflight and rose past baseline at re-entry; no in-flight attention values are given | NASA | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf |
| WHO, Hypertension (25 Sep 2025) | Hypertension is 140/90 mmHg or higher measured on two different days, and diagnosis is made by a health professional; very high values (180/120 or higher) with symptoms need care at once | Reference | https://www.who.int/news-room/fact-sheets/detail/hypertension |
| Wearable tech for space station research | Instruments record the value (T-Mini core temperature, Actiwatch motion and light); no accuracy or normal range is published | NASA | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |

The PDF values are quoted in `team/eng1/notes/challenge-resources.md`; re-check the
page before any of them goes into `config/`.

## Confidence

Medium, because the claim rests on the sources we read (the five challenge
resources, four evidence reports, NASA-STD-3001 and its technical briefs), and
absence in those is not proof that NASA's internal flight rules contain no cut-offs.

## What it changes in the solution

- `config/data/reference-bands.csv`: every row carries `basis` =
  `baseline` | `clinical` | `assumption`, plus its source. No row without one.
- The status vocabulary: "in your usual range", "outside your usual range",
  "needs review by the CMO". Never "normal", "abnormal" or a risk percentage.
- `docs/DECISIONS.md`, section "Indicators we chose": the comparison basis is part
  of the choice, not an implementation detail.

## Limits and open questions

- It says nothing about which indicators to choose. It only constrains how they
  may be compared.
- A clinical limit such as 140/90 mmHg comes from an Earth adult population and
  was not validated in microgravity. If we show it, we show who says it and that
  it triggers a review, not a diagnosis.
- The baseline needs a definition the team agrees on: the first 7 days of a
  mission, a rolling 14-day window, or the pre-mission medical exam.
- What would raise the confidence: a flight surgeon's public statement of in-flight
  monitoring rules, or an OCHMO brief that lists them.
