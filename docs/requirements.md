# Requirements · Eng 1 (Wambi)

General requirements for HeMoSo, written on Saturday 14 Nov from the official
challenge page, the submission guide, the judging guide and NASA-STD-3001
Volume 1 Revision C. The same rows are in `board/requirements.csv` and on the
board. Each requirement has one owner, so a person or an agent can take it
whole; shared work is split into separate requirements. The solution's own requirements are added after the team chooses it
(T-06, T-07), each naming the general requirement it serves.

Classes: **challenge** (the statement asks for it) · **optional** (a
consideration the statement offers, or a team quality rule) · **context**
(follows from NASA sources on how crew health is monitored) · **delivery**
(submission and judging rules) · **operations** (the event).

| ID | Requirement | Class | Priority | Owner (GitHub) | Block | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | A visual tool astronauts use to assess their own health and act on its status: the screens | challenge | P0 | Juli (@julimejia) | B2 Sat 13:30-17 | On one screen the astronaut sees the status of each indicator they track and a clear next step; content comes from config/ (REQ-26) |
| REQ-02 | Gather health indicators from user input: keyboard and clicks; camera or images are optional | challenge | P0 | Juli (@julimejia) | B2 Sat 13:30-17 | Every chosen indicator can be entered without special hardware; units shown at entry |
| REQ-03 | Confirm each chosen indicator is measurable on board, and how | challenge | P0 | Phys (@IsabellaCabreraquintero) | B1 Sat 10-12 | For each indicator the team chose (T-06): instrument or method in flight, unit and precision, with a NASA or peer-reviewed source; any statement example left out (for example blood sugar) says why, in docs/DECISIONS.md through Wambi |
| REQ-04 | Each indicator answers the five questions of the statement, assembled in one place | challenge | P0 | Bio 1 (@sofiaruizt) | B3 Sat 17-1 | Per indicator: question 2 (why it is needed) written by Bio 1 with sources, and links to the answers of questions 1 (REQ-03), 3 (REQ-07), 4 (REQ-05) and 5 (REQ-06) |
| REQ-05 | Say when a result needs attention from the crew, the CMO or the flight surgeon | challenge | P0 | Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | Each indicator has an attention rule with its source, or the rule is labelled Assumption in the interface |
| REQ-06 | Guidance on treatments and health improvement; possible conditions as probabilities, never a certainty | challenge | P0 | Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | Every attention state shows what to do; a suggested condition shows its probability, what it is based on and that the CMO or flight surgeon confirms; no "you have X" anywhere |
| REQ-07 | Explain how the five spaceflight hazards affect what is measured | challenge | P1 | Phys (@IsabellaCabreraquintero) | B3 Sat 17-1 | Each indicator names the hazards that affect it (radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environments) with a NASA source |
| REQ-08 | Simple instructions on measurements, indicators and risks; no assumed expertise | optional | P1 | Bio 1 (@sofiaruizt) | B3 Sat 17-1 | Numbered steps, one action per sentence; Bio 2 reviews every text for plain language |
| REQ-09 | Optional considerations chosen or left out on purpose | optional | P1 | Wambi (@Sadriica) | B1 Sat 10-12 | Human figure, colour coding, dynamic charts, routine prompts, gamification, mission environments, animations and camera input each have a row in docs/DECISIONS.md: use or leave out, and why (decided by the team in T-06) |
| REQ-10 | Every medical statement has a source or is marked Assumption, visible to the user: review | delivery | P0 | Bio 2 (@pamirestrepo-code) | B3 Sat 17-1 | Bio 2 reviews config/ and the interface before each checkpoint; no unsourced statement remains; Assumption labels show in the app |
| REQ-11 | Never presented as a replacement for the CMO or the flight surgeon | context | P0 | Bio 1 (@sofiaruizt) | B3 Sat 17-1 | Interface, pitch and page say the tool supports the crew's own assessment and that decisions stay with the CMO and flight surgeon |
| REQ-12 | History view: each indicator against the person's own earlier values | context | P1 | Juli (@julimejia) | B3 Sat 17-1 | Each indicator has a history view comparing with that astronaut's own earlier values, reading the stored history (REQ-27) |
| REQ-13 | Data keeps working with delayed or no contact with Earth | context | P1 | Wambi (@Sadriica) | B3 Sat 17-1 | Entries are saved locally with no network; anything meant for the ground waits in a queue and is sent later without duplicates |
| REQ-14 | Treat health data as private; no real personal data anywhere | context | P0 | Wambi (@Sadriica) | B3 Sat 17-1 | No real personal data in the repository or the app; the interface labels all data as synthetic |
| REQ-15 | Readable and usable without colour alone or a mouse | optional | P1 | Juli (@julimejia) | B3 Sat 17-1 | Every state has text or an icon besides colour; the demo path works by keyboard |
| REQ-16 | Everything submitted is in English: page and linked materials | delivery | P0 | Bio 2 (@pamirestrepo-code) | B4 Sun 9-12 | Page, slides and linked documents in English; a video may be spoken in another language only with English subtitles |
| REQ-17 | Demo format, script and slides within the limits | delivery | P0 | Bio 1 (@sofiaruizt) | B4 Sun 9-12 | Format chosen (video of 30 s or less, or 7 slides at most including title and intro); script or slides ready and checked against the limit |
| REQ-18 | Public repository with a README that explains how to run the project | delivery | P0 | Wambi (@Sadriica) | B4 Sun 9-12 | Repository public; README says what HeMoSo is and how to run it; opens in a private window with no login |
| REQ-19 | Use and name at least one NASA data or resource; list every other data, tool, code and image used | delivery | P0 | Phys (@IsabellaCabreraquintero) | B4 Sun 9-12 | Page fields NASA Data and Space Agency Partner Data filled from docs/nasa_data.md and docs/sources.md; licences and permissions checked |
| REQ-20 | Super Intelligence (SI) use disclosed on the page and in images and video | delivery | P0 | Bio 2 (@pamirestrepo-code) | B1 Sat 10-12 | The page answers the SI question from team/eng1/notes/si-use-log.md and the people's logs; SI images and video carry a visible watermark; no NASA logos, flags or mission identifiers in generated content |
| REQ-21 | The pitch answers the five judging criteria | delivery | P0 | Bio 1 (@sofiaruizt) | B4 Sun 9-12 | The script says how HeMoSo serves Impact, Creativity, Validity, Relevance and Presentation |
| REQ-22 | No images, video, audio or likeness of people under 18 | delivery | P0 | Bio 1 (@sofiaruizt) | B4 Sun 9-12 | Every image and clip checked before upload |
| REQ-23 | Submit for judging before the internal freeze | delivery | P0 | Bio 2 (@pamirestrepo-code) | Submit Sun 12-14 | Terms and originality boxes checked and Submit for Judging pressed by Sun 13:30; official close Sun 15 Nov 23:59 Medellín time |
| REQ-24 | All five members registered for the Medellín event and on the team's Members tab | operations | P0 | Bio 2 (@pamirestrepo-code) | B0 Sat 9-10 | Members tab of ReTardis shows all five; no member can be added after submission closes |
| REQ-25 | Local judging and the 14:00 mentor presentation confirmed with the local lead | operations | P0 | Bio 2 (@pamirestrepo-code) | Submit Sun 12-14 | Time, length and language confirmed and logged (T-04) |
| REQ-26 | Status and next-step texts the astronaut reads for each indicator | challenge | P0 | Bio 1 (@sofiaruizt) | B2 Sat 13:30-17 | Every status of every chosen indicator has a short text and a next step in config/, plain words, sourced or marked Assumption |
| REQ-27 | Keep each astronaut's measurements over time so earlier values can be compared | context | P1 | Wambi (@Sadriica) | B3 Sat 17-1 | Every entry is stored with time, unit and person; the history survives a reload; a function returns a person's earlier values for an indicator |
| REQ-28 | Interface works offline and shows what is waiting to be sent | context | P1 | Juli (@julimejia) | B3 Sat 17-1 | The app opens and works with the network off after the first load; pending items and the last sync time are visible |
| REQ-29 | Synthetic demo data with its assumptions documented | context | P0 | Phys (@IsabellaCabreraquintero) | B3 Sat 17-1 | The demo dataset in config/data/ is synthetic, each value range has a source or is marked Assumption, and the generation method is written down |
| REQ-30 | The app interface is in English | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | Every screen, label and message of the app in English |
| REQ-31 | Demo video recorded with English subtitles and a public link | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | Video of 30 s or less recorded from the app, English subtitles burned in, hosted outside Space Apps, link opens with no password, permission or registration |
| REQ-32 | Running app published at a public link | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | The app opens at a public link in a private window with no login, on desktop and phone |
| REQ-33 | SI-assisted code and data acknowledged in the repository | delivery | P0 | Wambi (@Sadriica) | B1 Sat 10-12 | The solution idea came from the team; SI-assisted code and data are acknowledged in descriptive text and metadata (a file at the repository root built from team/eng1/notes/si-use-log.md) |
| REQ-34 | The submission page answers the five judging criteria | delivery | P0 | Bio 2 (@pamirestrepo-code) | B4 Sun 9-12 | The page description says how HeMoSo serves Impact, Creativity, Validity, Relevance and Presentation |
| REQ-35 | Two-minute story for the mentors rehearsed three times | operations | P0 | Bio 1 (@sofiaruizt) | Submit Sun 12-14 | The story is read aloud in two minutes or less, three times, before 14:00 on Sunday |

