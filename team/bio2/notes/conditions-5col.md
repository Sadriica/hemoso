# `conditions.csv` with five cells (ready for the symptom file)

Sun 15 Nov 06:05. Bio 2. Apply this in one commit as soon as Phys uploads
`config/data/symptoms.csv`. The checker in `main` accepts four or five columns,
but the backend and front read by column name: a four-cell row under a
five-column header leaves `source` empty and the front drops it. Every row must
have five cells, with an empty `symptoms` cell when the condition has none.

Header and rows, exactly:

```csv
condition_id,name,based_on,symptoms,source
orthostatic_intolerance,Orthostatic intolerance,hr_bpm:above bp_sys_mmhg:below bp_dia_mmhg:below,,http://humanresearchroadmap.nasa.gov/Evidence/reports/ORTHO.pdf
fever,Fever,temp_core_c:above hr_bpm:above,,https://ntrs.nasa.gov/api/citations/20230012738/downloads/JSC%2022538%20Health%20Stabilization%20Program%20Rev%20F%20Clean.pdf
sleep_debt,Sleep debt,sleep_h:below mood_1_5:below,,https://academic.oup.com/sleep/article/45/3/zsac006/6505235
hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,thirst frequent_urination blurred_vision fatigue vomiting,https://diabetes.org/about-diabetes/diagnosis
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shakiness sweating hunger confusion fast_heartbeat,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
dehydration,Dehydration,hr_bpm:above bp_sys_mmhg:below,,Assumption
low_mood,Low mood,mood_1_5:below,,Assumption
current_state,How you are today,reaction_median_ms:above reaction_lapses:above mood_1_5:below sleep_h:below,,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
```

The symptom ids must match `config/data/symptoms.csv`. The ten ids are in
`glucose-symptoms.md`; `vomiting` and `confusion` are red flags, and `fatigue`
and `confusion` are shared. If Phys renames one, change both files in the same
commit.

Before committing, run:

```bash
python scripts/check_content.py
```

It must report 0 errors. The two missing reaction content files are warnings and
do not block this file.
