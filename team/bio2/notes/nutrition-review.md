# Review of the three nutrition files (REQ-05, REQ-10)

Sun 15 Nov, Bio 2. Files reviewed: `appetite_1_5.md`, `body_mass_kg.md`,
`fluid_intake_ml.md`. This is the language and source review, plus the
`### watch` text the three files need for their safety-floor rows.

## The rows

| indicator_id | side | threshold | attention_level | notify | source |
| --- | --- | --- | --- | --- | --- |
| `appetite_1_5` | below | 3 | watch | crew | Assumption |
| `fluid_intake_ml` | below | 2500 | watch | crew | OCHMO-TB-027 |
| `body_mass_kg` | below | 45 | watch | crew | Assumption |

The three rows are safety floors, not clinical thresholds. The baseline is the
first comparison; the floor only catches a clearly low value. The checker needs
one row per indicator, and every `attention_level` needs its own `###` heading
in the content file. I did not edit `config/content/` because that path belongs
to Bio 1.

## What each row means

- `appetite_1_5`: no published threshold. Below 3 is the two lowest answers, a
  low-appetite floor marked `Assumption`. The baseline catches a change from
  the person's own answers.
- `fluid_intake_ml`: 2500 mL comes from OCHMO-TB-027, which gives 2.5 L/day as
  the water-system requirement for direct consumption and food rehydration. The
  2020 NASA nutrition report gives more than 2000 mL/day as the general
  recommendation, and average ISS intake is 2.0 to 2.3 L/day, so a 2000 mL
  alarm would fire on a normal day; 1500 mL has no source. The 2500 mL row
  stays with its link until a source supports a lower individual threshold.
- `body_mass_kg`: 45 kg is a safety floor for a low adult mass, marked
  `Assumption`. The old 70 kg row marked a healthy 62 kg crew member every day.
  The baseline compares the person with their own usual weight.

Decision: keep the three floors. Removing the rows would need a checker change
and would leave two indicators without any attention rule (REQ-05), and the
checker already passes with the floors and the `### watch` headings. No code
change is needed. Checked in a clean worktree at `origin/bio2` (`4725e5b`):
`python scripts/check_content.py --strict` gives 0 errors. The only remaining
work is to align the body mass and fluid texts with the current row values: the
body mass text still says 70 kg and the fluid text still says 2.5 L.

## Body mass direction (open point for Phys)

`config/data/indicators.csv` has `body_mass_kg` as `lower`. That sees loss but
ignores a 2 kg gain from fluid retention. If Phys wants a gain to count as
outside the baseline, the direction becomes `both`; the attention row stays the
below-45 kg floor, and the high side is baseline-only. I did not change the
file: it is Phys's path.

## Text to replace in each file

The three `### watch` headings already exist in `origin/bio2`; `--strict` gives
0 errors there. Appetite already matches its row. Replace only the body mass and
fluid sections with the text below. The row is `watch` / `crew`, so the closing
line is "The crew checks your record on board", the same as in `mood_1_5.md`
and `sleep_h.md`. The `outside_range` sections keep "Your CMO or flight surgeon
confirms."

### `config/content/appetite_1_5.md` (no change; it already matches below 3)

```markdown
### watch

You rated your appetite below 3 today. Assumption: 3 is the middle of our
scale, not a NASA limit.

Eat something small at the next meal time and answer again tomorrow.

The crew checks your record on board.
```

### `config/content/fluid_intake_ml.md`

```markdown
### watch

You drank less than 2.5 L today, counting the water in your food. NASA asks for
at least 2.5 L a day for each crew member.

Drink a glass of water now and keep a bottle near you. Log your total again
tomorrow.

The crew checks your record on board.
```

### `config/content/body_mass_kg.md`

```markdown
### watch

Your body mass is below 45 kg. Assumption: this is a low value for an adult,
not a NASA limit.

Eat your full meals this week and measure again next week.

The crew checks your record on board.
```

## Language pass

### `appetite_1_5.md`

