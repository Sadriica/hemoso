# Content formats

**Draft for the team to confirm** · Sat 14 Nov 12:31

The agreement between biologists and engineers: which files the solution reads,
their exact format, and who owns each one. Built from the team's solution
paragraph in `docs/DECISIONS.md` ("Solution (T-06)", Sat 14 Nov 12:07) and the
requirements in `docs/requirements.md`. Engineers write the code to read these
files as they are; nobody changes a format alone.

Nothing below is decided until the team says so. Every indicator, unit,
threshold, probability and medical value is left for its owner to fill. Every
example uses a clearly fake placeholder (`example_indicator` and the like), so
none of them is a real medical value.

## 1. Files and owners

One row per file the app reads. The "What it holds" column names the sentence
of the team paragraph or the requirement the file serves. Default folders:
Bio 1 `config/content/`, Bio 2 `config/rules/`, Phys `config/data/`
(`config/README.md`). These folders do not change in this draft.

| File in `config/` | What it holds | Owner | Checked by |
| --- | --- | --- | --- |
| `data/indicators.csv` | The indicators the app tracks: id, name, unit, direction and how each is measured on board. Serves "Each astronaut records their health data" and REQ-03 (how it is measured) and REQ-07 (which hazards affect it). | Phys | Phys (REQ-03) |
| `data/demo_data.csv` | Synthetic measurements for the demo, in the same shape the app stores real history. Serves REQ-29 and shows the history shape of REQ-27. | Phys | Phys (REQ-29) |
| `data/demo_ranges.csv` | The synthetic value range, its source and the generation method for each indicator in the demo. Serves REQ-29. | Phys | Phys (REQ-29) |
| `rules/attention.csv` | When a result needs attention from the crew, the CMO or the flight surgeon: the threshold and attention level per indicator. Serves REQ-05 and "its thresholds are set to astronaut ranges". | Bio 2 | Bio 2 (REQ-10) |
| `rules/conditions.csv` | What the astronaut may have, as a probability, what it is based on, and its source. Serves REQ-06 and "the app suggests what the astronaut may have, as probabilities and never as a certainty". | Bio 2 | Bio 2 (REQ-10) |
| `content/<indicator_id>.md` | The plain-language text the astronaut reads for one indicator: why it matters, the measurement steps, and the status and next-step text per attention level. Serves REQ-04, REQ-08 and REQ-26. | Bio 1 | Bio 2 (REQ-10) |
| `content/body_regions.csv` | The body regions the 3D body lets the astronaut select. Serves "A 3D body lets the astronaut select where it hurts". | To be decided (open question) | To be decided |

## 2. Identifiers

Every id is lowercase `snake_case`: letters, digits and underscores, starts
with a letter, no spaces. Use each id exactly as written here; do not invent
new ones without updating this table and the owner named in it.

| id | Name | Unit | Direction | Notes |
| --- | --- | --- | --- | --- |
| `<indicator_id>` | to be filled by Phys (REQ-03) | to be filled by Phys (REQ-03) | `higher`, `lower` or `both` (which direction is worse; `both` when either side matters) | One row per indicator; example id `example_indicator`. The team has not chosen the indicators yet. |
| `<condition_id>` | to be filled by Bio 2 (REQ-06) | — (a condition has a probability, not a unit) | — | One row per possible condition; example id `example_condition`. |
| `<body_region_id>` | to be filled by the owner (open question) | — | — | One row per selectable body region; example id `example_body_region`. |

The unit and direction live with each indicator in `data/indicators.csv`; the
table above is the summary every other file reads against.

## 3. One section per file

For each file: purpose, columns or keys in order, one valid example, the rules
that make it valid, and where each value's source goes. Sources follow
`STANDARDS.md` §6: in tables a link alone, or the word `Assumption`. Every row
that holds a medical statement, a threshold or a probability has a `source`
column holding a link or the word `Assumption`.

### `config/data/indicators.csv`

Purpose: the master list of indicators. One row per indicator; it answers
"what is measured" (REQ-03) and "which hazards affect it" (REQ-07).

Columns in order: `id`, `name`, `unit`, `direction`, `measured_on_board`,
`hazards`, `source`.

- `id`: the indicator id from section 2.
- `name`: plain name, sentence case.
- `unit`: the symbol from `STANDARDS.md` §3 when one applies; otherwise the
  unit Phys writes in the section 2 table for this `id`.
- `direction`: `higher`, `lower` or `both` — which side of the range is worse;
  `both` for indicators where either side matters.
- `measured_on_board`: the instrument or method used in flight, in a few words.
- `hazards`: the hazards from REQ-07 that affect this indicator, separated by
  spaces. Use these names: `radiation`, `isolation_and_confinement`,
  `distance_from_earth`, `gravity_fields`, `hostile_closed_environments`.
