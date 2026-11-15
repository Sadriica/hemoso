# REQ-38 · neurobehavioural "current state" condition

Sat 14 Nov 23:05. Request from Wambi: one condition in `config/rules/conditions.csv`
for the neurobehavioural state, raised by reaction time, lapses, mood and sleep.

## The row, ready to paste

```csv
current_state,How you are today,reaction_median_ms:above reaction_lapses:above mood_1_5:below sleep_h:below,https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/
```

Unblocked on Sun 15 Nov 01:05: Phys added both indicators to `main`, so the row
is in `config/rules/conditions.csv` and the two thresholds are in
`config/rules/attention.csv` (`500 ms` and `3 lapses`, both `watch`/`crew`,
`Assumption`).

## The source, and what it does not cover

The link is Nasrini et al. 2020, *Cognitive Performance During Confinement and
Sleep Restriction in NASA's Human Exploration Research Analog (HERA)*, Frontiers
in Physiology, open access: https://pmc.ncbi.nlm.nih.gov/articles/PMC7198903/

It supports the two reaction signals and their direction: in the study, a night
of total sleep deprivation significantly decreased PVT response speed and
accuracy, and across the mission the number of lapses moved with sleep duration
and efficiency. So "slower median" and "more lapses" are the signs of a worse
neurobehavioural state, and sleep is one of the drivers.

It does **not** state that mood belongs in the same score, and it does not
combine the four signals into one. That combination is the team's decision.

`parse_sources` in `scripts/format_rules.py` accepts either links or the single
word `Assumption`, never both. With one source cell, the link stays and the
combination is recorded as an assumption here and in `team/bio2/LOG.md`. If the
team wants it visible in the file, the format needs a second column such as
`combination_status`, which is Eng 1's call.

What Phys has to add, per row of `indicators.csv`: `id`, `name`, `unit` (`ms`
and a count), `direction` (`higher` for both), `measured_on_board` (the test and
its duration), `hazards`, `min_spread`, `tier`, `system` (`neuro_behavioural`),
`source`.

## Why these four signals

- `reaction_median_ms:above`: a slower median reaction time is the standard sign
  of a degraded neurobehavioural state. `above` because higher is worse.
- `reaction_lapses:above`: lapses are the errors that matter operationally, more
  than the mean. `above` for the same reason.
- `mood_1_5:below` and `sleep_h:below`: the two signals already in the file that
  the literature links to the same state.

Four signals, minimum two usable to score, as the team decided. If only the two
reaction signals are available, the condition still scores.

## Wording rules (content and interface)

From Wambi, and they match `AGENTS.md`:

- The condition never names a state as a label. It answers "how you are today".
- Never "fatigued", "impaired", "unfit for duty" or any diagnostic label.
- Every display carries "your CMO or flight surgeon confirms".
- The score is evidence, not a percentage (F-bio2-02).

Bio 1 writes the text; Eng 2 shows it. Both need this rule before the demo.

## Review checklist for the thresholds Phys proposes

The two reaction indicators will need rows in `config/rules/attention.csv`, which
is my file. Before I accept a row, I check:

1. **Unit and side.** Milliseconds and a count; both `above`.
2. **A test definition.** Which task, how long, and how often. A median without
   the task is not comparable between people or days.
3. **A source or `Assumption`.** A published cut-off for "impaired" reaction
   time is unlikely to exist; if it does not, the row says `Assumption` and the
   level cannot be `urgent`.
4. **One row per side.** No two rows with the same `indicator_id`, `side` and
   `threshold`.
5. **Escalation order.** On `above`, a higher threshold cannot notify someone
   less severe than a lower one.
6. **No boundary that fires on a healthy crew member.** Reaction time varies with
   sleep, caffeine and time of day; the baseline is the primary comparison and a
   fixed boundary should be the exception.

## What I still need

- From Phys: the two indicator rows, and any threshold they propose.
- From Wambi: the source for the claim that these four signals describe one
  state, or the row stays `Assumption`.
