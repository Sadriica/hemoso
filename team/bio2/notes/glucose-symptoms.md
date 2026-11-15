# Symptoms for the two glucose conditions (T-78)

Sun 15 Nov 06:10, Bio 2. Proposal for Phys (`symptoms.csv` is Phys's file) and the
exact five-column rows, ready to paste when the checker accepts them.

Why symptoms at all: the i-STAT is intermittent. Between two fingersticks the
astronaut can report what they feel, and a symptom can trigger a measurement.
It never replaces the value, and a symptom-only score caps at Possible.

## Rows for `config/data/symptoms.csv` (Phys)

Ids proposed here so that the condition rows below and the file match. If Phys
renames one, change both files in the same commit.

```csv
symptom_id,name,red_flag,shared,source
thirst,Thirst,no,no,https://diabetes.org/about-diabetes/warning-signs-symptoms
frequent_urination,Frequent urination,no,no,https://diabetes.org/about-diabetes/warning-signs-symptoms
blurred_vision,Blurred vision,no,no,https://diabetes.org/about-diabetes/warning-signs-symptoms
fatigue,Fatigue,no,yes,https://diabetes.org/about-diabetes/warning-signs-symptoms
vomiting,Vomiting,yes,no,https://diabetes.org/about-diabetes/warning-signs-symptoms
shakiness,Shakiness,no,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
sweating,Sweating,no,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
hunger,Hunger,no,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
confusion,Confusion,yes,yes,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
fast_heartbeat,Fast heartbeat,no,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
```

- `vomiting` and `confusion` are red flags: they escalate to the CMO or the
  flight surgeon without waiting for the score.
- `fatigue` and `confusion` are `shared` because both conditions list them, so
  they weigh 0.25 instead of 0.5.
- Both ADA pages were opened on Sun 15 Nov and describe these symptoms.

## Rows for `config/rules/conditions.csv`, five cells

The header gains `symptoms` between `based_on` and `source`. The other six
conditions keep four cells and stay valid.

```csv
condition_id,name,based_on,symptoms,source
hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,thirst frequent_urination blurred_vision fatigue vomiting,https://diabetes.org/about-diabetes/diagnosis
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shakiness sweating hunger confusion fast_heartbeat,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose
```

## The order that does not break the build

1. **Phys** creates `config/data/symptoms.csv` and `config/data/symptom_log.csv`
   with the ids above.
2. **Wambi** makes `scripts/check_content.py` accept four or five cells, checks
   every symptom id against `symptoms.csv`, and adds the header with `symptoms`.
3. **Bio 2**, in the same commit as step 2 or right after it, changes the header
   of `conditions.csv` and adds the two rows above.
4. **Juli** runs the backend tests on `eng2-symptoms` against the vectors in
   `team/bio2/notes/symptom-test-vectors.md`.

Doing step 3 before step 2 fails today: the checker requires exactly the four
columns of `CONDITIONS_HEADER`, so a five-column header is rejected.
