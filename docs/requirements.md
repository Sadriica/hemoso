# Requirements · Eng 1 (Wambi)

General requirements for HeMoSo, written on Saturday 14 Nov from the official
challenge page, the submission guide, the judging guide and NASA-STD-3001
Volume 1 Revision C. The same rows are in `board/requirements.csv` and on the
board. The solution's own requirements are added after the team chooses it
(T-06, T-07), each naming the general requirement it serves.

Classes: **challenge** (the statement asks for it) · **optional** (a
consideration the statement offers, or a team quality rule) · **context**
(follows from NASA sources on how crew health is monitored) · **delivery**
(submission and judging rules) · **operations** (the event).

| ID | Requirement | Class | Priority | Owner (GitHub) | Block | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | A visual tool astronauts use to assess their own health and act on its status | challenge | P0 | Juli (@julimejia), Bio 1 (@sofiaruizt) | B2 Sat 13:30-17 | The astronaut sees the status of each indicator they track and what to do next, on one screen |
| REQ-02 | Gather health indicators from user input: keyboard and clicks; camera or images are optional | challenge | P0 | Juli (@julimejia) | B2 Sat 13:30-17 | Every chosen indicator can be entered without special hardware; units shown at entry |
| REQ-03 | Choose the indicators on purpose, each confirmed measurable on board with a source | challenge | P0 | Phys (@IsabellaCabreraquintero), Bio 1 (@sofiaruizt) | B1 Sat 10-12 | docs/DECISIONS.md lists each indicator, how it is measured in flight and the source; any example from the statement that is left out (for example blood sugar) says why |
| REQ-04 | Each indicator answers the five questions of the statement | challenge | P0 | Bio 1 (@sofiaruizt), Bio 2 (@pamirestrepo-code), Phys (@IsabellaCabreraquintero) | B3 Sat 17-1 | Measurable in space and how; why needed; hazard effects; when it needs attention; prevention. Each answer sourced or marked Assumption |
| REQ-05 | Say when a result needs attention from the crew, the CMO or the flight surgeon | challenge | P0 | Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | Each indicator has an attention rule with its source, or the rule is labelled Assumption in the interface |
| REQ-06 | Guidance on treatments and health improvement, never a diagnosis | challenge | P0 | Bio 2 (@pamirestrepo-code), Bio 1 (@sofiaruizt) | B3 Sat 17-1 | Every attention state shows what to do; no diagnostic wording or risk percentages anywhere |
| REQ-07 | Explain how the five spaceflight hazards affect what is measured | challenge | P1 | Bio 1 (@sofiaruizt), Phys (@IsabellaCabreraquintero) | B3 Sat 17-1 | Each indicator names the hazards that affect it (radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environments) with a NASA source |
| REQ-08 | Simple instructions on measurements, indicators and risks; no assumed expertise | optional | P1 | Bio 1 (@sofiaruizt) | B3 Sat 17-1 | Numbered steps, one action per sentence; Bio 2 reviews every text for plain language |
| REQ-09 | Optional considerations chosen or left out on purpose | optional | P1 | Wambi (@Sadriica), Juli (@julimejia) | B1 Sat 10-12 | Human figure, colour coding, dynamic charts, routine prompts, gamification, mission environments, animations and camera input each have a row in docs/DECISIONS.md: use or leave out, and why |
| REQ-10 | Every medical statement has a source or is marked Assumption, visible to the user | delivery | P0 | Bio 1 (@sofiaruizt), Bio 2 (@pamirestrepo-code), Phys (@IsabellaCabreraquintero) | B3 Sat 17-1 | A reviewer finds no unsourced statement in config/ or the interface; Assumption labels show in the app |
| REQ-11 | Never presented as a replacement for the CMO or the flight surgeon | context | P0 | Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | Interface, pitch and page say the tool supports the crew's own assessment and that decisions stay with the CMO and flight surgeon |
| REQ-12 | Show how indicators change over time against the person's own earlier values | context | P1 | Juli (@julimejia), Wambi (@Sadriica) | B3 Sat 17-1 | Each indicator has a history view; the comparison uses that astronaut's own earlier values |
| REQ-13 | Work with delayed or no contact with Earth | context | P1 | Wambi (@Sadriica), Juli (@julimejia) | B3 Sat 17-1 | The app and its data keep working with no network; anything for the ground waits and is sent later |
| REQ-14 | Treat health data as private; the demo uses synthetic data only and says so | context | P0 | Wambi (@Sadriica), Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | No real personal data anywhere; the interface labels the data as synthetic |
| REQ-15 | Readable and usable without colour alone or a mouse | optional | P1 | Juli (@julimejia) | B3 Sat 17-1 | Every state has text or an icon besides colour; the demo path works by keyboard |
| REQ-16 | Everything submitted is in English | delivery | P0 | Bio 2 (@pamirestrepo-code), Juli (@julimejia) | B4 Sun 9-12 | Page, app, slides and linked materials in English; a video may be spoken in another language only with English subtitles |
| REQ-17 | Demo: video of 30 s or less with English subtitles, or 7 slides at most including title and intro | delivery | P0 | Bio 1 (@sofiaruizt), Juli (@julimejia) | B4 Sun 9-12 | Length or slide count checked; hosted outside Space Apps; the link opens with no password, permission or registration |
| REQ-18 | Public link to the final project | delivery | P0 | Wambi (@Sadriica), Juli (@julimejia) | B4 Sun 9-12 | Repository and running app open in a private window with no login |
| REQ-19 | Use and name at least one NASA data or resource; list every other data, tool, code and image used | delivery | P0 | Phys (@IsabellaCabreraquintero) | B4 Sun 9-12 | Page fields NASA Data and Space Agency Partner Data filled from docs/nasa_data.md and docs/sources.md; licences and permissions checked |
| REQ-20 | Super Intelligence (SI) tools used as the guide allows and disclosed | delivery | P0 | Bio 2 (@pamirestrepo-code), Wambi (@Sadriica) | B1 Sat 10-12 | The solution idea comes from the team, not from SI tools; the page answers the SI question; SI images and video carry a visible watermark; SI code, data and audio are acknowledged in descriptive text and metadata; no NASA logos, flags or mission identifiers in generated content |
| REQ-21 | Pitch and page answer the five judging criteria | delivery | P0 | Bio 1 (@sofiaruizt), Bio 2 (@pamirestrepo-code) | B4 Sun 9-12 | Script and page say how the project serves Impact, Creativity, Validity, Relevance and Presentation |
| REQ-22 | No images, video, audio or likeness of people under 18 | delivery | P0 | Bio 1 (@sofiaruizt), Juli (@julimejia) | B4 Sun 9-12 | Every image and clip checked before upload |
| REQ-23 | Submit for judging before the internal freeze | delivery | P0 | Bio 2 (@pamirestrepo-code) | Submit Sun 12-14 | Terms and originality boxes checked and Submit for Judging pressed by Sun 13:30; official close Sun 15 Nov 23:59 Medellín time |
| REQ-24 | All five members registered for the Medellín event and on the team's Members tab | operations | P0 | Bio 2 (@pamirestrepo-code) | B0 Sat 9-10 | Members tab of ReTardis shows all five; no member can be added after submission closes |
| REQ-25 | Local judging and the 14:00 mentor presentation confirmed with the local lead and rehearsed | operations | P0 | Bio 1 (@sofiaruizt), Bio 2 (@pamirestrepo-code) | Submit Sun 12-14 | Time, length and language confirmed (T-04); two-minute story rehearsed three times |

