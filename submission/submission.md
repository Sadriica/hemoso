# Submission page · text of every field (T-12)

Draft, Sun 15 Nov 03:00. Owner: Bio 2. Everything here is in English, as the
submission guide requires. Items marked **TODO** need a person or a link that
does not exist yet.

## Project title

HeMoSo · a health monitor for astronauts

## One-line summary

HeMoSo reads each astronaut's own measurements, compares them with that
person's history and with sourced clinical limits, and says in plain words what
to do next and who should know.

HeMoSo helps you assess your own health. Your CMO and the flight surgeon confirm
every decision.

## The problem

A crew member on a long mission cannot walk into a clinic. Care today depends
on a flight surgeon on the ground, and the further the mission goes, the longer
the delay. NASA's own research says crews must be able to assess their own
health and act on what they see. The challenge asks exactly that: a tool where
an astronaut records health indicators and understands the result.

## What HeMoSo does

- Records a measurement per indicator (heart rate, both blood pressures, core
  temperature, blood glucose, sleep hours, mood, reaction time and lapses,
  appetite, fluid intake and body mass).
- Compares each reading with the person's own earlier readings, not with a
  population range: compared with the person's own recent readings, in a moving
  window.
- Compares it again with published clinical limits, each one with its source.
- Returns one of four states in plain words: no data yet, in your usual range,
  outside your usual range, or needs review, and names who acts: the crew, the
  crew medical officer on board, or the flight surgeon on the ground.
- Shows the next step for that state, written for someone who is not a doctor,
  for all twelve indicators.
- Suggests possible conditions as an evidence score with the signals behind it,
  never as a percentage and never as a certainty. The crew medical officer or
  the flight surgeon confirms.
- Readings are saved on the device without a connection and sent when the link
  returns, with a notice while the app is offline.
- Uses synthetic data only, labelled in the interface.

## Tools and stack

- **Frontend:** React 19, TypeScript, Vite 8, three.js for the 3D body, plain CSS.
- **Backend:** Python 3.13, FastAPI, Pydantic, uvicorn; PostgreSQL on Supabase for
  storage; the API runs on a container host; the frontend on Vercel.
- **Tests and checks:** Vitest and Playwright for the interface, pytest and ruff
  for the API, and a content check (`scripts/check_content.py`) that validates
  every CSV and every page of text before a merge.
- **Data files:** four plain CSV/Markdown files that a biologist can edit without
  touching code; no external AI service runs inside the product.

## What is not in the demo yet

Each of these is designed and written in the repository, and none of them is
shown as working:

- Symptoms as a second kind of evidence, with red flags that escalate at once
  (`config/data/symptoms.csv`, task T-78). Waiting for the checker and the data.
- The app reopening with no network. A service worker is not part of this build.
- Face and eye analysis for fatigue, stress and sleep. The camera today only
  signs a crew member in; it does not read affect.
- Learning from each person's records beyond the moving window above.

## How it works

The app reads four plain CSV/Markdown files, so a biologist can change the
content without touching code:

| File | What it holds |
| --- | --- |
| `config/data/indicators.csv` | the indicators, unit, direction, how each is measured in flight, and the instrument |
| `config/rules/attention.csv` | the clinical or assumed limits: indicator, side, threshold, level, who is notified, source |
| `config/rules/conditions.csv` | the possible conditions and the signals each rests on (with their side) |
| `config/content/<indicator>.md` | the text the astronaut reads: why it matters, how spaceflight affects it, steps, status and next step |

Two rules make the result reproducible and explainable:

1. **A sourced limit never needs a history.** A core temperature of 39.5 °C is
   a review on the first day of a mission.
2. **The baseline answers a different question.** Inside or outside the
   person's usual range comes from the median of their readings over the moving
   window and three spreads, so one bad reading does not move the reference.

## NASA data and resources used

- NASA Human Research Program, the five hazards: gravity fields, isolation and
  confinement, hostile closed environments, radiation, distance from Earth.
  https://www.nasa.gov/hrp/hazards/
- NASA HRP, Risks of Human Spaceflight: https://www.nasa.gov/hrp/risks/
- NASA Spaceflight Standard Measures (actigraphy, sleep and mood
  questionnaires): https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/
- NASA, Wearable Tech for Space Station Research (T-Mini core temperature,
  Actiwatch): https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/
