# Symptom test vectors for the condition score (T-78)

Sun 15 Nov 02:10. Bio 2. For Juli (backend) and Wambi (checker).

The format is in `FORMATS.md` section 3: `data/symptoms.csv`,
`data/symptom_log.csv`, and an optional fifth `symptoms` column in
`rules/conditions.csv` so a four-cell row stays valid.

## The rule

```
usable indicator: a value with a side in based_on
usable symptom:  a symptom id in the condition's symptoms column
                 and a row in symptom_log.csv for the same person and day

indicator evidence: 1 if it crossed attention.csv on the condition's side,
                    0.5 if it is outside the person's baseline on that side,
                    0 otherwise
symptom evidence:   1 if present, 0 if the log says it is absent
weight:             indicator 1, specific symptom 0.5, shared symptom 0.25

if no usable signal:                 no_data
if one usable signal and no boundary: no_data
score = sum(weight * evidence) / sum(weight)
if the score comes only from symptoms: cap at 0.5 (Possible)
if a red_flag symptom is present:     urgent, outside the score
```

An empty `symptom_log.csv` day is **no data**, not "no symptoms". The app asks
before it treats a symptom as absent. A symptom with no log row is skipped, not
counted as 0.

## Test vectors

| Case | Condition | Indicators | Symptoms | Expected |
| --- | --- | --- | --- | --- |
| Four-cell row, glucose in baseline | hypoglycaemia | glucose 110, inside baseline | none | `no_data` |
| Low glucose, no symptoms | hypoglycaemia | glucose 62, below 70 | none | score 1.0, Review |
| Low glucose plus sweating | hypoglycaemia | glucose 62 | sweating, specific | score 1.0, Review |
| Normal glucose plus sweating | hypoglycaemia | glucose 110, inside baseline | sweating, specific | score 0.33, Possible |
| No glucose, two specific symptoms | hypoglycaemia | none | shaky, sweating | score 1.0 capped to 0.5, Possible |
| No glucose, one symptom | hypoglycaemia | none | shaky | `no_data`; the UI still says "measure now" |
| Shared symptom only | hypoglycaemia | none | fatigue, shared | `no_data` (one symptom, capped) |
| Red flag with normal glucose | hypoglycaemia | glucose 110 | confusion, red flag | `urgent`; score ignored |
| Hypoglycaemia unawareness | hypoglycaemia | glucose 55 | none | score 1.0, Review |
| High glucose plus thirst and urination | hyperglycaemia | glucose 180 | thirst, frequent_urination | score 1.0, Review |
| High glucose plus vomiting | hyperglycaemia | glucose 180 | vomiting, red flag | `urgent` |
| Symptom not listed for the condition | hypoglycaemia | glucose 110 | thirst | thirst ignored; `no_data` |
| Unknown symptom id | any | any | `not_a_symptom` | row error at load |
| Duplicate symptom id | any | any | `shaky shaky` | row error at load |
| Four-cell row after the change | any | unchanged | no symptoms column | valid, same score as before |

## Checker cases

1. A four-cell `conditions.csv` row is valid; the missing fifth cell means no
   symptoms.
2. A five-cell row is valid only when every id in `symptoms` exists in
   `data/symptoms.csv` and no id repeats.
3. `symptoms.csv`: `red_flag` and `shared` are `yes` or `no`; `symptom_id` is
   lowercase snake_case; `source` is a link or `Assumption`; no duplicate id.
4. `symptom_log.csv`: `mission_day` is a positive integer; `time` is `HH:MM`;
   `severity` is 1, 2 or 3; `symptom_id` exists.
5. `labs.csv`: `phase` is `pre`, `in` or `post`; `status` is `scheduled`,
   `collected`, `pending` or `resulted`; `value` and `result_day` are present
   when `status` is `resulted`; `method` is not empty.

## What the UI says

- If the glucose value is missing and a symptom is present: "These symptoms can
  occur with low glucose. Measure your glucose now. If you cannot, call your
  CMO." It never says "you have hypoglycaemia".
- If a red flag is present: "Call your CMO now" before any score.
- If the score is symptom-only: the label stops at Possible.
- Every card carries "your CMO or flight surgeon confirms".