## Sources

| ID | Source |
| --- | --- |
| REQ-01 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objective) |
| REQ-02 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objectives) |
| REQ-03 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (background: blood pressure, heart rate, blood sugar, body temperature, sleep hours, mood) |
| REQ-04 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objectives) |
| REQ-05 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objectives) |
| REQ-06 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objective) |
| REQ-07 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (background) |
| REQ-08 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (potential considerations) |
| REQ-09 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objectives and potential considerations) |
| REQ-10 | Judging guide · https://www.spaceappschallenge.org/resources/judging-awards-guide/ (Validity) |
| REQ-11 | NASA-STD-3001 Vol 1 Rev C · https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf ([V1 3004] in-mission medical care) |
| REQ-12 | NASA-STD-3001 Vol 1 Rev C · https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf ([V1 3004] trending vital signs; limits relative to each person's baseline) · CS: Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (dynamic charts) |
| REQ-13 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (hazard: distance from Earth) · https://www.nasa.gov/hrp/hazard-distance-from-earth/ |
| REQ-14 | NASA-STD-3001 Vol 1 Rev C · https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf ([V1 6003] private medical communication) |
| REQ-15 | team quality rule (colour coding is a statement consideration) |
| REQ-16 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-17 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-18 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-19 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (required for global awards) |
| REQ-20 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (Use of Super Intelligence) |
| REQ-21 | Judging guide · https://www.spaceappschallenge.org/resources/judging-awards-guide/ |
| REQ-22 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (Terms and Conditions) |
| REQ-23 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (submission start and end times) |
| REQ-24 | Judging guide · https://www.spaceappschallenge.org/resources/judging-awards-guide/ (eligibility: at most six members, same local event) |
| REQ-25 | Medellín event schedule · SG: Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (local judging times may differ) |

## Judging criteria

Each project is scored on five criteria (judging guide). Fill the right column
once the solution exists; the pitch and the page use it (REQ-21).

| Criterion | What judges look for | How HeMoSo answers it |
| --- | --- | --- |
| Impact | Potential to improve astronaut health monitoring and life on Earth | |
| Creativity | A fresh perspective or inventive execution | |
| Validity | Grounded in scientific principles; technically and logically feasible | |
| Relevance | Answers the challenge statement directly | |
| Presentation | Clear story, demo and page | |
