# format-v2 · ready to apply, already tested

The two files in this folder are the final versions of `config/data/indicators.csv`
and `config/data/demo_data.csv` with the columns we agreed. They are **not** in
`config/data/` on purpose: the current `check_content.py` rejects the new header, so
copying them now would turn the branch red for everyone.

## Proof that it works

A throwaway copy of the repository was made, `check_content.py` was patched with the
two header lines and the four validation rules below, and the files were run through
it:

```
0 error(s), 9 warning(s)     exit 0
tier ok: True | system ok: True | min_spread ok: True | context ok: True
```

The nine warnings are the content files Bio 1 and Bio 2 still owe. Nothing else.

## What is in the folder

| File | Rows | What changed against `config/data/` |
| --- | --- | --- |
| `indicators.csv` | 7 | adds `min_spread`, `tier`, `system` |
| `demo_data.csv` | 218 | adds `context`; 8 extra readings for heart rate and core temperature after exercise, to show why the column exists |

## Step 1 · Eng 1 patches `FORMATS.md`

Section "3. One section per file", under `config/data/indicators.csv`:

- Columns line, from
  `id`, `name`, `unit`, `direction`, `measured_on_board`, `hazards`, `source`
  to
  `id`, `name`, `unit`, `direction`, `measured_on_board`, `hazards`, `min_spread`, `tier`, `system`, `source`
- Three new bullets, after the `hazards` bullet:

```
- `min_spread`: a number greater than 0, in the row's unit. The noise floor of the
  instrument: the smallest change the app treats as a real change. Marked
  `Assumption` in this table because it is an engineering default, not a clinical
  value.
- `tier`: `A`, `B` or `C`. `A` is measured on board, `B` is reported by the crew
  member, `C` is explained and not measured. It says which indicators the app may
  present as a measurement.
- `system`: an id from `config/content/body_regions.csv`. It is what the 3D body
  opens.
```

Under `config/data/demo_data.csv`:

- Columns line, from `person_id`, `indicator_id`, `value`, `unit`, `mission_day`, `time`
  to the same plus `context`.
- New bullet:

```
- `context`: `rest`, `after_exercise`, `on_waking` or `before_sleep`. A reading
  without its context is not comparable with another: heart rate and core
  temperature after exercise are a different population from the same values at
  rest.
```

Section "2. Identifiers", in the `Notes` cell of the mood row, the anchors:

```
1 = very low, 2 = low, 3 = neutral, 4 = good, 5 = very good. About the whole day,
answered before sleep. Our scale: NASA asks about mood in the pre-sleep
questionnaire and publishes no fixed scale.
```

## Step 2 · Eng 1 patches `scripts/check_content.py`

Two header lines, verbatim:

```python
INDICATORS_HEADER = ["id", "name", "unit", "direction", "measured_on_board", "hazards", "min_spread", "tier", "system", "source"]
DEMO_DATA_HEADER = ["person_id", "indicator_id", "value", "unit", "mission_day", "time", "context"]
```

Four rules, inserted inside `check_indicators`, just before
`hazards = cells["hazards"].strip()`:

```python
        tier = cells["tier"].strip()
        if tier and tier not in ("A", "B", "C"):
            rep.error(f"{rel}:{line_no} tier must be A, B or C, got '{tier}'")
        spread = cells["min_spread"].strip()
        if spread:
            try:
                if float(spread) <= 0:
                    rep.error(f"{rel}:{line_no} min_spread must be greater than 0")
            except ValueError:
                rep.error(f"{rel}:{line_no} min_spread must be a number, got '{spread}'")
        system = cells["system"].strip()
        if system and not ID_RE.match(system):
            rep.error(f"{rel}:{line_no} invalid system id '{system}'")
```

For `context`, inside the row check of `check_demo_data`, the same shape:

```python
        ctx = cells["context"].strip()
        if ctx and ctx not in ("rest", "after_exercise", "on_waking", "before_sleep"):
            rep.error(f"{rel}:{line_no} context must be rest, after_exercise, on_waking or before_sleep, got '{ctx}'")
```

## Step 3 · Phys copies the two files

```bash
cp team/phys/notes/format-v2/indicators.csv config/data/indicators.csv
cp team/phys/notes/format-v2/demo_data.csv config/data/demo_data.csv
python scripts/check_content.py
```

Then every other owner is unaffected: Bio 1 writes the same seven content files, Bio 2
the same rules, and the backend only gains one nullable field with default `rest`.

## Order matters

If step 3 happens before step 2, `check_content.py` reports a wrong header and the
cross-check collapses: every row of `demo_ranges.csv` becomes an unknown indicator.
That is why the files stay here until the checker is ready.

## What is still open

`config/content/body_regions.csv` has no owner. `system` values used here are
`cardiovascular`, `thermoregulation`, `sleep`, `neuro_behavioural` and `metabolic`.
If that file names them differently, either the ids or the rows change, and the 3D
body shows the wrong region.