- `source`: a link or the word `Assumption`.

Example:

```csv
id,name,unit,direction,measured_on_board,hazards,source
example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,Assumption
```

Valid when: one row per `id`, no duplicate `id`; `id` in section 2; `unit`
matches the unit in the section 2 table for that `id`; `direction` is `higher`,
`lower` or `both`; `source` is a link or `Assumption`. This file holds no
thresholds or medical values.

### `config/data/demo_data.csv`

Purpose: the synthetic measurements the demo shows, one row per entry. It uses
the same columns the app stores for a real entry (REQ-27), so the history view
works without real data (REQ-29).

Columns in order: `person_id`, `indicator_id`, `value`, `unit`, `mission_day`,
`time`.

- `person_id`: a lowercase `snake_case` id for a synthetic astronaut; the demo
  uses `demo_astronaut_1`.
- `indicator_id`: an id from `data/indicators.csv`.
- `value`: a number.
- `unit`: the same unit as the indicator's row in `data/indicators.csv`.
- `mission_day`: an integer; "day N" per `STANDARDS.md` §4.
- `time`: the 24-hour clock time `HH:MM`, per `STANDARDS.md` §4.

Example:

```csv
person_id,indicator_id,value,unit,mission_day,time
demo_astronaut_1,example_indicator,1,example_unit,1,13:30
```

Valid when: `indicator_id` exists in `data/indicators.csv`; `unit` matches that
indicator's unit; `value` is inside the range for that indicator in
`data/demo_ranges.csv`; `mission_day` is a positive integer; `time` is 24-hour
`HH:MM`. These values are synthetic, so no `source` column is needed here — the
ranges are sourced in `data/demo_ranges.csv`.

### `config/data/demo_ranges.csv`

Purpose: the range, its source and the generation method for each indicator in
the demo (REQ-29).

Columns in order: `indicator_id`, `min`, `max`, `source`, `generation_note`.

- `indicator_id`: an id from `data/indicators.csv`.
- `min`, `max`: the lowest and highest synthetic value.
- `source`: a link or `Assumption`, for the range.
- `generation_note`: how the demo values are produced, in a few words.

Example:

```csv
indicator_id,min,max,source,generation_note
example_indicator,0,100,Assumption,uniform random integers across the range
```

Valid when: `indicator_id` exists in `data/indicators.csv`; `min` is less than
`max`; `source` is a link or `Assumption`; `generation_note` is not empty.

### `config/rules/attention.csv`

Purpose: when a result needs attention, per indicator (REQ-05). A range is two
rows — one `below` bound and one `above` bound.

Columns in order: `indicator_id`, `side`, `threshold`,
`attention_level`, `source`.

- `indicator_id`: an id from `data/indicators.csv`.
- `side`: `below` or `above` — which side of `threshold` triggers this row.
- `threshold`: a number; its unit is the indicator's unit.
- `attention_level`: the name of this state, filled by Bio 2; the same names
  are the sub-headings in `content/<indicator_id>.md`.
- `source`: a link or `Assumption`.

Example:

```csv
indicator_id,side,threshold,attention_level,source
example_indicator,above,100,example_level,Assumption
```

Valid when: `indicator_id` exists in `data/indicators.csv`; `side` is
`below` or `above`; `threshold` is a number; `source` is a link or `Assumption`.
The threshold here is a placeholder — the real value and its source are filled
by Bio 2 (REQ-05).

### `config/rules/conditions.csv`

Purpose: what the astronaut may have, as a probability and never a certainty
(REQ-06). The app always adds "your CMO or flight surgeon confirms"
(`STANDARDS.md` §5); it is not stored per row. The columns for the probability
are added when the team answers the open question on how it is computed; the
probability must come from the person's records, so a fixed value per row is
not enough.

Columns in order: `condition_id`, `name`, `based_on`, `source`.

- `condition_id`: the id from section 2.
- `name`: plain name, sentence case.
- `based_on`: the indicator or symptom ids this rests on, separated by spaces.
- `source`: a link or `Assumption`.

Example:

```csv
condition_id,name,based_on,source
example_condition,Example condition,example_indicator,Assumption
```

Valid when: `condition_id` in section 2; every id in `based_on` exists in
`data/indicators.csv`; `source` is a link or `Assumption`. The probability
columns are filled in when the team answers the open question on how the
probability is computed.

### `config/content/<indicator_id>.md`

Purpose: the plain-language text the astronaut reads for one indicator, in
short sentences and plain words. One file per indicator, named after its id
(`config/content/example_indicator.md`). Fixed headings, in this order:

