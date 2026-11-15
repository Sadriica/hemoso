# What to add to the current build

Sat 14 Nov 23:22. Bio 2. Proposal for Wambi, Phys and Bio 1.

The build already has seven indicators, twelve attention rows, eight conditions
with the evidence score, the `current_state` condition waiting for two reaction
indicators, the three-phase interface, face sign-in and the history chart. This
note keeps that shape and adds only what completes it.

## 1. What complements the build

| Proposal | Complements | Verdict |
| --- | --- | --- |
| Reaction time and lapses | The `current_state` condition Wambi asked for (REQ-38) | **Add now** |
| Daily mood, stress, fatigue, sleep quality | `current_state`, `sleep_debt`, `low_mood` | **Add mood is in; add the other three only if Bio 1 has time** |
| Pre-mission baseline and trait profile | `F-phys-02` cold start and the person's own range | **Add as a static card after the core** |
| Appetite, fluid intake, body mass | `metabolic` system and the challenge's "inadequate nutrition" | **Add now, three rows** |
| Symptoms of hyper- and hypoglycaemia | The two glucose conditions and the intermittent i-STAT value | **Add as a symptom layer; format change** |
| Blood and urine hormones | The profile, not the daily loop | **Later; four analytes, static** |
| Video or face mood detection | Nothing: face sign-in is identification, not affect | **Do not add** |
| Crew rating each other's mood | Nothing: bias and privacy | **Do not add** |
| Daily calorie target or full hormone panel | Nothing: false precision and scope | **Do not add** |

## 2. Add now: complete `current_state`

`team/bio2/notes/req38-current-state.md` already has the row; it is blocked by
two missing indicators. Phys adds them:

```csv
reaction_median_ms,Reaction time median,ms,higher,3-minute PVT on the tablet,isolation_and_confinement,20,A,neuro_behavioural,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
reaction_lapses,Reaction time lapses,count,higher,3-minute PVT on the tablet,isolation_and_confinement,1,A,neuro_behavioural,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
```

`min_spread` 20 ms and 1 lapse are engineering defaults (Assumption), not
clinical values. The source supports slower median and more lapses after sleep
loss; it does not combine them with mood. The combination is the team's
decision, as the note says.

Then the condition enters `config/rules/conditions.csv`:

```csv
current_state,How you are today,reaction_median_ms:above reaction_lapses:above mood_1_5:below sleep_h:below,,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
```

The name is a question, not a label. The interface says "How you are today" and
"your CMO or flight surgeon confirms", never "fatigued" or "unfit".

If Bio 1 has time, the three self-reported signals complete the same condition
without a new mechanism:

```csv
stress_1_5,Stress,1 to 5,lower,Daily check-in,isolation_and_confinement,0.5,B,neuro_behavioural,Assumption
fatigue_1_5,Fatigue,1 to 5,lower,Daily check-in,isolation_and_confinement hostile_closed_environments,0.5,B,neuro_behavioural,Assumption
sleep_quality_1_5,Sleep quality,1 to 5,lower,Post-sleep questionnaire,isolation_and_confinement,0.5,B,sleep,Assumption
```

Each new indicator needs its content file before the app can show it; if Bio 1
cannot write three, keep the two reaction rows and leave these for Sunday.

## 3. Add now: nutrition, three rows

The challenge names "inadequate nutrition"; the `metabolic` system already
exists. Three rows tell the story without a new screen:

```csv
appetite_1_5,Appetite,1 to 5,lower,Daily food log,isolation_and_confinement hostile_closed_environments,0.5,B,metabolic,https://ajcn.nutrition.org/article/S0002-9165(23)29692-6/fulltext
fluid_intake_ml,Fluid intake,ml,lower,Daily fluid log,isolation_and_confinement gravity_fields,200,B,metabolic,https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf
body_mass_kg,Body mass,kg,both,ISS body mass measurement device,gravity_fields,0.5,A,metabolic,https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf
```

`appetite_1_5` uses SNAQ as the model for the question, not as a spaceflight
norm. `fluid_intake_ml` cites the NASA nutrition report; its recommendation is
more than 2000 ml per day. `body_mass_kg` is weekly; the same report gives the
1 % to 5 % loss that is typical. Calories and meals per day stay out: they are
context, not an alarm.

