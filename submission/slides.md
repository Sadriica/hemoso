# Seven slides (REQ-17, option B)

Sun 15 Nov 12:15. Content ready to paste into Google Slides, one block per
slide. Title slide included, so six content slides. English, short lines.

Share it as "anyone with the link", no sign-in, and paste that link in the
Project Demonstration field of the submission page.

## Slide 1 · Title

**HeMoSo**
A health monitor for astronauts on long missions

Team ReTardis · NASA Space Apps 2026 · Medellín
Challenge: Create Health Monitoring Software for Astronauts on Space Missions

## Slide 2 · The problem

On a long mission the flight surgeon is minutes or hours away.

The crew has to notice the change, understand it and act, with no clinic and no
doctor on board.

NASA asks for a tool where astronauts record health indicators and evaluate
their own status.

## Slide 3 · What HeMoSo does

Records a measurement, then answers three questions:

- Is it outside this person's usual range?
- Does it cross a published clinical limit?
- Who needs to know: the crew, the CMO on board, or the flight surgeon?

Shows one of four states in plain words, with the next step for that state.

## Slide 4 · How it works

Two rules, both explainable:

1. A sourced limit never needs a history. 39.5 °C is a review on day one.
2. The person's own range answers a different question: median and spread of
   their recent readings.

Possible conditions appear as an evidence score with the signals behind it,
never as a percentage, and the CMO confirms.

## Slide 5 · Why the numbers can be trusted

Every threshold is a link to a NASA, WHO, AHA or ADA document, or the word
"assumption" in the file, visible in the interface.

A content check blocks a merge with an unsourced row, a broken escalation order
or an unknown indicator.

Example: fever at 38.0 °C (NASA JSC 22538); hypertension at 140/90 or higher
(WHO).

## Slide 6 · The app

Three phases: identify, report, status.

- One row per indicator, with its own icon and its usual range.
- A status screen that says the state and who acts, never colour alone.
- A 3D body to mark where it hurts.
- A three-minute reaction check for the neurobehavioural state.
- Works with synthetic data, and keeps readings on the device when the link is
  down.

## Slide 7 · Impact and next steps

Impact: the crew acts in the minutes that matter, with the evidence in front of
them, and the medical team keeps the decision.

Next: symptoms as a second kind of evidence, with red flags that escalate at
once; reopening with no network; and learning from each person's own records.

Repository: github.com/Sadriica/hemoso
App: hemoso.space