1. **The 40 % has the wrong inline link.** The sentence says "in one Mir study,
   40% of crew members reported less appetite" and links OCHMO-TB-013. I opened
   TB-013: it says weight loss and decreased appetite are risks, but it does not
   contain the 40 % study. The number is in the NASA nutrition report (2020),
   p. 21: 40 % reported decreased appetite, 40 % no change, 20 % increased
   appetite. Either link that report and give the full split, or move the study
   to a finding. **My recommendation: move the 40 % to a finding.** The plain
   claim "crews often eat less than they need, and appetite changes are common
   in flight" is enough for the astronaut, and the finding can hold the study
   detail. If the number stays, it must cite the 2020 report, not TB-013.
   The replacement paragraph, if the number moves out:

   ```markdown
   Appetite is how much you feel like eating. Crews often eat less than they
   need, and appetite changes are common in flight.
   https://nasa.gov/wp-content/uploads/2023/03/human-adaptation-2020-final.pdf
   ```

   The finding (`docs/findings/bio1-04-appetite.md`) can carry the quote:
   "40% of Mir crewmembers reported decreased appetite, 40% reported no change,
   and 20% reported increased appetite" (NASA nutrition report 2020, p. 21).
2. "Fluids move to your head, the schedule is tight and food tastes different."
   Add the comma before "and": "Fluids move to your head, the schedule is tight,
   and food tastes different." The list has three items.
3. "eating less than you need adds up over weeks" is clear. Keep it.
4. The `outside_range` text is fine. It says what to do and who confirms.

### `body_mass_kg.md`

1. "it makes muscle, bone and heart loss worse" reads as if the heart is lost.
   The report says body-mass loss adds to muscle and bone loss and to
   cardiovascular deconditioning. A plainer sentence: "it makes muscle and bone
   loss worse and adds to heart and blood-vessel changes." If that is too long,
   "it makes muscle and bone loss worse and weakens the heart" is shorter but
   stronger than the source. I would use the first one.
2. "A normal scale does not work without gravity." Good. The next sentence names
   only the SLAMMD. `indicators.csv` also names the Russian BMMD. One device is
   enough for the measurement steps, but the "How spaceflight affects it"
   section could say "the ISS has two devices: the SLAMMD and the Russian BMMD."
   That matches the source and the indicator row.
3. The `outside_range` text says "below your usual range" and "Eat your full
   meals this week". Good. The real signal is the change from the person's own
   baseline; the 45 kg row is only a low floor.
4. Keep the 45 kg row marked `Assumption`. Do not reintroduce the 70 kg row:
   it marked a healthy 62 kg crew member every day. The text must not tell a
   healthy 62 kg crew member that 62 kg is low.

### `fluid_intake_ml.md`

1. "Water keeps your blood volume and blood pressure stable." The indicator is
   fluid intake, not water alone, and Bio 1's own wording rule says to use
   "fluid intake". Change to "Fluid intake keeps your blood volume and blood
   pressure stable."
2. "the body reduces its water" is awkward. Change to "your body loses fluid."
3. "A busy schedule and food that needs water to rehydrate can lower how much
   you drink." Good, but "food that needs water to rehydrate" is a little
   technical. "Food that you rehydrate can also change how much you drink." The
   current sentence is acceptable.
4. Measurement steps: "Fill your bottle at the galley and note the amount" and
   "Write the total in HeMoSo by hand" fit the current build, but
   `indicators.csv` says "Metered galley dispenser". If the dispenser gives the
   amount, the first step can be "Use the galley dispenser and note the amount
   it gives." If the crew still fills a bottle by hand, keep the current step
   and ask Phys to align the indicator wording. Do not promise a meter the demo
   does not use.
5. The `outside_range` text says "Drink a glass of water now". That is an
   action, not the indicator name, so "water" is fine here. If you want the
   same word everywhere, "Drink some fluid now" also works.

## What I did not change

- I did not edit `config/content/`. The three files are Bio 1's path.
- I did not add a `consult` or `urgent` row for these indicators. No source
  gives a clinical step for appetite, body mass or fluid intake.
- I kept the three nutrition rows as `Assumption` safety floors. The baseline
  is the main signal; the floor only catches a clearly low value.
- I did not remove the 40 % from the content; that is Bio 1's file. The
  recommendation above is to move it to a finding. If it stays, the inline link
  must change to the 2020 report and the sentence must give the full
  40 / 40 / 20 split.
