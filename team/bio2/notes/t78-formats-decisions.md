# T-78 formats and decisions (for Wambi's checker)

Sun 15 Nov 05:58. Bio 2. This is the text Wambi needs for the four-or-five-column
checker. The full symptom rows are in `glucose-symptoms.md`; the score cases are
in `symptom-test-vectors.md`.

## `config/data/symptoms.csv`

Header, exactly:

```csv
symptom_id,name,red_flag,shared,source
```

- `symptom_id`: lowercase `snake_case`, starts with a letter; not an indicator
  id.
- `name`: plain name, sentence case.
- `red_flag`: `yes` or `no`. `yes` escalates to the CMO or flight surgeon
  without waiting for the score.
- `shared`: `yes` or `no`. `yes` when more than one condition lists it; it
  weighs 0.25 instead of 0.5.
- `source`: a link or `Assumption`.
- One row per `symptom_id`, no duplicate.

The ten ids for the glucose conditions: `thirst`, `frequent_urination`,
`blurred_vision`, `fatigue`, `vomiting`, `shakiness`, `sweating`, `hunger`,
`confusion`, `fast_heartbeat`. `vomiting` and `confusion` are `red_flag=yes`;
`fatigue` and `confusion` are `shared=yes`.

## `config/data/symptom_log.csv`

Header, exactly:

```csv
person_id,mission_day,time,symptom_id,severity
```

- `person_id`: lowercase `snake_case`.
- `mission_day`: positive integer.
- `time`: 24-hour `HH:MM`.
- `symptom_id`: an id from `symptoms.csv`.
- `severity`: `1` (mild), `2` (moderate) or `3` (severe).
- No `source` column: the observation is the report; the definition carries the
  source in `symptoms.csv`.
- An empty day is **no data**, not "no symptoms". A symptom with no log row is
  skipped, never counted as zero.

## `config/rules/conditions.csv`: optional fifth column

Header when the checker accepts it:

```csv
condition_id,name,based_on,symptoms,source
```

- A row with **four cells** is valid and means no symptom signals.
- A row with **five cells** names symptoms separated by spaces.
- Every id in `symptoms` must exist in `symptoms.csv` and not repeat.
- Until the checker is in `main`, the file keeps four columns; the header gains
  `symptoms` in the same change that teaches the checker the fifth column.

The two glucose rows, ready for that change:

```csv
condition_id,name,based_on,symptoms,source
hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,thirst frequent_urination blurred_vision fatigue vomiting,https://diabetes.org/about-diabetes/diagnosis
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shakiness sweating hunger confusion fast_heartbeat,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
```

The other conditions keep four cells, for example:

```csv
orthostatic_intolerance,Orthostatic intolerance,hr_bpm:above bp_sys_mmhg:below bp_dia_mmhg:below,,http://humanresearchroadmap.nasa.gov/Evidence/reports/ORTHO.pdf
```

## How a symptom adds to the score

```
usable indicator: a value with a side in based_on
usable symptom:  a symptom id in the condition's symptoms column
                 and a row in symptom_log.csv for the same person and day

indicator evidence: 1 if it crossed attention.csv on the condition's side,
                    0.5 if outside the baseline on that side, 0 otherwise
symptom evidence:   1 if present
weight:             indicator 1, specific symptom 0.5, shared symptom 0.25

if no usable signal:                  no_data
if one usable signal and no boundary: no_data
score = sum(weight * evidence) / sum(weight)
if the score comes only from symptoms: cap at 0.5 (Possible)
if a red_flag symptom is present:      urgent, outside the score
```

A clinical boundary counts on its own: a glucose of 55 mg/dL is Review even with
no symptoms, because hypoglycaemia unawareness exists. A symptom-only score never
reaches Review. The app always adds "your CMO or flight surgeon confirms".

## Examples

- Glucose 62 + sweating: 1.0, Review.
- Glucose 110 + sweating: 0.33, Possible.
- No glucose + shakiness + sweating: 1.0 capped to 0.5, Possible; the UI says
  "Measure your glucose now."
- No glucose + one symptom: `no_data`; the UI still asks for a measurement.
- Glucose 55, no symptoms: 1.0, Review.
- Confusion or vomiting: urgent, score ignored.

The full test vectors are in `symptom-test-vectors.md`.
