# F-bio2-01 · Blood pressure reports the worse of its two numbers

**Status:** Draft
**Owner:** bio2
**Date:** Sat 14, 16:45
**Reviewed by:** _pending_

## Claim

For one reading, the state is the **worse** of the state of the systolic and the
state of the diastolic value, computed on the average of at least two readings.
A reading of 120/95 is therefore "needs review", not "in range".

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| WHO, Hypertension (25 Sep 2025) | "Hypertension is when blood pressure is consistently 140/90 mmHg or higher", measured on two different days; values of 180/120 or higher with symptoms need care at once | Reference | https://www.who.int/news-room/fact-sheets/detail/hypertension |
| ACC/AHA 2017 categories | Stage 2 is a systolic of at least 140 **or** a diastolic of at least 90; "individuals with SBP and DBP in 2 categories should be designated to the higher BP category" | Reference | https://www.acc.org/about-acc/press-releases/2017/11/13/15/35/high-blood-pressure-redefined-for-first-time-in-14-years-130-is-the-new-high |

Both sources state the rule across the two numbers, and both resolve a mixed
reading upward. No source puts a single number above the other.

## The rule

```
state(reading, attention):
    s = state_of(value = systolic, rows = attention[bp_sys_mmhg])
    d = state_of(value = diastolic, rows = attention[bp_dia_mmhg])
    return worse(s, d)          # order: none < consult < urgent
```

It needs no new column: the two rows already exist in
`config/rules/attention.csv`, one per indicator, and the combination is one line
in the backend.

## Test vectors (for the backend tests)

| Systolic | Diastolic | Expected state | Why |
| --- | --- | --- | --- |
| 118 | 75 | none | No row triggers |
| 120 | 95 | consult | Diastolic 95 is the worse of the two |
| 150 | 70 | consult | Systolic 150 is the worse of the two |
| 145 | 118 | consult | Both consult, neither reaches 180/120 |
| 185 | 100 | urgent | Systolic 185 wins |
| 120 | 125 | urgent | Diastolic 125 wins |

## Confidence

Medium, because both sources are terrestrial adult populations and neither was
validated in microgravity, and because the guideline applies to an average of two
or more readings, not to a single one.

## What it changes in the solution

- `backend/`: the status function returns the worse of the two states for a
  blood-pressure entry (Eng 1 owns the code; the vectors above are its tests).
- `config/rules/attention.csv`: the rows for `bp_sys_mmhg` and `bp_dia_mmhg`
  (already written).
- The interface shows both numbers and one state, with the source next to it
  (REQ-10).

## Limits and open questions

- **One reading is not enough.** The WHO and ACC/AHA rules use an average of at
  least two readings. If the app evaluates a single entry, the row fires early.
  The backend should combine the last two readings of the same session, or the
  interface must say "one reading".
- **Microgravity.** Without a hydrostatic column the arm cuff does not read what
  it reads on Earth. This supports the per-person baseline (F-phys-01) and is a
  reason to show a source and a review, never a diagnosis.
- **Mean arterial pressure.** `MAP = diastolic + (systolic - diastolic)/3` is the
  pressure that perfuses organs and it may be worth showing as a derived value.
  It is not used as a threshold here because no source in the repository sets a
  cut-off in flight.
- A different reading of the same evidence would be to evaluate only systolic.
  It is rejected because it misses 120/95, which both sources classify as
  hypertension.
