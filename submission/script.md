# Pitch script · two minutes

**Status:** draft · **Owner:** Bio 1 · Sat 14, 23:30 · read aloud three times
before Sun 14:00 (REQ-35)

For the mentors on Sunday at 14:00. Spoken, not read: short sentences, one idea
each, and the app on screen during the story. 279 spoken words, timed to 2:00 at a
conversation pace with the demo on screen.

Language: English. Question 2 for the Medellín lead (the language of the
presentation) is still open; if the mentors prefer Spanish, this is the text to
translate, not to rewrite.

## Demo format (REQ-17)

Chosen on Sat 14 at 19:45: **a video of 30 seconds or less**, with English
subtitles, hosted outside Space Apps. It is the only demo format; there is no
slide deck.

Why the video: its structure is in `submission/video.md`, and it does not depend
on the app answering live. The limit is hard, and the subtitles are burned in,
so a judge who watches without sound still understands it.

## The line that never changes (REQ-11)

> HeMoSo helps you assess your own health. Your CMO and the flight surgeon
> confirm every decision.

The same words go in three places:

| Place | Who puts it there |
| --- | --- |
| The app, in the status view | Eng 2 (REQ-01) |
| This script, spoken at 1:17 | Bio 1 |
| The submission page description | Bio 2 (REQ-34) |

It is one sentence on purpose. A disclaimer that takes ten seconds to say is a
disclaimer nobody hears.

## The story (REQ-21)

| Time | Beat | What is on screen |
| --- | --- | --- |
| 0:00–0:18 | The problem, with a NASA source | The app, idle |
| 0:18–0:28 | Who uses it, and when | The app, status |
| 0:28–0:42 | What the ISS measures today | `config/data/indicators.csv`, the instrument column |
| 0:42–1:17 | One astronaut, two readings, one decision (the same scene as the video) | Report with 38.5 °C and the pulse, then the fever evidence board |
| 1:17–1:30 | What it does not do | The status card, the CMO line |
| 1:30–1:50 | Why you can trust what it says | `config/rules/attention.csv`, the temperature row with its link |
| 1:50–2:00 | Maturity and next step | The team |

### 0:00–0:18 · The problem

On a long mission, there is no hospital. NASA's Human Research Program says
weightlessness changes how the heart and blood vessels work, and crews report
rashes and infections in orbit. A crew medical officer is on board, a flight
surgeon on Earth. Neither can watch everyone.

### 0:18–0:28 · Who uses it, and when

HeMoSo is for the astronaut, between contacts with Earth. A daily check, compared
with that person's own usual range, so a change shows while it is small.

### 0:28–0:42 · What the ISS measures today

We build on instruments NASA documents on the station. Glucose from the i-STAT analyser. Core temperature
from the T-Mini headband. Sleep from the Actiwatch. Body mass from SLAMMD.
Reaction time from a check adapted from the ISS Reaction Self Test.

### 0:42–1:17 · The story

Elena logs two readings: a core temperature of 38.5 °C and a fast resting pulse.
HeMoSo compares both with her own usual range. The temperature also crosses a
limit with a NASA source, so it needs review. The evidence board shows fever as
possible, 0.75 of 1, with its two signals and that source. The next step is plain:
tell the CMO on board today.

### 1:17–1:30 · What it does not do

HeMoSo does not diagnose. It shows a probability and its basis, and it names who
confirms: your CMO or the flight surgeon. The decision is theirs.

### 1:30–1:50 · Why you can trust what it says

A limit with a source is checked before the person's own baseline. So a core
temperature of 39.5 °C on day 1 already needs review, with no history yet. Every
threshold carries its link, or says Assumption. And an Assumption never raises an
alarm on its own.

### 1:50–2:00 · Maturity and next step

This is a prototype, running on synthetic data. Next: the thresholds a flight
surgeon would sign off, and a longer test inside a real mission routine.

## What each judge criterion hears

| Criterion | Where it is in the script |
| --- | --- |
| Impact | 0:00: a crew that cannot wait for Earth |
| Creativity | 0:42: the app compares one person with their own usual range, and suggests with a probability, not a label |
| Validity | 1:30: a sourced limit checked first, thresholds linked or marked Assumption |
| Best Use of Science | 0:28: only instruments that fly on the ISS today; 1:30: every threshold shows its source, an Assumption never alarms alone |
| Best Mission Concept | 0:00 and 0:42: a crew far from Earth, one astronaut's three days, and who confirms at 1:17 |
| Relevance | 0:18 and 0:42: the astronaut's own assessment, on a real mission day |
| Presentation | The demo path is fixed and under 40 seconds; the limit is said out loud |

## Before the presentation

- Read it aloud three times with a timer (REQ-35). Target 1:55. If it passes
  2:05, cut the Reaction Self Test sentence at 0:28 first, then the second
  sentence of 1:17–1:30.
- Update the story with the real screens and the real probability from Bio 2.
  Until they exist, `{{PROBABILITY_AND_BASIS}}` stays a placeholder.
- Confirm the name of the demo persona. If Elena is a real astronaut, change it.
- Confirm the NASA resource Phys uses (REQ-19). The problem line at 0:00 names the
  risk pages, because those are the ones this script was written from; if
  `docs/nasa_data.md` ends up listing another resource, that line changes.
- If the app fails during the demo, play the 30 s video and keep talking: the
  story fits in 40 seconds, so the video covers the same ground.

## Sources for this script

- NASA Human Research Program, Risks of Human Spaceflight:
  https://www.nasa.gov/hrp/risks/
- NASA, Risk of Cardiovascular Adaptations:
  https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/
- NASA, Risk of Altered Immune System Responses:
  https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
- NASA, Human Adaptation to Spaceflight: The Role of Nutrition (2020):
  https://nasa.gov/wp-content/uploads/2023/03/human-adaptation-2020-final.pdf
- Canadian Space Agency, Why do we conduct science experiments in space?:
  https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- NASA-STD-3001 Volume 1, Revision C: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

Files the new lines rest on: `config/data/indicators.csv` (instrument per
indicator, each row with a link), `config/rules/attention.csv` (the cited
`temp_core_c` rows: above 38.0 °C, below 35 °C), `FORMATS.md` section 3 (how each
value is compared), `docs/findings/phys-02-baseline-state-rule.md` (a cited limit
is absolute, an Assumption row never alarms alone, 39.5 °C on the first day is
`needs_review`). Instrument sources are already in `docs/sources.md`.

Every claim above is quoted in `docs/findings/bio1-01-question-2-sources.md` and
`docs/findings/bio1-03-fluid-intake.md`, with the pages that were opened.