Attention rows: fluid can have a `watch` row at 2000 ml from the report; appetite
and body mass have no fixed boundary, so the baseline is the comparison. Bio 2
adds the fluid row; the other two stay baseline-only.

Content: `config/content/appetite_1_5.md`, `fluid_intake_ml.md` and
`body_mass_kg.md`, with the five questions and the status texts for
`in_range`/`outside_range`.

## 4. Add as a symptom layer: hyper- and hypoglycaemia

The i-STAT gives a value only when the crew takes a sample. Symptoms fill the gap
between samples and, more importantly, make the app ask for a measurement. They
do not replace the value and they do not diagnose.

### Files

```csv
# config/data/symptoms.csv
symptom_id,name,red_flag,source
shaky,Shaky,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
sweating,Sweating or clammy skin,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
fast_heartbeat,Fast heartbeat,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
anxiety,Anxiety or irritability,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
hunger,Hunger,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
nausea,Nausea,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
dizziness,Dizziness,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
confusion,Confusion,yes,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
blurred_vision,Blurred vision,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
tingling,Tingling in lips or tongue,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
weakness,Weakness,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
sleepiness,Sleepiness,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
seizure,Seizure,yes,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
loss_of_consciousness,Loss of consciousness,yes,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
unable_to_swallow,Unable to swallow,yes,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
thirst,Thirst,no,https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia
frequent_urination,Frequent urination,no,https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia
dry_mouth,Dry mouth,no,https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia
fatigue,Fatigue,no,https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia
vomiting,Vomiting,yes,https://diabetes.org/living-with-diabetes/dka
abdominal_pain,Abdominal pain,yes,https://diabetes.org/living-with-diabetes/dka
rapid_breathing,Rapid or heavy breathing,yes,https://diabetes.org/living-with-diabetes/dka
fruity_breath,Fruity breath,yes,https://diabetes.org/living-with-diabetes/dka
flushed_skin,Flushed skin,no,https://diabetes.org/living-with-diabetes/dka
headache,Headache,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
coordination_problems,Coordination problems,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
nightmares,Nightmares or crying out during sleep,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
pallor,Pale skin,no,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
```

```csv
# config/data/symptom_log.csv
person_id,mission_day,time,symptom_id,severity
demo_astronaut_1,12,14:10,shaky,2
demo_astronaut_1,12,14:10,sweating,2
demo_astronaut_1,12,14:10,confusion,3
```

The log has no `source` column: the observation is the astronaut's report; the
definition and its source live in `symptoms.csv`. `severity` is 1 (mild),
2 (moderate) or 3 (severe).

### How the score uses them

The glucose value is the anchor. A symptom adds weight; it never diagnoses.

```
indicator signal: 1 if it crossed a boundary, 0.5 if outside baseline, 0 inside
symptom present: 0.5 for a specific symptom, 0.25 for a shared one
red flag present: urgent, regardless of the score
no indicator and fewer than two symptoms: no_data
```

Shared symptoms are `fatigue`, `nausea`, `headache`, `blurred_vision` and
`confusion`; they appear in both conditions and therefore count less. A red flag
does not wait for a score: confusion, seizure, loss of consciousness or inability
to swallow on the low side; vomiting, abdominal pain, rapid breathing, fruity
breath or confusion on the high side.

If the glucose is missing and symptoms are present, the app says: "These
symptoms can occur with low glucose. Measure your glucose now. If you cannot,
call your CMO." It does not say "you have hypoglycaemia".

### Format change

`config/rules/conditions.csv` needs a fifth column, `symptoms`, and every row
needs the empty cell:

```csv
condition_id,name,based_on,symptoms,source
current_state,How you are today,reaction_median_ms:above reaction_lapses:above mood_1_5:below sleep_h:below,,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,thirst frequent_urination dry_mouth fatigue blurred_vision nausea vomiting abdominal_pain rapid_breathing fruity_breath confusion,https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia https://diabetes.org/living-with-diabetes/dka
hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shaky sweating fast_heartbeat anxiety hunger nausea dizziness confusion blurred_vision tingling weakness sleepiness,https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
```

Eng 1 changes `CONDITIONS_HEADER`, the checker and its tests; Phys owns
`symptoms.csv` and `symptom_log.csv`. If that cannot happen before the freeze,
the fallback is content-only: the glucose content lists the symptoms and tells
the astronaut to measure; no score change.

