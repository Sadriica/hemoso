# Format v2 · the five points, and what changes for each

Sat 14 Nov, 15:45. Answer to Eng 1's list for Phys, in his order. Points 1, 2 and 4
are done. Points 3 and 5 need a decision from him, because they touch `FORMATS.md`
and `scripts/check_content.py`, which are his.

## 1. Indicators with the sources of the hazards — done, no format change

`valid_source()` splits the cell on whitespace and accepts several links, so one
`source` cell can hold the measurement source and the hazard pages:

```
hr_bpm,...,gravity_fields,https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp https://www.nasa.gov/hrp/hazard-gravity-fields/
```

Every hazard named in a row now has its page in that row. Two entries were removed
because no page was read for them, and rule 4 says open the link before citing it:

| Row | Removed | Why |
| --- | --- | --- |
| `hr_bpm` | `radiation` | The only cardiac effect documented is a lifetime dose threshold, not a daily heart-rate signal. The page read is about cancer risk |
| `mood_1_5` | `distance_from_earth` | The page was not read. What drives mood in the sources read is isolation and confinement |

If Eng 1 wants them back, the URL is enough: `https://www.nasa.gov/hrp/hazard-distance-from-earth/`
and `https://www.nasa.gov/hrp/hazard-space-radiation/`. Both exist; neither was opened today.

## 2. `spo2_pct` and `sleep_quality_1_5` out of the demo — done

`demo_ranges.csv` and `demo_data.csv` were rebuilt for the seven ids: 210 rows,
30 days, seed 20261114. `check_content.py`: 0 errors.

## 3. What 1 and 5 mean for mood — decided, needs a home in the format

| Value | Meaning |
| --- | --- |
| 1 | Very low mood |
| 2 | Low |
| 3 | Neutral |
| 4 | Good |
| 5 | Very good |

The answer covers the whole day and is entered before sleep. It is an Assumption:
NASA asks about mood in the pre-sleep questionnaire but the page publishes no fixed
scale, so we define ours and say so.

Where it has to be visible: the astronaut has to know what 5 means before answering,
so it cannot live only in a note. Two options:

- **A (no format change):** `config/content/mood_1_5.md` states the scale at the top.
  Bio 1 writes the file. Free, but the app has to render it.
- **B (format change):** the section 2 `Notes` cell of `FORMATS.md` carries the anchors.

Recommendation: A now, B when `FORMATS.md` is opened for the other columns.

## 4. Moving window — done

`docs/findings/phys-02` now reads: the baseline is the last 14 readings before the
current one, recomputed on every entry. Three readings still start it. The limits
section says what the moving window hides: a change that lasts longer than the window
becomes the new usual, and that is why the history view keeps the whole series.

## 5. `min_spread` and `context` — yes to both, with these exact columns

### `config/data/indicators.csv`

```
id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source
```

| Column | Type | Valid values | Why it is worth the change |
| --- | --- | --- | --- |
| `min_spread` | number | greater than 0, in the row's unit | Without it, a crew member whose readings never move gets a spread of 0 and every 1-unit change is flagged. It is the noise floor of the instrument |
| `tier` | letter | `A`, `B` or `C` | Says at a glance what is measured, what is reported and what is only explained. It is what stops the app from pretending to measure glucose |
| `system` | id | must match `config/content/body_regions.csv` | It is the link between the 3D body and the data. Without it the body has nothing to open |

`min_spread` values (same table as phys-02, all Assumption):

| id | `min_spread` |
| --- | --- |
| `hr_bpm` | 4 bpm |
| `bp_sys_mmhg` | 5 mmHg |
| `bp_dia_mmhg` | 4 mmHg |
| `temp_core_c` | 0.2 °C |
| `sleep_h` | 0.5 h |
| `mood_1_5` | 0.5 |
| `glucose_mgdl` | 8 mg/dL |

### `config/data/demo_data.csv` and the entry model

```
person_id,indicator_id,value,unit,mission_day,time,context
```

| Column | Valid values |
| --- | --- |
| `context` | `rest`, `after_exercise`, `on_waking`, `before_sleep` |

Why: a core temperature taken after exercise is not the same reading as one taken on
waking, and the same holds for heart rate and oxygen saturation. Without `context`,
the baseline mixes two populations and every session of exercise looks like an
anomaly. It is also what the challenge means by measurements "as part of a routine".

Cost: one column in the table, one enum in the API, one default (`rest`) for entries
that do not say.

## What Eng 1 has to touch (about 10 minutes)

| File | Change |
| --- | --- |
| `FORMATS.md` §2 | add `min_spread`, `tier`, `system` to the indicators row; add the mood anchors |
| `FORMATS.md` §3 | the new column list for `indicators.csv` and for `demo_data.csv` |
| `scripts/check_content.py` | `INDICATORS_HEADER`, `DEMO_DATA_HEADER`, and four small rules: `min_spread` positive number; `tier` in A/B/C; `system` in the body region ids; `context` in the four values |
| `backend/` | accept and return `context`; store it with the entry |

## Order that keeps the build green

1. He changes `FORMATS.md` and `check_content.py` in one commit.
2. Phys commits the two CSVs with the new columns in the next commit.
3. Until step 1 lands, the CSVs stay at seven and six columns, which is what is in
   the repository now.
