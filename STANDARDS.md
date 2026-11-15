# Project standards

Shared conventions so that five people and their agents produce work that looks
like it came from one team. `FORMATS.md` (written Saturday) covers the files the
solution reads; this file covers everything else.

## 1. Findings (how a biologist presents what they found)

Every piece of research that may change the solution becomes one finding file:
`docs/findings/<person>-<nn>-<short-slug>.md`, for example
`docs/findings/bio1-03-sleep-duration-in-flight.md`. One finding, one claim, one
page at most. Use the template in `docs/findings/TEMPLATE.md` and the
`report-finding` skill.

| Part | Rule |
| --- | --- |
| Title | `F-<person>-<nn> · <the claim in a few words>` |
| Status | `Draft` → `Reviewed` (by another biologist) → `In product` (used in `config/`) |
| Claim | One sentence, with a number and unit when there is one |
| Evidence | Table of sources: what each says (short quote), type, link |
| Confidence | `High`: NASA source, or two peer-reviewed sources that agree · `Medium`: one peer-reviewed source · `Low`: no direct source (it is an Assumption) |
| What it changes | The exact file and value in the solution, or "nothing yet" |
| Limits | What it does not show; open questions |

A finding with `Low` confidence can still go into the product, but the value in
`config/` is marked `Assumption`.

## 2. Status message in the team chat

Before each checkpoint and at each shift change, one line per person:

```
[bio1] ready · done: 3 (T-21, T-22, F-bio1-01) · next: T-24 · blocked: none
```

Format: `[branch] ready · done: … · next: … · blocked: …`. The same text goes
into `team/<person>/README.md`.

## 3. Units and numbers
- SI units and their symbols: bpm, ms, °C, %, h, min, mmHg, mg/dL, cm, kg.
- Decimal point, not comma: `38.5 °C`, not `38,5 °C`.
- A space between number and unit: `56 bpm`, `38.0 °C`, `30 %`.
- Ranges with "to" in text (`56 to 60 bpm`) and with an en dash in tables (`56–60`).
- Report the precision the source gives; do not add decimals.

## 4. Dates and times
- Mission time is always "day N" (`day 41`), never a calendar date.
- Clock times in 24-hour format in files (`13:30`); event days as `Sat 14`, `Sun 15`.
- Log entries use local Medellín time.

## 5. Glossary (use these words, always the same way)
| Term | Meaning |
| --- | --- |
| flight surgeon | The physician on Earth who follows the crew |
| CMO | Crew medical officer: the crew member with medical training on board |
| mission control | Operations team on Earth |
| Assumption | A value or statement with no direct source yet |
| GMT | Station time: the ISS clock runs on Greenwich Mean Time; the app shows times as GMT. https://ntrs.nasa.gov/citations/20240002094 |
| Flight Day (FD) | The day number of a crew member's flight ("FD 14"), used on the ISS too; the product's "day N". https://www.nasa.gov/blogs/stationreport/2013/06/12/iss-daily-summary-report-06-12-13/ |
| Post-sleep | The morning block of the crew day, right after waking. https://www.nasa.gov/wp-content/uploads/2014/06/061314_tl.pdf |
| Pre-sleep | The evening block of the crew day, before bed. https://www.nasa.gov/wp-content/uploads/2014/06/061314_tl.pdf |
| PHS | Periodic Health Status: the routine on-board health check. https://www.nasa.gov/blogs/stationreport/2020/10/01/iss-daily-summary-report-10-01-2020/ |
| PMC | Private Medical Conference: the private call between a crew member and the flight surgeon. https://ntrs.nasa.gov/api/citations/20080010877/downloads/20080010877.pdf |
| CHeCS | Crew Health Care System: the station's medical system. https://www.nasa.gov/blogs/stationreport/2023/09/12/iss-daily-summary-report-9-12-2023/ |
| ARED, T2, CEVIS | The ISS exercise devices: weight machine, treadmill, exercise bike. https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ |
| Increment | A crew rotation period on the ISS. https://www.nasa.gov/blogs/stationreport/2021/04/12/iss-daily-summary-report-4-12-2021/ |

In the interface a NASA term is the label and the plain words are its helper
("Post-sleep · on waking"), so a person new to the station still reads it.
Not NASA terms, kept in plain words: "rest" and "after exercise" (NASA writes
"post-exercise" only for hygiene after a workout). MET (Mission Elapsed Time)
belongs to Artemis and the Shuttle, not the ISS, so the product does not use it.

The team adds the solution's own terms here on Saturday, once they exist.

Words we do not use in the product: "you have" before a condition, disease
(as a label for the astronaut), certain or confirmed for a suggested condition, AI.
A suggested condition always comes with its probability, what it is based on and
"your CMO or flight surgeon confirms".

## 6. Citations
- In content files and findings: `- <Title>: <link>` under `## Sources`.
- In tables: the link alone, several separated by a space.
- Every source also goes into `docs/sources.md` (kept by Phys).

## 7. Files and names
- Folder and file names in lowercase with hyphens or underscores, no spaces or accents.
- Identifiers exactly as in `FORMATS.md`.
- Markdown for documents; headings in sentence case ("Measurement steps", not "Measurement Steps").
