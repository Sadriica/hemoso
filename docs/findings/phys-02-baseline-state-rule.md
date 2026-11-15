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
baseline(previous[]):                # previous = the readings before this one
    window = readings of the last 14 days, at most one per day and indicator
    if count(window) < 3:         return no_baseline
    median = median(values of window)
    mad    = median(abs(value - median) for value in window)
    spread = max(1.4826 * mad, min_spread[indicator])
    return (median, spread)

state(value, baseline, attention):
    # 1. safety first: a cited limit is absolute, a baseline is personal
    if attention has a row with a link, crossed by value: return needs_review
    # 2. nothing to compare the value with yet
    if baseline is no_baseline:   return no_data
    # 3. the person's own range
    if abs(value - median) <= 3 * spread: return in_range
    return outside_range
```

The order of the checks is a safety decision taken on Sat 14 Nov with Bio 2 and Eng 2.
A reading that crosses a limit with a source goes to `needs_review` even when there
is no baseline: a core temperature of 39.5 °C on the first day of a mission is not
"no data yet". A row whose source is `Assumption` does **not** trigger this, because
an invented limit must never raise an alarm on its own.

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
| `sleep_h` | 0.5 h | Assumption |
| `mood_1_5` | 0.5 | Assumption |
| `glucose_mgdl` | 8 mg/dL | Assumption |

These are not thresholds. They answer "how much must a value move before we call it
a change", and 3 spreads on `hr_bpm` is 12 bpm, which no clinician would read as an
event.

## Test vectors (for the backend tests)

| Case | Baseline | Value | Clinical boundary | Expected |
| --- | --- | --- | --- | --- |
| Two readings only | none | 72 | none | `no_data` |
| **No baseline, cited limit crossed** | none | 39.5 | 39.0 °C with a link | **`needs_review`** |
| **No baseline, Assumption limit crossed** | none | 39.5 | 39.0 °C, `Assumption` | **`no_data`** |
| **No baseline, below any limit** | none | 37.0 | 39.0 °C with a link | **`no_data`** |
| Typical day | median 70, spread 4 | 72 | none | `in_range` |
| One point outside | median 70, spread 4 | 85 | none | `outside_range` |
| Exactly on the edge | median 70, spread 4 | 82 | none | `in_range` |
| One past the edge | median 70, spread 4 | 83 | none | `outside_range` |
| Flat history | median 70, spread 0 | 70 | none | `in_range` |
| Flat history, one jump | median 70, spread 0 | 71 | none | `outside_range` |
| Clinical boundary with baseline | median 120, spread 5 | 182 | 180 mmHg | `needs_review` |
| Boundary not reached | median 120, spread 5 | 175 | 180 mmHg | `outside_range` |

The three bold cases are the ones the new order adds: the same value gives a
different state depending on whether the limit has a source. The `needs_review` case
only exists where `config/rules/attention.csv` has a row (Bio 2).

## Confidence

Medium, because the arithmetic is standard and reproducible, but the choice of 3
spreads and of each `min_spread` is an engineering default, not a validated clinical
rule.

## What it changes in the solution

- The status function in `backend/`: one pure function, around 20 lines, no state
  and no model. Eng 1 and Eng 2 own the code; these vectors are its tests. The order
  of the three checks is part of the contract: attention, then baseline, then range.
- `FORMATS.md` section 2: one more column, `min_spread`, with the table above.
- `config/rules/attention.csv`: the only place a `needs_review` can come from, and only
  when the row carries a link.

## Limits and open questions

- The safety order only works once `attention.csv` has rows with sources. With the
  file empty, nothing can reach `needs_review` and the first reading still says "no
  data yet". The order alone does not create the alarm; the sourced row does.
- The window is counted in readings, not in calendar days. A crew member who records
  twice on one day moves the window twice, which is why the interval is capped at one
  reading per day and indicator: that makes the 14 readings of this rule the same
  thing as the 14 days written in `FORMATS.md`.
- Three readings are enough to start, so a short demo is undecided for the first days.
  That is honest and must be explained in the pitch.
- A real change may be a slow drift, not a jump. A moving window follows the drift
  after a few readings; it does not forecast, and the app must not pretend to.
- The window hides a change that lasts longer than 14 readings: if a value settles at
  a new level, the window eventually calls it usual. That is intended, and it is why
  the history view keeps the whole series.
- No trend, no probability and no diagnosis comes out of this rule, by design.

## Sources

- WHO, Hypertension (140/90 mmHg on two days; 180/120 with symptoms needs care): https://www.who.int/news-room/fact-sheets/detail/hypertension
- NASA-STD-3001 Vol 1 Rev C, limits relative to pre-mission values: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

