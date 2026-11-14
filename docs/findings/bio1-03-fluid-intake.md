# F-bio1-03 · fluid intake belongs in the tracked indicators

**Status:** Draft
**Owner:** bio1
**Date:** Sat 14, 18:05
**Reviewed by:** <phys and bio2, once reviewed>

## Claim

Fluid intake belongs in the indicators HeMoSo tracks: in-flight intake is
typically below the NASA recommendation of more than 2000 ml per day, and low
intake raises the risk of dehydration and kidney stones.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| NASA, Human Adaptation to Spaceflight: The Role of Nutrition (2020), p11 | "Fluid 1 – 1.5 ml/kcal ... 32 mL/kg body weight >2000 ml ... Women: > 2100 ml Men: > 2500 ml" | NASA | https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf |
| Same report, p33 | "Fluid intake during flight is typically less than preflight intake, and often below the recommended quantity" | NASA | same link |
| Same report, p33 | "Inadequate fluid intake increases the risk of dehydration and renal stone formation" | NASA | same link |
| Same report, p32 | "Adequate fluid intake must be assured to maintain hydration and reduce renal stone risk" | NASA | same link |
| Same report, p38 | "fluid intakes above 32 ml/kg were associated with urinary calcium concentrations below the threshold concentration for precipitation" | NASA | same link |

## Confidence

High, because every row is the NASA nutrition evidence report, and the numbers
were read on pages 11, 32, 33 and 38.

## What it changes in the solution

- `config/data/indicators.csv`: a sixth row, `fluid_intake`, unit `ml`,
  direction `lower`, measured on board by the astronaut entering the volume
  drunk (self-report). Phys owns the row (REQ-03).
- `config/content/fluid_intake.md`: new file with the five questions. The reason
  comes from this finding; the rest of the file follows the shape of the other
  five.
- `config/rules/attention.csv`: the first indicator whose rule comes from a
  published requirement, not from a clinical threshold: below 2000 ml per day is
  the candidate row, and the report also gives sex-specific values (2100 ml for
  women, 2500 ml for men). Bio 2 decides (REQ-05).
- `team/bio1/notes/status-texts.md`: the texts for the sixth indicator. This one
  compares against a recommendation, not against a personal baseline.
- `docs/DECISIONS.md`: the indicator list goes from five to six (Wambi).

## Limits and open questions

- The intake is self-reported; nothing measures it. The app can only show what
  the astronaut enters.
- The 2000 ml figure is a nutrition recommendation for a healthy crew, not a
  clinical alert. Crossing it is not an emergency by itself.
- The report gives three forms: 1 to 1.5 ml/kcal, 32 ml/kg, and >2000 ml/day.
  A crew member eating more calories has a higher target, so a fixed number is
  a simplification.
- Sex-specific values exist (2100 ml women, 2500 ml men). Using them is more
  accurate and needs a `sex` field the app does not have; ask Wambi before
  promising it.
- Dehydration and kidney stones are the documented risks. Nothing here says how
  many days below the target become urgent.
