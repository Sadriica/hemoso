# Content formats

**Draft for the team to confirm** · Sat 14 Nov 12:31 · attention `notify` column added 15:15 (Bio 2) · indicators, tier and system 15:40 · min_spread and mood scale 16:10 (Phys) · demo_data context 16:30 (Phys)

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
| `hr_bpm` | Heart rate | bpm | `both` | Tier A · system `cardiovascular` |
| `bp_sys_mmhg` | Systolic blood pressure | mmHg | `both` | Tier A · system `cardiovascular` |
| `bp_dia_mmhg` | Diastolic blood pressure | mmHg | `both` | Tier A · system `cardiovascular` |
| `temp_core_c` | Core temperature | °C | `both` | Tier A · system `thermoregulation` |
| `sleep_h` | Sleep duration | h | `lower` | Tier A · system `sleep` |
| `mood_1_5` | Mood | 1 to 5 | `lower` | Tier B · system `neuro_behavioural`; 1 = very low, 2 = low, 3 = neutral, 4 = good, 5 = very good, about the whole day, answered before sleep (our scale, Assumption: NASA asks about mood before sleep and publishes no fixed scale) |
| `glucose_mgdl` | Blood glucose | mg/dL | `both` | Tier A · system `metabolic`; measured on board with the i-STAT blood analyser from a fingerstick sample, so a value exists only when the crew takes one (Bio 2, `team/bio2/notes/indicators-review.md`; changed from tier C on Sat 19:40) |
| `reaction_median_ms` | Reaction time median | ms | `higher` | Tier A · system `neuro_behavioural`; the median of one in-app reaction check (REQ-38, T-71). Proposed by Eng 1 on Sat 23:10; Phys confirmed it in T-72: the 3-minute PVT-B of the ISS Reaction Self Test, 2 to 5 s wait (phys-06) |
| `reaction_lapses` | Reaction lapses | count | `higher` | Tier A · system `neuro_behavioural`; the count of late answers in one reaction check (REQ-38, T-71). Proposed by Eng 1 on Sat 23:10; Phys confirmed it in T-72: a trial of 355 ms or more is a lapse (phys-06, Dev et al. 2024) |
| `<condition_id>` | to be filled by Bio 2 (REQ-06) | — (a condition has an evidence score from 0 to 1, not a unit) | — | One row per possible condition; example id `example_condition`. |
| `<body_region_id>` | to be filled by the owner (open question) | — | — | One row per selectable body region; example id `example_body_region`. |

The demo indicators are the six the challenge statement names (team decision,
Sat 14 Nov 15:37; blood pressure is two ids). Phys fills unit, direction and the
rest in `data/indicators.csv`; the table above is the summary every other file
reads against.

Tiers: `A` measured by an instrument that flies, `B` self-reported, `C` explained
only (no in-flight measurement; never an input).

Systems (what the 3D body opens): `cardiovascular`, `respiratory`,
`thermoregulation`, `sleep`, `neuro_behavioural`, `metabolic`,
`musculoskeletal`, `radiation`.

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
`hazards`, `min_spread`, `tier`, `system`, `source`.

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
- `min_spread`: a number greater than 0, in the row's unit. The noise floor of
  the instrument: the smallest spread the baseline uses, so a flat history does
  not flag every small change. An engineering default, marked `Assumption` in
  `docs/findings/phys-02-baseline-state-rule.md`, not a clinical value.
- `tier`: `A`, `B` or `C` (section 2).
- `system`: one system from section 2; the 3D body uses it to group indicators.
- `source`: a link or the word `Assumption`. It must support every claim in the
  row, the hazards included; if the hazards need another source, add it
  separated by a space.

Example:

```csv
id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source
example_indicator,Example indicator,example_unit,higher,example measurement method,isolation_and_confinement,1,A,neuro_behavioural,Assumption
```

Valid when: one row per `id`, no duplicate `id`; `id` in section 2; `unit`
matches the unit in the section 2 table for that `id`; `direction` is `higher`,
`lower` or `both`; `min_spread` is a number greater than 0; `tier` is `A`, `B` or `C`; `system` is one of section 2;
`source` is a link or `Assumption`. This file holds no thresholds or medical
values.

### How each value is compared (team decision, Sat 14 Nov 15:37)

1. **Own baseline:** the median and spread of that person's entries for the
   indicator over the last 14 readings (moving window; team decision Sat 18:45). The spread is
   `max(1.4826 × median absolute deviation, min_spread)`; with fewer than 3
   entries the state is "no data yet", and a value more than 3 spreads from the
   median is "outside your usual range" (`docs/findings/phys-02-baseline-state-rule.md`).
   The app computes it from the stored history (REQ-27); no file holds it.
