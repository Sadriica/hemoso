# F-bio2-02 · A condition shows an evidence score, not a probability

**Status:** Draft
**Owner:** bio2
**Date:** Sat 14, 16:50
**Reviewed by:** _pending_

## Claim

Each possible condition shows an **evidence score** between 0 and 1 with a
three-step label and the list of signals behind it, never a percentage. The score
is the mean of one point scale over the signals the condition rests on: 0 if the
value is in the person's baseline, 0.5 if it is outside it, 1 if it crossed a
clinical boundary in `config/rules/attention.csv`.

## Why not a percentage

A percentage means "of 100 people like this one, N have the condition". That
number needs three things we do not have for astronauts: how common each
condition is, how often each signal appears when the condition is present, and
how often it appears without it. Writing "62 %" would look like science and be a
guess, which is what the judging criterion Validity punishes.

The statement asks for the condition "as probabilities, never as a certainty"
(`docs/DECISIONS.md`), and a transparent score satisfies that without inventing
calibration. NASA's own clinical decision support paper describes the system's
role as support for the clinician "not to react perfectly" but to give a second
opinion, which is the same limit.

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Russell et al., npj Microgravity 2023 | A clinical decision support system should "aid the clinician with a second opinion and provide reassurance that their approach is logical in the face of limited data" | Peer-reviewed | https://www.nature.com/articles/s41526-023-00284-1 |

## The rule

```
score(condition, record):
    signals = condition.based_on  with a usable value and a baseline
    if len(signals) < 2:            return no_data
    points = 0
    for each signal with value v:
        if v crossed a row in attention.csv:   points += 1
        elif v is outside the baseline:        points += 0.5
        else:                                  points += 0
    return points / len(signals)
```

Labels, and what the astronaut reads:

| Score | Label | Text |
| --- | --- | --- |
| 0 to 0.3 | Low | "Not likely with what you have recorded" |
| 0.3 to 0.6 | Possible | "Possible. These signals point to it: ..." |
| 0.6 to 1 | Review | "Ask your CMO or flight surgeon to check this" |

The app always adds that the CMO or the flight surgeon confirms. A signal with
no baseline yet is left out of the denominator, and with fewer than two signals
the condition shows "not enough data", never a low score.

## Every signal needs a side

`hyperglycaemia` and `hypoglycaemia` both rest on `glucose_mgdl`. Without a side,
a glucose of 180 mg/dL would add points to both, which is wrong: a high value
cannot support a low-glucose condition. The same happens with the pairs that
share all their inputs (`orthostatic_intolerance` and `dehydration`).

The score needs the side of each signal, so the file should write `based_on` as
`indicator_id:side`:

```csv
condition_id,name,based_on,source
hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,https://diabetes.org/about-diabetes/diagnosis
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
```

A value on the wrong side of the condition adds 0, whatever its distance from the
baseline. This is a change to `config/rules/conditions.csv` and to
`scripts/check_content.py`, so Eng 1 owns it; until then the file keeps the ids
alone and the app cannot separate a high from a low glucose.

Even with the side, two conditions that share every input score the same. The
condition needs one distinguishing signal (thirst or urine colour for
dehydration, a symptom for orthostatic intolerance) or the pair is merged.

## Test vectors

Orthostatic intolerance (`based_on`: `hr_bpm bp_sys_mmhg bp_dia_mmhg`):

| Heart rate | Systolic | Diastolic | Points | Score | Label |
| --- | --- | --- | --- | --- | --- |
| 68, in baseline | 118, in baseline | 75, in baseline | 0 + 0 + 0 | 0 | Low |
| 88, outside baseline | 110, in baseline | 75, in baseline | 0.5 + 0 + 0 | 0.167 | Low |
| 112, over 100 | 95, outside baseline | 62, in baseline | 1 + 0.5 + 0 | 0.5 | Possible |
| 130, over 100 | 88, over no row | 120, over no row | 1 + 0.5 + 0.5 | 0.667 | Review |
| one signal only, no baseline for the others | | | | - | no data |

## Confidence

Medium. The arithmetic is trivial and reproducible, but the equal weight of every
signal is an engineering choice, not a clinical one, and the score is not
calibrated against outcomes.

## What it changes in the solution

- `backend/`: one pure function per entry, with the vectors above as tests.
- `config/rules/conditions.csv`: no change; it already holds the signals each
  condition rests on.
- The interface shows the label, the score bar and the signals. No percentage
  anywhere.
- `FORMATS.md`: no new column needed while the weights stay equal.

## Limits and open questions

- **Equal weights.** A fever of 39 °C and a mood of 2 out of 5 count the same if
  both crossed a limit. If the team wants weights, they need a column and a
  justification per weight.
- **No calibration.** The labels are ordered, not measured. The pitch must say
  "evidence", not "probability", or a judge can ask for the false-positive rate
  and there is none.
- **The probability question stays open.** If the team later finds astronaut base
  rates, this score is replaced by a Bayesian model and this finding is retired.
- **The scale of mood and sleep is still undefined**, so those signals cannot
  produce a score until Phys and Bio 1 fix it.
