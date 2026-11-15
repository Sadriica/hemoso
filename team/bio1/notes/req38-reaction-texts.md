# REQ-38 · reaction check texts · draft

Status: draft for Bio 1. Not product content yet. It becomes
`config/content/reaction_median_ms.md` and
`config/content/reaction_lapses.md` when Phys adds the two rows to
`config/data/indicators.csv` (T-72) and Bio 2 adds the attention rows (T-73).

Request from Wambi, Sat 14 Nov: two indicators and the "current state"
condition, in the tone of "how you are today", never a diagnosis, closing with
the CMO.

## What these texts are

- Two indicators: `reaction_median_ms` (median of the answers) and
  `reaction_lapses` (answers slower than the cut-off, or missed).
- One condition: `current_state` in `config/rules/conditions.csv`.
- The status text is for the astronaut. Mission control never sees it.

## Wording rules

- It answers "how you are today", not "what you have".
- Never a label: no "fatigued", "impaired", "unfit", "slow", "bad night".
  Describe the signal, not the person.
- No percentage and no score out of 100. The condition is evidence, not risk.
- Every state closes with "Your CMO or flight surgeon confirms."
- No number is invented here. Thresholds and levels come from
  `config/rules/attention.csv` (Bio 2).

## reaction_median_ms.md

```markdown
# Median reaction time

## Why it matters

Reaction time is how fast you answer when a light or a sound appears. NASA uses
a 3-minute version of this test on the space station, and it is sensitive to
sleep loss. https://www.med.upenn.edu/uep/astronaut.html

## How spaceflight affects it

Sleep loss and a body clock out of step with the schedule slow your answers.
In a NASA ground study, crew members were slower on this test after a night
without sleep. Two weeks of confinement alone did not show the same effect.
https://www.med.upenn.edu/uep/astronaut.html
https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00394/full

## Measurement steps

1. Sit with the screen at arm's length.
2. Choose light or sound.
3. Tap the screen or press the space bar as soon as the shape appears or the
   tone sounds.
4. Do not guess before the shape or the tone: that trial restarts.
5. Do the whole test at the same hour as yesterday.
6. Save the result.

## Status and next steps

### no_data

HeMoSo needs 3 tests before it can compare you with yourself.

Take the test again tomorrow at the same hour. No one is notified for now.

### in_range

Your answers today are as fast as your usual range.

No action today. Take the test again at the same hour tomorrow.

No one is notified for now.

### outside_range

Your answers today are slower than your usual range.

Take the test again tonight, after a short rest. Check how you slept last
night. Assumption.

Your CMO or flight surgeon confirms.

### watch

Keep only the levels that `config/rules/attention.csv` lists for this indicator.

Your answers have been slower than your usual range for several days.

Protect your sleep tonight and take the test again tomorrow. Assumption.

Your CMO or flight surgeon confirms.

### consult

Keep only the levels that `config/rules/attention.csv` lists for this indicator.

Your answers are well outside your usual range and your sleep has been short.

Tell your CMO today. Rest and take the test again in the evening. Assumption.

Your CMO or flight surgeon confirms.

## How to prevent problems

Keep the same sleep and wake times. Take the test at the same hour. Avoid
caffeine before the test. Assumption.

## Sources

- Astronaut Behavioral Health, University of Pennsylvania: https://www.med.upenn.edu/uep/astronaut.html
- Nasrini et al. 2020, Cognitive performance during confinement and sleep restriction in NASA's HERA: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00394/full
```

## reaction_lapses.md

```markdown
# Lapses in the reaction test

## Why it matters

A lapse is an answer that comes too late, or does not come. Lapses matter more
than the average: one long pause is what turns into a missed step during a
task. https://www.med.upenn.edu/uep/astronaut.html

## How spaceflight affects it

Sleep loss increases lapses. In a NASA ground study, crew members were less
accurate on the vigilance test after a night without sleep.
https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00394/full

## Measurement steps

1. Sit with the screen at arm's length.
2. Choose light or sound.
3. Tap the screen or press the space bar as soon as the shape appears or the
   tone sounds.
4. If no answer comes before the cut-off, that trial counts as a lapse.
5. Do the whole test at the same hour as yesterday.
6. Save the result.

## Status and next steps

### no_data

HeMoSo needs 3 tests before it can compare you with yourself.

Take the test again tomorrow at the same hour. No one is notified for now.

### in_range

Your lapses today are within your usual range.

No action today. Take the test again at the same hour tomorrow.

No one is notified for now.

### outside_range

You had more lapses today than in your usual range.

Take the test again tonight, after a short rest. Check how you slept last
night. Assumption.

Your CMO or flight surgeon confirms.

### watch

Keep only the levels that `config/rules/attention.csv` lists for this indicator.

Your lapses have been more frequent than usual for several days.

Protect your sleep tonight and take the test again tomorrow. Assumption.

Your CMO or flight surgeon confirms.

### consult

Keep only the levels that `config/rules/attention.csv` lists for this indicator.

Your lapses are well above your usual range and your sleep has been short.

Tell your CMO today. Rest and take the test again in the evening. Assumption.

Your CMO or flight surgeon confirms.

## How to prevent problems

Keep the same sleep and wake times. Take the test at the same hour. Avoid
caffeine before the test. Assumption.

## Sources

- Astronaut Behavioral Health, University of Pennsylvania: https://www.med.upenn.edu/uep/astronaut.html
- Nasrini et al. 2020, Cognitive performance during confinement and sleep restriction in NASA's HERA: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00394/full
```

## current_state · condition text

Bio 2's row is ready in `team/bio2/notes/req38-current-state.md`:

```csv
current_state,How you are today,reaction_median_ms:above reaction_lapses:above mood_1_5:below sleep_h:below,Assumption
```

The format for the condition text is still open: `conditions.csv` has no text
column. Until the team decides, this is the wording, in the tone of "how you
are today":

**Title:** How you are today

**One line:** This is not a label. It compares today's reaction test, mood and
sleep with your own usual values.

**Three steps (Bio 2 names them, this is the wording):**

| Step | Text |
| --- | --- |
| usual | Today looks like your usual. |
| different | Today is a little different from your usual. |
| check | Today is worth a check with your CMO. |

**Always closes:** Your CMO or flight surgeon confirms.

**Never:** a disorder name, a percentage, a score out of 100, "you have", or a
recommendation to stop working.

## Pending before this becomes product content

- [ ] Phys adds `reaction_median_ms` and `reaction_lapses` to
      `config/data/indicators.csv` (T-72).
- [ ] Bio 2 adds the `attention.csv` rows for both, with `notify` and source
      (T-73). Only those levels stay as `###` headings.
- [ ] Bio 2 adds the `current_state` row to `conditions.csv`.
- [ ] Decide where the condition text lives: a new column, a file, or interface
      strings (Eng 2).
- [ ] Run `python scripts/check_content.py --strict` and remove any heading that
      is not an `attention_level` for that indicator.
- [ ] Bio 2 reviews plain language and the no-label rule.

## Sources

- Astronaut Behavioral Health, University of Pennsylvania: https://www.med.upenn.edu/uep/astronaut.html
- Nasrini et al. 2020, Cognitive performance during confinement and sleep restriction in NASA's HERA: https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2020.00394/full
- Team decision, Sat 14 Nov 22:41: reaction check and current psychological state (`docs/DECISIONS.md` on the eng1 branch).
