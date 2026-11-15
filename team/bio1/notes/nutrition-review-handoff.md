# Handoff · nutrition indicator texts

For Bio 2's content review. Three files were added after the 05:30 review, so
they were not in it. They follow the same structure as the other nine.

Files:

- `config/content/appetite_1_5.md`
- `config/content/body_mass_kg.md`
- `config/content/fluid_intake_ml.md`

All three use only `no_data`, `in_range` and `outside_range`, because
`rules/attention.csv` has no rows for them yet. Each state closes with "Your CMO
or flight surgeon confirms." No label, no percentage, no diagnosis.

## appetite_1_5

Claims and where they come from:

| Claim | Source | Checked |
| --- | --- | --- |
| Crews often eat less than they need | Nutrition report, chapter 2 | Downloaded, text found: "astronauts in general still do not consume enough food to maintain body weight" |
| Appetite varies; in a Mir study 40% reported less appetite | Nutrition report, chapter 4 | Downloaded, text found: "40% of Mir crewmembers reported decreased appetite" |
| Food can taste different in flight | Nutrition report | Downloaded, text found: "Anecdotal reports exist of changes in the taste of foo[d]" |
| Nutrition matters for the mission | OCHMO food and nutrition technical brief | HTTP 200, application/pdf (content not read) |

## body_mass_kg

| Claim | Source | Checked |
| --- | --- | --- |
| Losing mass makes muscle, bone and heart loss worse | Nutrition report | Downloaded, text found: "Loss of body mass became problematic, exacerbating muscle and bone loss and cardiovascular decrements" |
| A normal scale does not work without gravity | Nutrition report, chapter 14 | Downloaded, text found: "Determination of 'weight' in weightlessness, however, presents some unique challenges" |
| The ISS has two devices, BMMD and SLAMMD | Nutrition report, chapter 14 | Downloaded, text found: "There are two devices on the ISS: a Body Mass Measurement Device, which uses spring oscillation, and a Space Linear Ac..." |
| Crews lose mass slowly over a mission | Nutrition report | Downloaded |

## fluid_intake_ml

| Claim | Source | Checked |
| --- | --- | --- |
| Water keeps blood volume and pressure stable | Nutrition report, chapter 5 | Downloaded, text found: "Adequate fluid intake is necessary to maintain the body's normal hemodynamic state" |
| Reduced fluid intake happens in flight | Nutrition report | Downloaded, text found: "Fluid shifts, in combination with reduced fluid intake..." |
| Dehydration makes you slower and less accurate | Nutrition report, references to a meta-analysis | Downloaded, text found: "Dehydration impairs cognitive performance: A meta-analysis" |
| Gravity and fluids | NASA HRP, 5 Hazards | Opened, five hazards page |

## Links that changed in this pass

The old nutrition link (`humanresearchroadmap.nasa.gov/Evidence/other/...`) was
replaced in four files by the one Bio 2 found:

`https://nasa.gov/wp-content/uploads/2023/03/human-adaptation-2020-final.pdf`

Checked: downloads a 135-page PDF titled "Human Adaptation to Spaceflight: The
Role of Food and Nutrition, Second Edition".

The OCHMO briefs return HTTP 200 and are PDFs. Their content was not read, so
they are listed as references, not as the basis of a claim.

## What Bio 2 needs to decide

1. Attention rows for the three indicators: how many levels, names, thresholds,
   `notify` and source. Without them `check_content.py --strict` reports three
   errors.
2. Whether the 40% Mir figure stays in the astronaut text or moves to a finding.
3. Plain-language pass on the three files.