## By owner

- **Bio 1 (@sofiaruizt)**: REQ-04, REQ-08, REQ-11, REQ-17, REQ-21, REQ-22, REQ-26, REQ-35
- **Bio 2 (@pamirestrepo-code)**: REQ-05, REQ-06, REQ-10, REQ-16, REQ-20, REQ-23, REQ-24, REQ-25, REQ-34
- **Phys (@IsabellaCabreraquintero)**: REQ-03, REQ-07, REQ-19, REQ-29
- **Wambi (@Sadriica)**: REQ-09, REQ-13, REQ-14, REQ-18, REQ-27, REQ-33
- **Juli (@julimejia)**: REQ-01, REQ-02, REQ-12, REQ-15, REQ-28, REQ-30, REQ-31, REQ-32

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
| REQ-26 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (objective) |
| REQ-27 | NASA-STD-3001 Vol 1 Rev C · https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf ([V1 3004] trending vital signs; limits relative to each person's baseline) · CS: Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (dynamic charts) |
| REQ-28 | Challenge statement · https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (hazard: distance from Earth) · https://www.nasa.gov/hrp/hazard-distance-from-earth/ |
| REQ-29 | NASA-STD-3001 Vol 1 Rev C · https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf ([V1 6003] private medical communication) |
| REQ-30 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-31 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-32 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ |
| REQ-33 | Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (Use of Super Intelligence) |
| REQ-34 | Judging guide · https://www.spaceappschallenge.org/resources/judging-awards-guide/ |
| REQ-35 | Medellín event schedule · SG: Submission guide · https://www.spaceappschallenge.org/resources/project-submission-guide/ (local judging times may differ) |

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
