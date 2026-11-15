# Status and next-step texts (REQ-26) · shape and first texts

Working note for `## Status and next steps` in `config/content/<indicator_id>.md`.
The level names follow F-phys-02, which computes four states from the astronaut's
last 14 readings; the names in `config/rules/attention.csv` replace them if Bio 2
chooses others.

## 1. The shape, decided

Each `### <attention_level>` block holds three short paragraphs, always in this
order:

1. **What changed.** What the app sees, in plain words.
2. **What to check and do now.** The next step, one action per sentence.
3. **Who acts.** Crew, CMO or flight surgeon, taken from `notify` in
   `attention.csv`. One sentence.

No lists inside the block, no labels printed in the app: Juli renders the three
paragraphs. Two sentences per paragraph at most.

Four states, from F-phys-02:

| State | When it shows |
| --- | --- |
| `no_data` | Fewer than 3 readings: the app cannot compare yet |
| `in_range` | The reading is inside the astronaut's usual range |
| `outside_range` | The reading is more than 3 spreads from the median |
| `needs_review` | A cited clinical boundary is crossed; only Bio 2's `attention.csv` creates this state |

## 2. What changes in the draft of Elena

| Field in the draft | Where it goes now |
| --- | --- |
| `whatChanged` | Paragraph 1 of the level block |
| `whatToCheck` | Paragraph 2, first part |
| `whatToDo` | Paragraph 2, second part |
| `escalation` | Paragraph 3 |
| `usuallyRelated` | Out of the content file. A possible condition and its probability live in `config/rules/conditions.csv` (Bio 2) |

No change to `FORMATS.md` is needed for this: the level block was already free
text.

## 3. Worked example · resting heart rate

```markdown
## Status and next steps

### no_data

HeMoSo needs 3 entries before it can compare you with yourself.

Measure again at the same hour. No one is notified for now.

### in_range

Your resting heart rate is in your usual range today.

No action today. Measure again at the same hour tomorrow.

No one is notified for now.

### outside_range

Your resting heart rate has been above your usual range for 3 days.

Rest 10 minutes and measure again. Check your temperature, how you slept last
night and your fluid intake. Assumption.

Your CMO is notified on board.

### needs_review

Your resting heart rate is far above your usual range and today it is still high.

Tell your CMO today. Rest, drink fluids and measure again in 2 hours. Assumption.

Your CMO tells the flight surgeon at the next link with Earth.
```

## 4. The other indicators, paragraph 1

`no_data` is the same text in every file: "HeMoSo needs 3 entries before it can
compare you with yourself."

| Indicator | `in_range` | `outside_range` | `needs_review` |
| --- | --- | --- | --- |
| Blood pressure | Your blood pressure is in your usual range today. | Your blood pressure has been below your usual range for 3 days. | Your blood pressure is far below your usual range. |
| Body temperature | Your temperature is in your usual range today. | Your temperature has been above your usual range for 2 days. | Your temperature is far above your usual range and it has stayed high. |
| Sleep hours | You slept in your usual range last night. | You slept less than your usual range for 3 nights. | You have slept much less than your usual range for several nights. |
| Mood | Your mood is in your usual range this week. | Your mood has been below your usual range for a week. | Your mood has stayed below your usual range for several days. |
| Fluid intake (deferred) | You drank enough fluids today. | You drank less fluid than you need for 2 days. | You drank much less fluid than you need for several days. |

The numbers ("3 days", "2 nights") are placeholders until `attention.csv` says
which rule produces the state. They must match the rule, not be invented.

## 5. Rules for every text in this section

- Short sentences. One action per sentence. No jargon, no abbreviations.
- Use **your usual range**, never "normal", "abnormal" or "baseline". The
  comparison is against the astronaut's last 14 readings (F-phys-02), not against
  a pre-mission baseline, so "baseline" would describe something the app does not
  do.
- "Heart rhythm problems", not "rhythm problems". "Fluid intake", not "how much
  water you drank". Never write "water" alone: fluid intake covers every liquid
  the crew drinks.
- No condition named and no "you have". A possible condition is Bio 2's row in
  `conditions.csv`, with its probability and its basis.
- Advice that comes from a source carries the link in `## Sources`. Advice that
  is the team's own says `Assumption`.
- `notify` decides paragraph 3.
- The paragraphs never repeat the number in the threshold table on screen.
- For body temperature, the usual range in space is about 1 °C above the Earth
  value (F-bio1-02). Never compare it with a fixed 37 °C.
- Fluid intake is the exception: it compares against the NASA recommendation
  (more than 2000 ml per day, F-bio1-03), not against what that person drank
  before.

## 6. Pending

- [ ] Level names and `notify` values: `config/rules/attention.csv` (Bio 2).
- [ ] Body temperature rule set against the in-flight range, not 37 °C (Bio 2,
  F-bio1-02).
- [ ] Sixth indicator `fluid_intake`: deferred. The team keeps the six examples
  of the statement for now; F-bio1-03 stays as the proposal if there is time.
- [ ] Copy each block into the content file once the ids exist. Done for the
  seven files on Sat 19:00; the names change if Bio 2 chooses others.
- [ ] Bio 2 reviews plain language (REQ-08) and unsourced statements (REQ-10).
- [ ] Decide with Juli: three paragraphs, no labelled fields in the interface.
