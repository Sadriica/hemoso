# F-bio1-02 · core temperature rises about 1 °C in space

**Status:** Draft
**Owner:** bio1
**Date:** Sat 14, 17:35
**Reviewed by:** <bio2, once reviewed>

## Claim

Core body temperature at rest rises by about 1.01 °C during long-duration
spaceflight, stays there after 75 days, and returns to baseline slowly after
landing, so a body-temperature threshold for astronauts cannot use the Earth
value of 37 °C.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Stahn et al., Increased core body temperature in astronauts during long-duration space missions, Scientific Reports 7:16180 (2017), open access | "At rest CBT was increased by about 1.01 °C on the ISS compared to baseline" | peer-reviewed | https://www.nature.com/articles/s41598-017-15560-w |
| Same paper | "reaching a plateau after 75 days of spaceflight, and only returned slowly to baseline during the recovery" | peer-reviewed | https://www.nature.com/articles/s41598-017-15560-w |
| Same paper | "maximal CBT during exercise increased significantly in space on average by 1.39 °C ... even exceeded 40 °C in some individuals" | peer-reviewed | https://www.nature.com/articles/s41598-017-15560-w |
| Same paper | "Since even minor increases in CBT can impair physical and cognitive performance, both findings have a considerable impact on astronauts' health and well-being" | peer-reviewed | https://www.nature.com/articles/s41598-017-15560-w |
| ESA, Space fever (archive content, 13 May 2015) | "an astronaut's temperature rises by 1ºC during the first two months and stays there until it drops back to normal on return to Earth" | agency article | https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Space_fever |
| ESA, Space fever | "Raising body temperature by a degree requires 20% more energy, derived from food" | agency article | https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Research/Space_fever |

## Confidence

Medium, because the finding rests on one peer-reviewed study of 11 astronauts;
the ESA article describes the same result but is not peer-reviewed, and no NASA
page read for this project states the 1 °C rise.

## What it changes in the solution

- `config/content/body_temperature.md`, `## Why it matters`: the reason becomes
  the space fever itself, sourced, and the sentence "a fever is often the first
  sign of an infection" leaves `## Why it matters` (it stays as advice, marked
  Assumption, in `## Status and next steps`).
- `config/rules/attention.csv` (Bio 2, REQ-05): the body-temperature threshold
  is set against the astronaut's in-flight baseline, never a fixed 37 °C. This
  is the first indicator where the Earth range is demonstrably wrong.
- `config/data/indicators.csv` (Phys, REQ-03): the measurement is core
  temperature (heat-flux forehead sensor, T-Mini), not skin temperature; the
  study measured core temperature with a forehead heat-flux sensor.
- `team/bio1/notes/status-texts.md`: "your usual range" is the correct
  comparison for every text, not a fixed number.

## Limits and open questions

- 11 astronauts, one study, 2017. The cause is not settled: the authors list
  inflammation, exercise, radiation and stress as candidates.
- No attention threshold is given. The paper does not say when 1 °C becomes
  dangerous; that is still Bio 2's question.
- Exercise peaks above 40 °C in some crew happened during a test protocol, not
  at rest. The app measures at rest.
- The ESA article is archived content from 2015 and exists in a Spanish version
  translated by the agency, so the English page is the one cited.
- A NASA source on this specific result was not found in the pages read; the
  NASA immune pages support "infections happen in orbit", not the 1 °C rise.
