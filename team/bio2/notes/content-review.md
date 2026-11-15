# Review of the seven content files (REQ-10)

Sun 15 Nov 02:20, Bio 2. Files reviewed: `bp_dia_mmhg`, `bp_sys_mmhg`,
`glucose_mgdl`, `hr_bpm`, `mood_1_5`, `sleep_h`, `temp_core_c`.

`scripts/check_content.py`: 0 errors. Structure, headings and source coverage
pass. The findings below are about what the text says, not about the format.

## What is right

- Plain language: short sentences, one action per step, no jargon.
- No diagnostic wording anywhere. Nothing says "you have X", no risk
  percentage, and every advice line carries a link or `Assumption`.
- The temperature file already states the 38.0 °C fever line and keeps the
  person's own range first, which matches `attention.csv`.
- The mood file defines the 1–5 scale, which was an open gap in `FORMATS.md`.

## Blockers

### 1. `glucose_mgdl.md` says there is no in-flight device, and there is one

The file says: "No in-flight device is confirmed in the sources we read, so
HeMoSo takes this value by hand. Assumption."

`config/data/indicators.csv` says the opposite: `i-STAT blood analyser`. The
ISS carries the i-STAT Portable Clinical Blood Analyzer, which reads glucose
from a fingerstick. The two files contradict each other, and a judge can see it.

Replace with the fact and keep `Assumption` only for what is still ours: how
often the crew takes the sample. Sources:
https://pubmed.ncbi.nlm.nih.gov/9191561/ and
https://academic.oup.com/milmed/article-pdf/169/8/631/21977888/milmed.169.8.631.pdf

### 2. The nutrition link returns HTTP 500

`https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf`
is cited three times in `glucose_mgdl.md` and it does not open. The same file is
the source of `bio1-03`.

Working URL, checked at 200:
`https://nasa.gov/wp-content/uploads/2023/03/human-adaptation-2020-final.pdf`

## Coherence

### 3. The status texts speak only of "your usual range", but most triggers are absolute

For heart rate, both pressures and glucose, the `consult` and `urgent` rows in
`attention.csv` are clinical thresholds (100 and 50 bpm, 140/90 and 180/120
mmHg, 126 and 70 mg/dL), not deviations from the baseline. Yet every text says
"far outside your usual range" and never names the number.

The astronaut then sees "consult" without knowing why. Each level should say
its own trigger in plain words, for example: "Your systolic is 140 mmHg or
more, or clearly above your usual range." `temp_core_c.md` already does this
with the 38.0 °C line and is the model to copy.

### 4. The `watch` texts promise rules that do not exist

- `sleep_h.md`: "You slept less than 6 hours for **3 nights**." The row fires on
  one entry below 6; nothing in the code counts three nights.
- `mood_1_5.md`: "Your mood has been below your usual range **for a week**."
  The row fires on one entry below 2.

Either the text says one entry, or the team adds a rule that counts days. That
second option is a format change (Eng 1) and is not worth it tonight.

### 5. `temp_core_c.md` promises an urgent high temperature that has no rule

The `urgent` text says "well above your usual range, or well below it", but the
only `urgent` row is below 35 °C. Either the text names the low case, or the
file gets an `urgent` row for a high temperature (39.5 °C, Assumption).

### 6. Two blood-pressure readings, one stored value

The measurement steps ask for two readings one minute apart, and F-bio2-01 says
the state uses the average of at least two. Nothing in the app averages them:
each entry is one number. Someone (Eng 1 or Eng 2) has to say who averages, or
the text must say "enter the lower of the two".

### 7. One strong sentence in `mood_1_5.md`

"A change in mood is an early sign of a mental health problem." The Sources
links support behavioural health in general, not this sentence. Soften it to
"can be an early sign" or cite the BHP page directly.
