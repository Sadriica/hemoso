# F-phys-02 · The baseline state can be computed with a median and a spread, not with a model

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 15:50
**Reviewed by:** _pending_

## Claim

The four states of an indicator can be computed from a median and a scaled median
absolute deviation over a moving window of the crew member's last 14 readings: three
readings are enough, there are no parameters to train, and a reading more than 3
spreads from the median is "outside your usual range", not a diagnosis.

## Why this and not something else

| Option | Why not |
| --- | --- |
| A fixed range per indicator | No NASA source sets in-flight cut-offs (`docs/findings/phys-01`) |
| Mean and standard deviation | One bad reading (a failed sensor, a reading after exercise) moves both numbers |
| A trained model | Needs labelled flight data we do not have, and cannot be explained to a judge in 30 seconds |
| Median and MAD | Robust to one bad reading, needs 3 values, and every number can be recomputed by hand |

## The rule

```
baseline(previous[]):                       # previous = the readings before this one
    window = last 14 of previous
    if count(window) < 3:         return no_baseline
    median = median(values of window)
    mad    = median(abs(value - median) for value in window)
    spread = max(1.4826 * mad, min_spread[indicator])
    return (median, spread)

state(value, baseline, attention):
    if baseline is no_baseline:   return no_data
    if attention triggers on value: return needs_review    # only a cited clinical boundary
    if abs(value - median) <= 3 * spread: return in_range
    return outside_range
```

`1.4826` makes the scaled MAD comparable to a standard deviation for normally
distributed data. The window moves with every reading: the newest 14 values before
the current one, recomputed each time, so the rule follows a crew member who adapts
during the mission instead of freezing their first two weeks. `min_spread` is the
noise floor of the instrument, per indicator, and it is marked Assumption because it
is an engineering default, not a clinical value.

| Indicator | `min_spread` | Basis |
| --- | --- | --- |
| `hr_bpm` | 4 bpm | Assumption |
| `bp_sys_mmhg` | 5 mmHg | Assumption |
| `bp_dia_mmhg` | 4 mmHg | Assumption |
| `temp_core_c` | 0.2 °C | Assumption |
| `spo2_pct` | 1 % | Assumption |
| `sleep_h` | 0.5 h | Assumption |
| `sleep_quality_1_5` | 0.5 | Assumption |
| `mood_1_5` | 0.5 | Assumption |
| `glucose_mgdl` | 8 mg/dL | Assumption |

These are not thresholds. They answer "how much must a value move before we call it
a change", and 3 spreads on `hr_bpm` is 12 bpm, which no clinician would read as an
event.

## Test vectors (for the backend tests)

| Case | Baseline | Value | Clinical boundary | Expected |
| --- | --- | --- | --- | --- |
| Two readings only | none | 72 | none | `no_data` |
| Typical day | median 70, spread 4 | 72 | none | `in_range` |
| One point outside | median 70, spread 4 | 85 | none | `outside_range` |
| Exactly on the edge | median 70, spread 4 | 82 | none | `in_range` |
| One past the edge | median 70, spread 4 | 83 | none | `outside_range` |
| Flat history | median 70, spread 0 | 70 | none | `in_range` |
| Flat history, one jump | median 70, spread 0 | 71 | none | `outside_range` |
| Clinical boundary first | median 120, spread 5 | 182 | 180 mmHg | `needs_review` |
| Boundary not reached | median 120, spread 5 | 175 | 180 mmHg | `outside_range` |

The `needs_review` case only exists where `config/rules/attention.csv` has a row
with a source (Bio 2). Without that row, the state stops at `outside_range`.

## Confidence

Medium, because the arithmetic is standard and reproducible, but the choice of 3
spreads and of each `min_spread` is an engineering default, not a validated clinical
rule.

## What it changes in the solution

- The status function in `backend/`: one pure function, around 20 lines, no state
  and no model. Eng 1 owns the code; these vectors are its tests.
- `FORMATS.md` section 2: one more column, `min_spread`, with the table above.
- `config/rules/attention.csv`: the only place a `needs_review` can come from.

## Limits and open questions

- The window length is a choice. Fourteen readings covers two weeks of daily entries,
  so a short demo needs three readings before anything is shown, which is honest but
  must be explained in the pitch.
- A real change may be a slow drift, not a jump. A moving window follows the drift
  after a few readings; it does not forecast, and the app must not pretend to.
- The window hides a change that lasts longer than 14 readings: if a value settles at
  a new level, the window eventually calls it usual. That is intended, and it is why
  the history view keeps the whole series.
- No trend, no probability and no diagnosis comes out of this rule, by design.
