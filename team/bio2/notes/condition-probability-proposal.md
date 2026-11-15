# How to compute the condition probabilities (REQ-06)

> **Superseded on Sat 14 Nov 18:05.** The team decided a condition shows an
> **evidence score with a label, never a percentage**; the method and its test
> vectors are in `docs/findings/bio2-02-evidence-score.md`. The direction
> syntax and the `no_data` rule of this note are still useful.

Sat 14 Nov 17:40. Proposal for the team. Nothing here is implemented in
`config/rules/conditions.csv`; the format says the probability columns are
added when the team answers this question.

## The problem

`conditions.csv` says which indicators support each condition, but not how to
turn a set of readings into a percentage. A fixed percentage per condition
would not use the person's records. A trained model needs labelled flight data
that the team does not have, and no judge can check it in 30 seconds.

The method must also handle three cases that the current rows expose:

- `hyperglycaemia` and `hypoglycaemia` both rest on `glucose_mgdl`. Without a
  direction, a high and a low value would support both conditions.
- `orthostatic_intolerance` and `dehydration` rest on the same three indicators.
  Any formula will give them the same number until one condition gets a
  different input.
- `sleep_debt` and `low_mood` rest on `sleep_h` and `mood_1_5`. They have the
  same problem.

## Proposed method: an evidence score shown as a percentage

The score is built from the files the app already reads: the person's own
baseline (F-phys-02) and the boundaries in `attention.csv`. It is transparent,
needs no training, and every step can be recomputed by hand.

### 1. Give each condition a direction

Change each entry in `based_on` to `indicator_id:side`, where `side` is
`above` or `below`. Example:

```csv
condition_id,name,based_on,source
fever,Fever,temp_core_c:above hr_bpm:above,https://ntrs.nasa.gov/api/citations/20230012738/downloads/JSC%2022538%20Health%20Stabilization%20Program%20Rev%20F%20Clean.pdf
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
orthostatic_intolerance,Orthostatic intolerance,hr_bpm:above bp_sys_mmhg:below bp_dia_mmhg:below,http://humanresearchroadmap.nasa.gov/Evidence/reports/ORTHO.pdf
```

A value on the wrong side of the condition's pattern adds nothing. This fixes
the high/low glucose collision without a second file.

### 2. Score one indicator

For one indicator and one reading:

| Situation | Evidence |
| --- | --- |
| No reading | `no_data` |
| A `watch` row matches | 1 |
| A `consult` row matches | 2 |
| An `urgent` row matches | 3 |
| No boundary crossed, inside the person's usual range | 0 |
| No boundary crossed, outside the usual range (more than 3 spreads from the median) | 1 |
| No boundary crossed and no baseline yet | `no_data` |

When several rows match, the most severe row wins, as `FORMATS.md` says.
A clinical boundary does not need a baseline; the baseline only answers "is
this outside your usual range". `no_data` is not zero: the app must say "not
enough data", not "0%".

### 3. Combine the indicators of one condition

```
values = [evidence(i) for i in based_on if evidence(i) is not no_data]
if values is empty:
    probability = no_data
else:
    probability = min(95, round(100 * sum(values) / (3 * count(values))))
```

The upper cap is 95%. The app never shows 100% for a condition, because the
CMO or flight surgeon confirms it. The percentage is an estimate, not a
calibrated probability; the interface says so next to the number.

### 4. Show the basis

The astronaut sees the number, the inputs and the source of each boundary:

> Possible: fever, 67%. Based on: core temperature 38.4 °C (above 38.0, consult)
> and heart rate 102 bpm (above 100, consult). Your CMO or flight surgeon
> confirms.

The list of inputs is not optional. REQ-06 asks for probabilities with what
they are based on, not a bare percentage.

## Worked examples

| Condition | Readings | Evidence | Result |
| --- | --- | --- | --- |
| Fever | temp 38.4 °C (consult), HR 102 bpm (consult) | 2 + 2 | 67% |
| Fever | temp 39.5 °C (urgent), HR 105 bpm (consult) | 3 + 2 | 83% |
| Hypoglycaemia | glucose 60 mg/dL (consult) | 2 | 67% |
| Hypoglycaemia | glucose 60 mg/dL (consult), no baseline yet | 2 | 67% |
| Orthostatic intolerance | HR 108 bpm (consult), systolic 96 mmHg (outside baseline) | 2 + 1 + `no_data` | 50% |
| Sleep debt | sleep 5 h (watch), mood 2 (watch) | 1 + 1 | 33% |

The last row shows why the missing-data rule matters: a condition with three
indicators and one missing reading is scored on the two it has, not on three.

## What the team must decide

1. The direction syntax in `based_on` (or an extra column).
2. The evidence values 0/1/2/3 and the 95% cap. They are a display convention,
   not a medical claim: Assumption.
3. What to do with the two pairs of conditions that share all their inputs.
   Options: merge them, or add a distinguishing input (for example thirst and
   urine colour for dehydration, or a symptom for orthostatic intolerance).
4. Whether the sentence "estimated probability, not a diagnosis" is enough for
   the interface, or whether the screen should say "evidence score" instead of
   "probability".

## Rejected options

| Option | Why not |
| --- | --- |
| A fixed percentage per condition in the file | It ignores the person's records and cannot change with a reading |
| A trained model | No labelled flight data; not explainable in the demo |
| A Bayesian network with priors | The priors would be invented, and the result would look more precise than the evidence |
| Counting only `attention.csv` rows | It would miss a value outside the person's baseline but below every published boundary |

## What this needs from the other files

- `attention.csv`: at least one row per indicator, which is in place (REQ-05).
- `conditions.csv`: the direction syntax, once the team agrees.
- `indicators.csv`: the `min_spread` floor and the mood scale, both in place
  (team decision Sat 16:10).
- `F-phys-02`: the median and spread rule, already drafted.
- `FORMATS.md` section 2: the condition ids and the chosen syntax.

The proposal answers "how" without inventing a medical number. The only new
numbers are the evidence values and the cap, and both are marked Assumption.
