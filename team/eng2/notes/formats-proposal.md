# FORMATS.md · proposal (Eng 2)

Draft for the T-06 meeting, built from the team's MVP baseline document
(Wambi, 12 Nov: sections 3, 5, 8.2 and 9). It follows the four sections of
`FORMATS.md`. File and key names are the MVP's, translated to English as
`AGENTS.md` requires. Numbers are the values the MVP document already gives;
the ones it says the biologists must validate are marked `Assumption` until
they do. Once agreed, Eng 1 copies the result into `FORMATS.md`.

| MVP document name | Name in the repository |
| --- | --- |
| `mision.json` | `config/data/mission.json` |
| `escenario_demo.json` | `config/data/demo_scenario.json` |
| `relacionados.csv` | `config/rules/related.csv` |
| `fichas/` + `indice.json` | `config/content/cards/` + `config/content/cards/index.json` |
| `prevencion.json` | `config/content/prevention.json` |
| `instrucciones.json` | `config/content/instructions.json` |

## 1. Files and owners
The MVP document assigned cards to Bio 3 and Bio 4; the team is now five
people, so those rows need a new owner in the meeting (marked "to confirm").

| File in `config/` | What it holds | Owner | Checked by |
| --- | --- | --- | --- |
| `data/mission.json` | Phases, signals (unit, direction, key or not, dispersion floor), algorithm parameters, level and fitness thresholds, environments | Phys | Bio 2 (thresholds) |
| `data/demo_scenario.json` | Synthetic crew profiles and seeded events of the demo story | Phys | Eng 1 (the generator reads it) |
| `rules/related.csv` | "What usually relates", "what to check", "what to do" and when to escalate, per signal pattern and phase | Bio 2 | Bio 1 |
| `content/cards/<indicator>.md` | One card per indicator answering the five questions | Bio 1: heart and immune · Bio 2: bone and muscle, metabolism · mood and sleep: to confirm | Another biologist |
| `content/cards/index.json` | Which indicators belong to each body system, in display order | Bio 1 | Eng 2 (the body figure reads it) |
| `content/prevention.json` | At least one prevention step per system, shown in green (MVP-14) | Bio 1 | Bio 2 |
| `content/instructions.json` | Step-by-step instructions and time for each routine measurement (MVP-13) | Bio 2 | Phys (instruments, times) |

## 2. Identifiers
Lowercase English with underscores, no units in the id. Use them exactly.

**Body systems** (MVP 3.4):

| id | Name on screen |
| --- | --- |
| `heart` | Heart and circulation |
| `immune` | Immune system |
| `mood_sleep` | Mood and sleep |
| `metabolism` | Metabolism and nutrition |
| `bone_muscle` | Bone and muscle |

**Signals and indicators** (MVP 5.1 to 5.3):

| id | Name | Unit | Source of the value | System | Direction that matters | Key signal |
| --- | --- | --- | --- | --- | --- | --- |
| `resting_hr` | Resting heart rate | bpm | Watch | `heart` | up | yes |
| `hrv` | Heart rate variability | ms | Watch | `heart` | down | yes |
| `skin_temp` | Skin temperature | °C | Watch | `immune` | up | yes |
| `sleep_hours` | Sleep duration | h | Watch | `mood_sleep` | down | no |
| `spo2` | Blood oxygen | % | Watch, if available | `heart` | down | no |
| `activity` | Exercise logged | min | Watch | `bone_muscle` | down | no |
| `mood` | Mood today | 1–5 scale | Base routine | `mood_sleep` | down | no |
| `symptoms` | Symptoms | list | Base routine | `immune` | any reported | no |
| `body_temp` | Body temperature | °C | Base routine | `immune` | up | no |
| `bp_systolic` | Blood pressure, systolic | mmHg | Base routine | `heart` | up | no |
| `bp_diastolic` | Blood pressure, diastolic | mmHg | Base routine | `heart` | up | no |
| `glucose` | Blood glucose | mg/dL | Full routine | `metabolism` | both | no |
| `reaction_time` | Reaction test | ms | Full routine | `mood_sleep` | up | no |
| `calf_circumference` | Calf circumference | cm | Full routine | `bone_muscle` | down | no |
| `near_acuity` | Near visual acuity | to confirm | Full routine | to confirm | to confirm | no |
| `grip_strength` | Grip strength | kg | Full routine | `bone_muscle` | down | no |
| `urine_color` | Urine colour | 1–8 chart | Full routine | `metabolism` | up | no |

Open for the meeting: the unit and system of `near_acuity`, and whether the
"bone estimate" card in MVP 5.5 is an indicator or text only (the MVP says it
does not measure bone).

**Fixed value sets:**

