# F-phys-02 · The baseline state can be computed with a median and a spread, not with a model

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 15:50
**Reviewed by:** _pending_

## Claim

The four states of an indicator can be computed from a median and a scaled median
absolute deviation over a moving window of the crew member's last 14 mission days
that hold a reading in the context, one mean per day: three days are enough, there
are no parameters to train, and a reading more than 3 spreads from the median is
"outside your usual range", not a diagnosis.

## Why this and not something else

| Option | Why not |
| --- | --- |
| A fixed range per indicator | No NASA source sets in-flight cut-offs (`docs/findings/phys-01`) |
| Mean and standard deviation | One bad reading (a failed sensor, a reading after exercise) moves both numbers |
| A trained model | Needs labelled flight data we do not have, and cannot be explained to a judge in 30 seconds |
| Median and MAD | Robust to one bad reading, needs 3 values, and every number can be recomputed by hand |

## The rule

```
baseline(previous[]):                # previous = the readings before this one, same context
    days  = the last 14 mission days of previous that hold a reading
    daily = mean of that day's readings, one value per day in days
    if count(daily) < 3:          return no_baseline
    median = median(daily)
    mad    = median(abs(value - median) for value in daily)
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
distributed data. The window moves with every reading: the newest 14 mission days
that hold a reading before the current one, recomputed each time, so the rule follows
a crew member who adapts during the mission instead of freezing their first two weeks.
Each day counts once, as the mean of that day's readings in the same context: a day
with three readings does not weigh three times as much as a quiet day, and a day
without a reading does not empty the window. The reading under test is never part of
its own baseline, because `previous` stops before it. `min_spread` is the
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

## Window test vectors

The cases below test the window of the rule, not the state order above. Every
reading is a resting reading, in the same `context`, and the history stops before the
tested reading. The numbers come from `1.4826 × MAD`, the `min_spread` floor and 3
spreads; the spread shown is rounded to 4 decimals and the comparison uses the
unrounded value. Wambi turns this table into the shared fixture, and the backend and
the frontend test against it.

| Case | Indicator, `min_spread` | History before the reading | Daily values in the window | Median | Spread | n | Test value | Expected |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| One day with several readings | `glucose_mgdl`, 8 | day 1: 120 at 07:30, 120 at 13:00, 120 at 20:00; day 2: 100; day 3: 100 | 120, 100, 100 | 100 | 8 (floor) | 3 | day 4, 07:30: 125 | `outside_range` |
| Gap between days | `glucose_mgdl`, 8 | day 1: 100; day 2: 96; day 3: 104; day 10: 100; day 11: 104 | 100, 96, 104, 100, 104 | 100 | 8 (floor) | 5 | day 12, 07:30: 118 | `in_range` |
| More than 14 days, the oldest drop | `hr_bpm`, 4 | days 1–4: 60, 62, 60, 61; days 5–18: 70 to 96 in steps of 2 | 70, 72, … 96 (14 values, days 5–18) | 83 | 10.3782 | 14 | day 19, 07:30: 45 | `outside_range` |
| Fewer than 3 days | `glucose_mgdl`, 8 | day 1: 100; day 2: 100 | 100, 100 | 100 | 8 (floor) | 2 | day 3, 07:30: 150 | `no_data` |
| The tested reading left out | `hr_bpm`, 4 | days 1–14: 70 to 96 in steps of 2 | 70, 72, … 96 (14 values) | 83 | 10.3782 | 14 | day 15, 07:30: 115 | `outside_range` |
| The `min_spread` floor | `glucose_mgdl`, 8 | days 1–4: 96, 100, 104, 100 | 96, 100, 104, 100 | 100 | 8 (floor) | 4 | day 5, 07:30: 110 | `in_range` |
| Three days, wide MAD | `hr_bpm`, 4 | day 1: 70; day 2: 80; day 3: 100 | 70, 80, 100 | 80 | 14.826 | 3 | day 4, 07:30: 125 | `outside_range` |

What each case pins down:

- **One day with several readings.** With the daily mean, the median is 100 and 125
  is 25 away, one past the band of 24. Counting the three readings of day 1 as three
  values would put the median at 120, and the same 125 would read `in_range`.
- **Gap between days.** Days 4 to 9 hold nothing and the window still has 5 days: the
  window counts days with a reading, not calendar days. The median absolute deviation
  is 4, `1.4826 × 4 = 5.9304`, below the floor, so the spread is 8.
- **More than 14 days.** Days 5 to 18 fill the window and days 1 to 4 drop out. Keeping
  all 18 days would give a median of 79 and a band of 40.0302, and 45 bpm would read
  `in_range` instead of `outside_range`.
- **Fewer than 3 days.** The count is checked before any comparison: 150 mg/dL is far
  from 100, and the state is still `no_data`.
- **The tested reading left out.** Its own value must not move the baseline that judges
  it. Counted in its own window, day 15 would give a median of 85, and 115 bpm would
  read `in_range`.
- **The floor.** The MAD is 2, so `1.4826 × 2 = 2.9652`, below the floor of 8. Without
  the floor the band would be 8.8956 and 110 mg/dL would read `outside_range`.
- **Three days, wide MAD.** The fewest days the rule accepts, with a spread the floor
  does not touch: the band is 44.478, so 125 bpm is outside and 124 is inside.

## Confidence

Medium, because the arithmetic is standard and reproducible, but the choice of 3
spreads and of each `min_spread` is an engineering default, not a validated clinical
rule.

## What it changes in the solution

- The status function in `backend/`: one pure function, around 20 lines, no state
  and no model. Eng 1 and Eng 2 own the code; both vector tables are its tests. The
  order of the three checks is part of the contract: attention, then baseline, then
  range.
- `FORMATS.md` section 2: one more column, `min_spread`, with the table above.
- `config/rules/attention.csv`: the only place a `needs_review` can come from, and only
  when the row carries a link.

## Limits and open questions

- The safety order only works once `attention.csv` has rows with sources. With the
  file empty, nothing can reach `needs_review` and the first reading still says "no
  data yet". The order alone does not create the alarm; the sourced row does.
- The window counts days that hold a reading, not calendar days. A week without a
  record does not push the older days out, so a gap keeps the baseline longer than a
  calendar window would; a day with three readings counts once, as their mean. That is
  what makes "the last 14 days that hold a reading" one rule in both this finding and
  `FORMATS.md` section 3.
- Three days are enough to start, so a short demo is undecided for the first days.
  That is honest and must be explained in the pitch.
- A real change may be a slow drift, not a jump. A moving window follows the drift
  after a few readings; it does not forecast, and the app must not pretend to.
- The window hides a change that lasts longer than 14 days: if a value settles at
  a new level, the window eventually calls it usual. That is intended, and it is why
  the history view keeps the whole series.
- No trend, no probability and no diagnosis comes out of this rule, by design.

## Sources

- WHO, Hypertension (140/90 mmHg on two days; 180/120 with symptoms needs care): https://www.who.int/news-room/fact-sheets/detail/hypertension
- NASA-STD-3001 Vol 1 Rev C, limits relative to pre-mission values: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf

