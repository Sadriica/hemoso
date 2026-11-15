# Pitch script · two minutes

**Status:** draft · **Owner:** Bio 1 · Sat 14, 23:30 · read aloud three times
before Sun 14:00 (REQ-35)

For the mentors on Sunday at 14:00. Spoken, not read: short sentences, one idea
each, and the app on screen during the story. 276 words, about 1:55 at a
conversation pace.

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
| This script, spoken at 1:20 | Bio 1 |
| The submission page description | Bio 2 (REQ-34) |

It is one sentence on purpose. A disclaimer that takes ten seconds to say is a
disclaimer nobody hears.

## The story (REQ-21)

| Time | Beat | What is on screen |
| --- | --- | --- |
| 0:00–0:20 | The problem, with a NASA source | The app, idle, day 41 |
| 0:20–0:40 | Who uses it, and when | The app, day 41 status |
| 0:40–1:20 | One astronaut, three days, through the demo | The demo path: day 41, day 42, day 46 |
| 1:20–1:35 | What it does not do | The status card, the CMO line |
| 1:35–1:50 | Evidence and its limits | `config/` open, one rule with its link |
| 1:50–2:00 | Maturity and next step | The team |

### 0:00–0:20 · The problem

On a long mission, there is no hospital. NASA's Human Research Program says
weightlessness changes how the heart and blood vessels work, which can raise the
risk of cardiovascular events, and that crews report rashes and infections in
orbit. On board there is a crew medical officer. On Earth, a flight surgeon.
Neither can watch every crew member every day.

### 0:20–0:40 · Who uses it, and when

HeMoSo is for the astronaut, on the days between contacts with Earth. A daily
check of a few numbers and symptoms, compared with that person's own usual range,
so a change is visible while it is still small.

### 0:40–1:20 · The story

Day 41. Elena logs her resting heart rate: three days above her usual range. HeMoSo
suggests a mild infection is possible, with the probability and what it is based
on, and asks her to repeat the measurement and answer two questions. Her CMO on
board is notified. Day 42: fever of 38.5 °C and a sore throat, so the flight
surgeon is told at the next link. Day 46: both back inside her usual range.

### 1:20–1:35 · What it does not do

HeMoSo does not diagnose. It shows a probability and its basis, and it names who
confirms: your CMO or the flight surgeon. The decision is theirs.

### 1:35–1:50 · Evidence and its limits

NASA's open data shaped what we track and why: the Human Research Program risk
pages, and the nutrition evidence report behind the fluid rule. Every threshold
in the app carries a link or is marked Assumption, because the sources we read
set no in-flight cut-offs for heart rate, blood pressure, temperature, sleep or
mood.

### 1:50–2:00 · Maturity and next step

This is a prototype, running on synthetic data. Next: the thresholds a flight
surgeon would sign off, and a longer test inside a real mission routine.

## What each judge criterion hears

| Criterion | Where it is in the script |
| --- | --- |
| Impact | 0:00: a crew that cannot wait for Earth |
| Creativity | 0:40: the app compares one person with their own usual range, and suggests with a probability, not a label |
| Validity | 1:35: NASA sources named, thresholds linked or marked Assumption, the gap stated |
| Relevance | 0:20 and 0:40: the astronaut's own assessment, on a real mission day |
| Presentation | The demo path is fixed and under 40 seconds; the limit is said out loud |

## Before the presentation

- Read it aloud three times with a timer (REQ-35). Target 1:55. If it passes
  2:05, cut "and answer two questions" first, then the second sentence of
  1:20–1:35.
- Update the story with the real screens and the real probability from Bio 2.
  Until they exist, `{{PROBABILITY_AND_BASIS}}` stays a placeholder.
- Confirm the name of the demo persona. If Elena is a real astronaut, change it.
- Confirm the NASA resource Phys uses (REQ-19). The line at 1:35 names the risk
  pages, because those are the ones this script was written from; if
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

Every claim above is quoted in `docs/findings/bio1-01-question-2-sources.md` and
`docs/findings/bio1-03-fluid-intake.md`, with the pages that were opened.