## 5. Later: pre-mission profile and labs

### Pre-mission profile

The trait profile is context, not a comparator. The pre-mission state baseline is
the comparator; it solves the first days when the in-flight baseline has fewer
than three readings.

```csv
person_id,kind,measure,value,unit,source
demo_astronaut_1,state_baseline,mood_median,3.8,1 to 5,Assumption
demo_astronaut_1,state_baseline,sleep_median,7.1,h,Assumption
demo_astronaut_1,state_baseline,reaction_median,240,ms,Assumption
demo_astronaut_1,state_baseline,reaction_lapses,1,count,Assumption
demo_astronaut_1,trait,conscientiousness,78,0 to 100,https://ipip.ori.org/
demo_astronaut_1,trait,neuroticism,32,0 to 100,https://ipip.ori.org/
```

`kind` is `state_baseline` or `trait`. The app shows the trait lines as "your
profile" and uses the state lines only when there is no in-flight baseline. No
trait is an alert and no trait is subtracted from a daily value.

### Labs

Four analytes, three phases, one pending result. Static file, no backend:

```csv
person_id,phase,mission_day,analyte_id,value,unit,method,result_day,status,source
demo_astronaut_1,pre,,cortisol,12.5,µg/dL,immunoassay,-60,resulted,Assumption
demo_astronaut_1,in,30,cortisol,15.2,µg/dL,immunoassay,52,resulted,Assumption
demo_astronaut_1,in,30,insulin,8.1,µIU/mL,immunoassay,52,resulted,Assumption
demo_astronaut_1,in,30,leptin,4.2,ng/mL,ELISA,52,pending,Assumption
demo_astronaut_1,post,210,cortisol,11.8,µg/dL,immunoassay,240,resulted,Assumption
```

The values are synthetic. The reference range is assay-specific, so it stays
with the method or is left empty. The app shows "result pending" and the day it
arrived; it never presents a lab as a daily reading.

## 6. What not to add

- **Mood from video or face.** The face sign-in is identification, on the
  device, and it works; affect inference is not supported by the evidence and
  costs the Validity score.
- **Crew rating each other's mood.** The self is the better judge of internal
  states; peer ratings in a crew of five are biased and break trust.
- **A full hormone panel or a daily calorie target.** Both look precise and are
  not; the four labs and the three nutrition rows carry the story.

## 7. Order before the freeze

1. Phys: the two reaction rows; Eng 1 adds their ids to `FORMATS.md`; Bio 2 adds
   `current_state`. This closes REQ-38.
2. Phys: the three nutrition rows and demo values; Bio 1: the three content
   files; Bio 2: the fluid `watch` row.
3. If Eng 1 can change the checker: symptoms column and the two glucose rows.
   Otherwise Bio 1 puts the symptom text in `glucose_mgdl.md`.
4. After the core works: `premission_profile.csv` as a static card; `labs.csv`
   as a disclosure.

## 8. How it looks in the demo

```
How you are today · Possible
mood 2/5 (below) · sleep 5.0 h (below)
reaction 310 ms (above) · lapses 4 (above)
Your CMO or flight surgeon confirms.

Nutrition
appetite 2/5 · fluids 1.2 L · weight 72.1 kg (2.8 % below pre-mission)
Outside your usual range.

Symptoms
confusion · sweating · shaky
Measure your glucose now. If you cannot, call your CMO.
```

Thirty seconds: one astronaut, one day, one state, one next step. The labs and
the profile stay behind a disclosure; they support the story, they do not fill
the screen.

## Sources

- Nasrini et al. 2020, HERA cognition and sleep: https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
- NASA nutrition evidence report: https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf
- SNAQ appetite questionnaire: https://ajcn.nutrition.org/article/S0002-9165(23)29692-6/fulltext
- ADA hypoglycaemia symptoms: https://diabetes.org/living-with-diabetes/hypoglycemia-low-blood-glucose/symptoms-treatment
- ADA hyperglycaemia: https://diabetes.org/living-with-diabetes/treatment-care/hyperglycemia
- ADA DKA: https://diabetes.org/living-with-diabetes/dka
- IPIP: https://ipip.ori.org/
