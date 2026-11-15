# Temperature card and the 38.0 °C row (REQ-05, REQ-10)

Sun 15 Nov, Bio 2. Review of the contradiction between
`config/content/temp_core_c.md` and `config/rules/attention.csv`.

## What the old source says

JSC 22538 Revision F is the **Flight Crew Health Stabilization Program**, the
quarantine programme before launch. Section 7.1.B says: "If temperature is
measured, fever is defined as 100.4 °F or greater." That is a pre-launch
screening rule, not an in-flight clinical threshold. It should not be the source
of a row in `attention.csv`.

## What changed

- `config/rules/attention.csv`: the row stays at 38.0 °C, but the source is now
  the **WHO case definition for SARI** (2014), which uses "measured fever of ≥
  38 °C" as a clinical definition. JSC 22538 is no longer cited.
- The `below 35.0 °C` row stays: NASA-STD-3001 Rev. C, Appendix C, p. 63,
  defines hypothermia below 35 °C.
- The value stays 38.0 °C so the video, the 39.5 °C example and the README keep
  working. It is a clinical fever definition, not an in-flight NASA limit.

Source:
https://cdn.who.int/media/docs/default-source/influenza/who_ili_sari_case_definitions_2014.pdf

## The content card

`config/content/temp_core_c.md` already says, in `### consult`, that a reading
crossed the 38.0 °C fever line the CMO uses, and that "HeMoSo asks for review
when either happens" (outside the usual range or above 38.0 °C). That sentence
is correct for the new source. No number change is needed.

The one clarification worth adding is the source of the line: 38.0 °C is the WHO
clinical definition of fever, not a NASA in-flight threshold. Suggested wording,
optional:

```markdown
### consult

Your temperature is outside your usual range, or a reading crossed the 38.0 °C
fever line the CMO uses. 38.0 °C is the WHO clinical definition of fever, not a
NASA in-flight limit. HeMoSo asks for review when either happens.

Tell your CMO today. Rest, drink fluids and measure again in 2 hours.
Assumption.

Your CMO checks you in person.
```

The `### within_range` text stays as it is: the person's own baseline is the
first comparison. The `## How spaceflight affects it` section can keep the
1 °C rise, because that is why the baseline matters.

## What is still open

- A crew member whose in-flight baseline is 37.8 °C can still cross 38.0 °C on a
  normal day. The app shows `needs_review` because the clinical line and the
  baseline are two separate triggers. The content says so; the CMO decides.
- If the team later finds an in-flight flight-surgeon source, replace the WHO
  case definition and the row together.
- The frontend uses `value > threshold`, so exactly 38.0 °C does not trigger.
  That is the same strict-comparison question as the blood-pressure rows.
