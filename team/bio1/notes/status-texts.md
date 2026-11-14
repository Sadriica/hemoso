# Status and next-step texts (REQ-26) · shape and first texts

Working note for `## Status and next steps` in `config/content/<indicator_id>.md`.
Blocked on two things outside Bio 1: the level names and `notify` values in
`config/rules/attention.csv` (Bio 2), and the indicator ids in
`config/data/indicators.csv` (Phys). The texts below are written against the
meaning of the level, so only the `### <attention_level>` heading changes when
`attention.csv` arrives.

## 1. The shape, decided

Each `### <attention_level>` block holds three short paragraphs, always in this
order:

1. **What changed.** What the app sees, in plain words.
2. **What to check and do now.** The next step, one action per sentence.
3. **Who acts.** Crew, CMO or flight surgeon, taken from `notify` in
   `attention.csv`. One sentence.

No lists inside the block, no labels printed in the app: Juli renders the three
paragraphs. Two sentences per paragraph at most.

## 2. What changes in the draft of Elena

| Field in the draft | Where it goes now |
| --- | --- |
| `whatChanged` | Paragraph 1 of the level block |
| `whatToCheck` | Paragraph 2, first part |
| `whatToDo` | Paragraph 2, second part |
| `escalation` | Paragraph 3 |
| `usuallyRelated` | Out of the content file. A possible condition and its probability live in `config/rules/conditions.csv` (Bio 2), and the app adds "your CMO or flight surgeon confirms" |

No change to `FORMATS.md` is needed for this: the level block was already free
text. What changes is the convention above, which Bio 1 keeps in all seven
content files.

## 3. Worked example · resting heart rate

Level names below are placeholders (`at_baseline`, `outside_baseline`,
`needs_flight_surgeon`); the names in `attention.csv` replace them. The
thresholds are Bio 2's.

```markdown
## Status and next steps

### at_baseline

Your resting heart rate is at your baseline today.

No action today. Measure again at the same hour tomorrow.

No one is notified for now.

### outside_baseline

Your resting heart rate has been above your baseline for 3 days.

Rest 10 minutes and measure again. Check your temperature, how you slept last
night and your fluid intake. Assumption.

Your CMO is notified on board.

### needs_flight_surgeon

Your resting heart rate is far above your baseline and today it is still high.

Tell your CMO today. Rest, drink fluids and measure again in 2 hours. Assumption.

Your CMO tells the flight surgeon at the next link with Earth.
```

## 4. The other four, paragraph 1 only (the rest waits for the thresholds)

| Indicator | `at_baseline` | `outside_baseline` | `needs_flight_surgeon` |
| --- | --- | --- | --- |
| Blood pressure | Your blood pressure is at your baseline today. | Your blood pressure has been below your baseline for 3 days. | Your blood pressure is far below your baseline. |
| Body temperature | Your temperature is at your baseline today. | Your temperature has been above your baseline for 2 days. | Your temperature is high and it has stayed high. |
| Sleep hours | You slept at your baseline last night. | You slept less than your baseline for 3 nights. | You have slept much less than your baseline for several nights. |
| Mood | Your mood is at your baseline this week. | Your mood has been below your baseline for a week. | Your mood has stayed below your baseline for several days. |
| Fluid intake | You drank enough fluids today. | You drank less fluid than you need for 2 days. | You drank much less fluid than you need for several days. |

The numbers ("3 days", "2 nights") are placeholders until `attention.csv` says
which threshold the row uses. They must match the rule, not be invented.

## 5. Rules for every text in this section

- Short sentences. One action per sentence. No jargon, no abbreviations.
- Use **baseline**, NASA's word, for what is normal for this astronaut. Never
  "usual range" or "normal range": a baseline is one value, compared with a
  tolerance set by `attention.csv`.
- "Heart rhythm problems", not "rhythm problems". "Fluid intake", not "how much
  water you drank". Bio 1 chose these on Sat 17:40. Never write "water" alone:
  fluid intake covers every liquid the crew drinks, not only water.
- No condition named and no "you have". A possible condition is Bio 2's row in
  `conditions.csv`, with its probability and its basis.
- Advice that comes from a source carries the link in `## Sources`. Advice that
  is the team's own ("rest 10 minutes and measure again") says `Assumption`.
- `notify` decides paragraph 3. Do not write "the flight surgeon is notified"
  where `attention.csv` says `crew`.
- The three paragraphs never repeat the number in the threshold table on screen;
  the app already shows it.
- For body temperature, "your baseline" is the in-flight baseline: it is about
  1 °C above the Earth value (F-bio1-02). Never compare it with a fixed 37 °C.
- Fluid intake is the exception to "baseline": it compares against the NASA
  recommendation (more than 2000 ml per day, F-bio1-03), not against what that
  person drank before. Do not write "your baseline" in its texts.

## 6. Pending

- [ ] Level names and `notify` values: `config/rules/attention.csv` (Bio 2).
- [ ] Body temperature thresholds set against the in-flight baseline, not 37 °C
  (Bio 2, F-bio1-02).
- [ ] Sixth indicator `fluid_intake`: deferred. The team keeps the six examples
  of the statement for now; F-bio1-03 stays as the proposal if there is time.
- [ ] Indicator ids and units: `config/data/indicators.csv` (Phys).
- [ ] Copy each block into `config/content/<indicator_id>.md` once the ids exist.
- [ ] Bio 2 reviews for plain language (REQ-08) and for unsourced statements
  (REQ-10).
- [ ] Decide with Juli: three paragraphs, no labelled fields in the interface.