2. **Clinical or assumed limits:** the rows of `rules/attention.csv`, each with
   its source or `Assumption` and who is notified.
3. **Possible conditions:** `rules/conditions.csv`, shown as an evidence score
   from 0 to 1 with a three-step label and the signals behind it, never a
   percentage and never a certainty; the CMO or flight surgeon confirms
   (`docs/findings/bio2-02-evidence-score.md`). A signal adds 1 when its value
   crossed a row of `rules/attention.csv` on the signal's side, 0.5 when it is
   outside the person's baseline on that side, 0 otherwise; the score is the mean
   over the condition's signals, and fewer than 2 usable signals is "no data yet".
4. **Blood pressure:** one reading shows the worse of the systolic and the
   diastolic state (`docs/findings/bio2-01-pressure-state-rule.md`).

States the astronaut reads: no data yet · in your usual range · outside your
usual range · needs review (an attention row is crossed). Bio 2 writes the
final wording.

### `config/data/demo_data.csv`

Purpose: the synthetic measurements the demo shows, one row per entry. It uses
the same columns the app stores for a real entry (REQ-27), so the history view
works without real data (REQ-29).

Columns in order: `person_id`, `indicator_id`, `value`, `unit`, `mission_day`,
`time`, `context`.

- `person_id`: a lowercase `snake_case` id for a synthetic astronaut; the demo
  uses `demo_astronaut_1`.
- `indicator_id`: an id from `data/indicators.csv`.
- `value`: a number.
- `unit`: the same unit as the indicator's row in `data/indicators.csv`.
- `mission_day`: an integer; "day N" per `STANDARDS.md` §4.
- `time`: the 24-hour clock time `HH:MM`, per `STANDARDS.md` §4.
- `context`: `rest`, `after_exercise`, `on_waking` or `before_sleep`. A reading
  without its context is not comparable with another: heart rate and core
  temperature after exercise are a different population from the same values at
  rest.

Example:

```csv
person_id,indicator_id,value,unit,mission_day,time,context
demo_astronaut_1,example_indicator,1,example_unit,1,13:30,rest
```

Valid when: `indicator_id` exists in `data/indicators.csv`; `unit` matches that
indicator's unit; `value` is inside the range for that indicator in
`data/demo_ranges.csv`; `mission_day` is a positive integer; `time` is 24-hour
`HH:MM`; `context` is `rest`, `after_exercise`, `on_waking` or `before_sleep`.
These values are synthetic, so no `source` column is needed here — the
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

Purpose: when a result needs attention, per indicator, and who acts (REQ-05).
A range is two rows: one `below` bound and one `above` bound. Several rows on
the same side give steps (for example a crew step and a stricter CMO step).

Columns in order: `indicator_id`, `side`, `threshold`, `attention_level`,
`notify`, `source`.

- `indicator_id`: an id from `data/indicators.csv`.
- `side`: `below` or `above`: which side of `threshold` triggers this row.
- `threshold`: a number; its unit is the indicator's unit.
- `attention_level`: the name of this state, filled by Bio 2; the same names
  are the sub-headings in `content/<indicator_id>.md`.
- `notify`: who acts: `crew`, `cmo` or `flight_surgeon`, from least to most severe.
- `source`: a link or `Assumption`.

**When several rows match a value, the row with the most severe `notify` wins.**
For that to be safe, the steps must escalate in one direction: on `below`, a
lower threshold notifies the same or someone more severe; on `above`, a higher
threshold does. Example: with `below 37.5 crew` and `below 36.0 cmo`, a value of
35 matches both and `cmo` wins.

Example:

```csv
indicator_id,side,threshold,attention_level,notify,source
example_indicator,above,100,example_level,crew,Assumption
```

Valid when: `indicator_id` exists in `data/indicators.csv`; `side` is
`below` or `above`; `threshold` is a number; `notify` is `crew`, `cmo` or
`flight_surgeon`; the steps of each indicator and side escalate as above; no two
rows share indicator, side and threshold; `source` is a link or `Assumption`.
The threshold here is a placeholder: the real value and its source are filled
by Bio 2 (REQ-05).

### `config/rules/conditions.csv`

Purpose: what the astronaut may have, as an evidence score and never a
certainty (REQ-06). The app always adds "your CMO or flight surgeon confirms"
(`STANDARDS.md` §5); it is not stored per row. The score is computed from the
person's records with the rule in "How each value is compared", so no score is
stored here.

Columns in order: `condition_id`, `name`, `based_on`, `source`.

