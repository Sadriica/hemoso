# Temperature card and the 38.0 °C row (REQ-05, REQ-10)

Sun 15 Nov, Bio 2. Review of the contradiction between
`config/content/temp_core_c.md` and `config/rules/attention.csv`.

## What the source says

JSC 22538 Revision F is the **Flight Crew Health Stabilization Program**, the
quarantine programme before launch. Section 7.1.B says: "If temperature is
measured, fever is defined as 100.4 °F or greater." That is a pre-launch
screening rule, not an in-flight clinical threshold. It should not be the source
of a row in `attention.csv`.

No NASA source read for this project gives an in-flight high-temperature
cut-off. The 1 °C rise at rest is from Stahn et al. 2017, and the crew member's
own baseline is the comparison the project already uses.

## What changed

- `config/rules/attention.csv`: the row is now
  `temp_core_c,above,38.5,consult,cmo,Assumption`, not 38.0 °C from JSC 22538.
- The `below 35.0 °C` row stays: NASA-STD-3001 Rev. C, Appendix C, p. 63,
  defines hypothermia below 35 °C.
- 38.5 °C is a project review line, marked `Assumption`. It is not a NASA
  in-flight limit and it is not a diagnosis.

## The content fix for Bio 1

`config/content/temp_core_c.md` currently says, on the same screen, that the
in-flight usual range is about 1 °C higher and that "38.0 °C or more" is a
consult reason. If a crew member's baseline is 37.8 °C, a normal in-flight
value crosses 38.0 °C and the app says both "this is your usual range" and
"this needs the CMO".

Replace the `### consult` section with this text, or something close to it:

```markdown
### consult

Your temperature is far outside your usual range, or above the 38.5 °C review
line. Tell your CMO today. Rest, drink fluids and measure again in 2 hours.

The 38.5 °C line is a project review line, not a NASA in-flight limit.
Assumption.

Your CMO checks you in person.
```

The `### within_range` text stays as it is: the person's own baseline is the
first comparison. The `## How spaceflight affects it` section can keep the
1 °C rise, because that is why the baseline matters.

Optional wording in `## Why it matters`: "This mild fever costs about 20% more
energy" can become "This higher temperature costs about 20% more energy". The
rise is normal in flight; calling it a fever on the same screen as the review
line is what confuses the reader.

## What is still open

- If the team prefers no fixed high-temperature row at all, remove the 38.5 °C
  row and let the baseline plus the symptom text carry the case. The app then
  shows "outside your usual range", not "needs review", for a high value.
- If the team finds an in-flight flight-surgeon source, replace the Assumption
  and the row together.
- The frontend uses `value > threshold`, so exactly 38.5 °C does not trigger.
  That is the same strict-comparison question as the blood-pressure rows.