```markdown
# <indicator name>

## Why it matters

## How spaceflight affects it

## Measurement steps

## Status and next steps

### <attention_level>

## How to prevent problems

## Sources
```

The five questions of the statement map to headings and files: question 1 (what
is measured and how) — `data/indicators.csv`; question 2 (why it is needed) —
`## Why it matters`; question 3 (how spaceflight affects it) — `## How
spaceflight affects it`; question 4 (when a result needs attention) — `##
Status and next steps` with `rules/attention.csv`; question 5 (how to prevent
problems) — `## How to prevent problems` with `rules/conditions.csv`.

- `Why it matters`: why this indicator is needed (question 2), written by
  Bio 1, with its sources (REQ-04).
- `How spaceflight affects it`: how the five hazards affect what is measured
  (question 3, REQ-07); written by Bio 1 from the findings of Phys, with their
  sources.
- `Measurement steps`: numbered steps, one action per sentence (REQ-08).
- `Status and next steps`: one `### <attention_level>` sub-section per level in
  `rules/attention.csv` (question 4, REQ-05); each holds the short status text
  and the next step the astronaut reads (REQ-26).
- `How to prevent problems`: what the astronaut can do (question 5, REQ-06);
  written by Bio 1 from the findings of Bio 2, with their sources.
- `Sources`: the links from `STANDARDS.md` §6, one per line as
  `- <Title>: <link>`.

Example:

```markdown
# Example indicator

## Why it matters
Example reason, filled by Bio 1 (REQ-04). Assumption.

## How spaceflight affects it
Example hazard effect, written by Bio 1 from Phys's findings (question 3, REQ-07). Assumption.

## Measurement steps
1. Example step one.
2. Example step two.

## Status and next steps
### example_level
Example status text and example next step. Assumption.

## How to prevent problems
Example guidance, written by Bio 1 from Bio 2's findings (question 5, REQ-06). Assumption.

## Sources
- Example title: https://example.org
```

Valid when: the headings appear in this order; every `###` heading matches an
`attention_level` in `rules/attention.csv`; every medical statement carries a
link or the word `Assumption`. The example text above is placeholder.

### `config/content/body_regions.csv`

Purpose: the body regions the 3D body lets the astronaut select, and where the
discomfort may be shown. The owner is an open question (see below).

Columns in order: `id`, `name`, `source`.

- `id`: the body region id from section 2.
- `name`: plain name, sentence case.
- `source`: a link or `Assumption`, for the region list.

Example:

```csv
id,name,source
example_body_region,Example body region,Assumption
```

Valid when: one row per `id`, no duplicate `id`; `id` in section 2; `source` is
a link or `Assumption`. Whether the regions are flat or nested, and how a
region maps to a possible condition, are open questions.

## 4. How content is checked

The team runs `python scripts/check_content.py` before every merge (the script
does not exist yet; another card writes it). A merge is blocked when it reports
any of these failures:

- **Missing file**: a required file listed in section 1 is absent.
- **Unknown id**: an `id` in a file is not in the section 2 table, or an
  `indicator_id` / `condition_id` / `body_region_id` does not exist in its
  owning file.
- **Statement without source**: a row that holds a medical statement, a
  threshold or a probability has no `source`, or its `source` is neither a link
  nor the word `Assumption`.
- **Malformed row**: wrong number of columns, an empty required cell, a
  duplicate id, a `unit` that does not match the section 2 table for its `id`,
  a non-numeric `value`, `threshold`, `min` or `max`, a `side` that is not
  `below` or `above`, a `direction` that is not `higher`, `lower` or `both`, a
  `time` that is not 24-hour `HH:MM`, or a `mission_day` that is not a positive
  integer.

## Open questions for the team

Not decided in the solution paragraph. The team answers these before the files
above are real; none is answered here.

- Which indicators does HeMoSo track? (REQ-03, Phys)
- How is each probability in `rules/conditions.csv` computed, and what is it
  based on? The paragraph says "as probabilities" but not how they are derived.
- What does the camera store? The paragraph says it "looks at the face and eyes
  for signs of fatigue, stress, mental state and sleep", but not what output
  becomes a value in `config/`.
- Which body regions does the 3D body use, and who owns that list? The
  paragraph mentions muscles, ligaments and bones in passing but names no
  regions.
- Are symptoms a separate list, or are they indicators like the rest? The
  paragraph says the astronaut records "health data and symptoms".
- Which open-source projects (face recognition, anatomy, health and gym apps)
  are used, under which licences?
- How does the app "learn from each person's own records" — what does it adjust,
  and where is that stored?
- What do the attention levels in `rules/attention.csv` look like — how many,
  and what are they called?