| Set | Values |
| --- | --- |
| Alert level | `green`, `yellow`, `orange` |
| Fitness (mission control sees only this, MVP-06) | `fit`, `fit_with_restrictions`, `not_fit` |
| Routine | `passive`, `base`, `full` |
| Environment | `ship`, `station`, `rover`, `base` |
| Role | `astronaut`, `mission_control`, `flight_surgeon` |
| Frequency (related.csv) | `very_high`, `high`, `medium`, `low` |
| Hazard (cards, NASA RIDGE) | `radiation`, `isolation`, `distance`, `gravity`, `hostile_environment` |
| Phase | Defined by Phys in `mission.json`; ids like `early_flight`, `long_duration` |

## 3. One section per file

### `data/mission.json`
```json
{
  "environment": "ship",
  "phases": [
    { "id": "early_flight", "name": "First weeks", "startDay": 1, "endDay": 30 }
  ],
  "signals": [
    { "id": "resting_hr", "unit": "bpm", "direction": "up", "key": true, "madMin": 1, "sources": ["Assumption"] }
  ],
  "parameters": {
    "baselineWindowDays": 21,
    "newPhaseMinDays": 7,
    "zThreshold": 2.5,
    "sustainedDays": 3,
    "stepDownCalmDays": 2
  },
  "thresholds": {
    "feverC": { "value": 38.0, "sources": ["Assumption"] },
    "notFitFeverC": { "value": 39.0, "sources": ["Assumption"] }
  }
}
```
Rules: every signal id is in section 2; `direction` is `up`, `down` or
`both`; `madMin` is in the signal's unit (MVP 9.2: 1 bpm, 0.08 °C, 0.6 mood
points); phases do not overlap and cover the mission; every threshold carries
`sources`.

### `data/demo_scenario.json`
```json
{
  "missionDays": 60,
  "crew": [ { "id": "crew_a", "label": "Astronaut A", "profile": { "resting_hr": 58 } } ],
  "events": [
    { "type": "isolated_spike", "crewId": "crew_a", "day": 22, "signals": ["resting_hr"] },
    { "type": "infection", "crewId": "crew_a", "startDay": 40, "symptomsDay": 42, "recoveryDay": 46 }
  ]
}
```
Rules: synthetic only (REQ-14); crew ids `crew_a` to `crew_d`, never real
names; every profile value carries its source in `docs/sources.md` (MVP 9.5).
The seeded truth is only read by the validation script, never by the app.

### `rules/related.csv`
One row per situation. Columns, in order:

| Column | Rule |
| --- | --- |
| `id` | Lowercase, unique: `mild_infection_onset` |
| `situation` | Plain words, no diagnosis: "the start of a mild infection" |
| `pattern` | `signal:direction` pairs separated by `;`: `resting_hr:up;hrv:down;skin_temp:up` |
| `phases` | Phase ids that favour it, separated by `;` |
| `frequency` | `very_high`, `high`, `medium` or `low` (NASA IMM, ISS records) |
| `what_to_check` | One or two concrete checks for tomorrow |
| `what_to_do` | One simple action |
| `escalate_when` | The exact condition that alerts the flight surgeon |
| `sources` | Links separated by a space, or `Assumption` |

No percentages anywhere (MVP 3.2).

### `content/cards/<indicator>.md`
File name is the indicator id: `resting_hr.md`. Five headings, in this order,
then sources:
```markdown
# Resting heart rate
## Can it be measured in space, and how?
## Why is it needed?
## How do spaceflight hazards affect it?
## When does it need attention?
## What prevents a critical condition?
## Sources
- <Title>: <link>
```
`index.json`: `{ "heart": ["resting_hr", "hrv", "bp_systolic", "bp_diastolic"], ... }`,
one key per system id, indicators in display order. Every id listed has a card.

### `content/prevention.json`
```json
[ { "system": "bone_muscle", "text": "Do today's resistance exercise.", "sources": [] } ]
```
At least one entry per system; `sources` has a link or the string `"Assumption"`.

### `content/instructions.json`
```json
[
  {
    "indicator": "bp_systolic",
    "routine": "base",
    "seconds": 90,
    "steps": ["Sit and rest for 5 min.", "Put the cuff on your upper arm.", "Press start and stay still."],
    "sources": ["Assumption"]
  }
]
```
Rules: base routine total at most 180 s and full routine at most 480 s
(MVP-05); steps are short sentences in plain words.

## 4. How content is checked
- Backend (Eng 1): Pydantic models load every file at start-up; a bad file
  stops the server with the file, entry and reason.
- Frontend (Eng 2): a Vitest test, also run by the Vercel build, checks that
  every indicator in `cards/index.json` has a card with the five headings,
  every system has a prevention entry, and routine times stay within MVP-05.
- Both fail on: an unknown id, a statement without `sources`, overlapping
  phases, and the words "diagnosis", "disease", "risk percentage" or "AI".

A failure blocks the merge and the deploy.