- CSA Bio-Monitor (heart rate, blood pressure, oxygen saturation):
  https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
- NASA-STD-3001 Volume 1, Revision C (monitoring and trending, limits relative
  to pre-mission values): https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf
- JSC 22538 Rev F, Health Stabilization Program (fever defined as 100.4 °F):
  https://ntrs.nasa.gov/api/citations/20230012738/downloads/JSC%2022538%20Health%20Stabilization%20Program%20Rev%20F%20Clean.pdf
- NASA, In-Situ Laboratory Analysis Capability (point-of-care blood analysis in
  flight): https://ntrs.nasa.gov/citations/20230006919
- Assessment of a portable clinical blood analyzer during space flight,
  Clinical Chemistry 1997: https://pubmed.ncbi.nlm.nih.gov/9191561/
- NASA HRP Nutrition Evidence Report 2020 (fluid intake, renal stone risk):
  https://nasa.gov/wp-content/uploads/2023/03/human-adaptation-2020-final.pdf

Other sources, each one opened before use, are listed with the value taken and
the file where it is used in `docs/sources.md`: WHO (hypertension), American
Heart Association (resting heart rate), American Diabetes Association
(glucose), ESA and Stahn et al. 2017 (core temperature in flight), Nasrini et
al. 2020 (psychomotor vigilance in the HERA analog).

## Third-party code and assets

Every library is listed with its licence and the reason it is there in
`docs/DECISIONS.md`. They are MIT, Apache-2.0 or ISC. No image or video was
generated with AI, so none carries a watermark, and no NASA logo, flag or
mission identifier appears in the interface.

All four links are in the Links section below.

## AI (SI) use

The idea and the design decisions are the team's own, from Wambi's base idea.
AI tools helped with reading and summarising sources, drafting text, and
writing code with tests. Every use is recorded per card in `SI-USE.md`, in the
repository, with the files produced and who reviewed them. No AI service runs
inside the product: everything it computes runs on the device.

**TODO:** confirm the wording with the team, and add the exact sentence the
submission page asks for.

## The five judging criteria

**Impact.** A crew member on a long mission cannot wait for Earth. HeMoSo turns
a measurement into a next step and names who to tell, in the minutes that
matter. It is built for the moment when the flight surgeon is 20 minutes away.

**Creativity.** The comparison is with the person, not the population: median
and spread of that astronaut's own readings. On the same screen, published
clinical limits still apply on day one, before any history exists. The state
names who acts, not just how bad it looks.

**Validity.** Every threshold is either a link to a NASA, WHO, AHA or ADA
document, or the word Assumption in the file, visible in the interface. The
attention file cannot be written with an untraceable number: `scripts/check_content.py`
rejects a row with no source, a non-monotonic escalation, or an unknown
indicator. The rule that a sourced limit wins over the baseline is written in a
finding with test vectors.

**Relevance.** The indicators are the six the challenge names, with blood
pressure read as two numbers, plus the reaction check and the three nutrition
signals. Each one is measured with hardware that exists on the ISS today. The
rules answer the five questions the statement asks per indicator:
how it is measured, why it matters, how spaceflight affects it, when it needs
attention and what prevents a problem.

**Presentation.** Three phases, one screen each: identify, report, status. Each
indicator has its own instrument and a state that is readable by shape and
word, not only by colour, and the whole path works with the keyboard. The
repository, the app and the demo are in English.

## Links

- Repository: https://github.com/Sadriica/hemoso
- Live app: https://www.hemoso.space/
- Demo (video 30 s): https://youtu.be/MsjzAZ2Txwc · length 0:29, checked Sun 15 Nov 12:10
- Team: https://www.spaceappschallenge.org/2026/find-a-team/tardis2/

## Team

| Name | Role |
| --- | --- |
| Sofía Ruiz Tamayo | Bio 1 · health content and pitch |
| Camila Restrepo Arango | Bio 2 · rules, thresholds and submission |
| Isabella Cabrera Quintero | Phys · data, NASA sources and measurement |
| Santiago Rodríguez Mojica (Wambi) | Eng 1 · integrator, backend and requirements |
| Julián David Mejía Otálvaro (Juli) | Eng 2 · frontend and demo |

Names as registered on the Members tab of the ReTardis page.