- `condition_id`: the id from section 2.
- `name`: plain name, sentence case.
- `based_on`: the signals this rests on, separated by spaces, each written
  `indicator_id:above` or `indicator_id:below`: the side of the person's range
  that counts for this condition. The side keeps two conditions on one
  indicator apart (hyperglycaemia `glucose_mgdl:above`, hypoglycaemia
  `glucose_mgdl:below`).
- `source`: a link or `Assumption`.

Example:

```csv
condition_id,name,based_on,source
example_condition,Example condition,example_indicator:above,Assumption
```

Valid when: `condition_id` in section 2; every signal in `based_on` is
`indicator_id:above` or `indicator_id:below`, its id exists in
`data/indicators.csv` and no id appears twice in one row; `source` is a link or
`Assumption`. A signal without a side is a warning, and an error under
`--strict`, until Bio 2 adds the sides.

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

### in_range

### outside_range

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
- `Status and next steps`: the short status text and the next step the
  astronaut reads (REQ-26), one `###` sub-section per state:
  - `### in_range` and `### outside_range`, always: the two baseline states the
    API returns (`backend/app/state.py`); `### no_data` is optional.
  - one `### <attention_level>` per level this indicator has in
    `rules/attention.csv` (question 4, REQ-05): the text for `needs_review`,
    told per level (for example `consult`, `urgent`, `watch`).
  No other `###` heading, and none twice. (Team decision Sat 21:05, so Bio 1's
  state texts and Bio 2's levels fit one file.)
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
### in_range
Example text for a value in the usual range, and its next step. Assumption.
### outside_range
Example text for a value outside the usual range, and its next step. Assumption.
### example_level
Example status text and example next step. Assumption.

## How to prevent problems
Example guidance, written by Bio 1 from Bio 2's findings (question 5, REQ-06). Assumption.

## Sources
- Example title: https://example.org
```

Valid when: the headings appear in this order; `### in_range` and `###
outside_range` are present; every other `###` heading is `no_data` or an
`attention_level` of this indicator in `rules/attention.csv`, with every level
present and no heading twice; every medical statement carries a
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

The team runs `python scripts/check_content.py` before every merge. A merge is
blocked when it reports any of these failures:

- **Missing file**: while the team fills `config/`, a missing required file
  listed in section 1 is a warning. `python scripts/check_content.py --strict`
  is the check for the final submission; under `--strict` a missing file
  blocks.
- **Unknown id**: an `id` in a file is not in the section 2 table, or an
  `indicator_id` / `condition_id` / `body_region_id` does not exist in its
  owning file.
- **Statement without source**: a row that holds a medical statement, a
  threshold or a probability has no `source`, or its `source` is neither a link
  nor the word `Assumption`.
- **Malformed row**: wrong number of columns, an empty required cell, a
  duplicate id, a `unit` that does not match the section 2 table for its `id`,
  a non-numeric `value`, `threshold`, `min` or `max`, a `side` that is not
  `below` or `above`, a `notify` that is not `crew`, `cmo` or `flight_surgeon`,
  a `direction` that is not `higher`, `lower` or `both`, a `time` that is not
  24-hour `HH:MM`, or a `mission_day` that is not a positive integer.
- **Attention steps out of order**: on one indicator and side, a more extreme
  threshold notifies someone less severe, or two rows share the same threshold.

## What is missing, by person

The formats above are ready; the lists are not. Each person sends their list
to Eng 1, who writes the ids into section 2 (`FORMATS.md` is his file), and
then fills their own files in `config/`.

**Phys** (`config/data/`)
- The indicators (REQ-03): for each one, `id`, name, unit, `direction`
  (`higher`, `lower` or `both`) and how it is measured on board, with a source.
- A scale for any indicator with no SI unit (for example mood or how strong a
  symptom is): its range and what each end means.
- Then `data/indicators.csv`, `data/demo_ranges.csv` and `data/demo_data.csv`
  (REQ-29).

**Bio 2** (`config/rules/`)
- The attention levels (REQ-05): how many and their names; Bio 1 uses the same
  names as headings.
- Who acts at each step (`notify`: `crew`, `cmo` or `flight_surgeon`) and the
  thresholds of each step, escalating as section 3 says.
- The possible conditions (REQ-06): `id`, name and the indicators each rests on,
  with a source.
- Then `rules/attention.csv` and `rules/conditions.csv`, once Phys has the
  indicator ids.

**Bio 1** (`config/content/`) starts each `content/<indicator_id>.md` once an
indicator id exists, from the findings of Phys (question 3) and Bio 2
(question 5).

**The whole team** answers the open questions below; without them, body regions,
symptoms, the camera and the probability method have no format yet.

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
