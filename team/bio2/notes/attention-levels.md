# Attention levels for `config/rules/attention.csv` (REQ-05)

Decision by Bio 2, Sat 14 Nov 15:18. It answers the open question in
`FORMATS.md`: how many attention levels there are and how they are called.

`attention_level` is the name of the state the astronaut sees. The actor is a
separate column, `notify`. Colors are a frontend choice and are not stored.

## The three levels

| `attention_level` | `notify` | What the astronaut reads | Who acts |
| --- | --- | --- | --- |
| `watch` | `crew` | Repeat the measurement, apply the countermeasure, keep the record | The astronaut or the crew medical officer on board |
| `consult` | `cmo` | The crew medical officer must check the person and the record | The crew medical officer |
| `urgent` | `flight_surgeon` | The flight surgeon on the ground must know now | The flight surgeon on console |

Rules for the names:
- One word, lowercase, no colors and no numbers in the name.
- The same string is the `###` heading in `config/content/<indicator_id>.md`
  (the checker requires both lists to match), so it must read well as a heading.
- Three levels, not four: `normal` is not a state with a row. When no row
  matches a value, the value is in range, and the text for that case is the
  paragraph under `## Status and next steps`, before the first `###`.

## Why three

- The format has one `notify` value per row and three allowed values, so a
  fourth level would duplicate one of them.
- "Green, yellow, red" says how bad it looks but not who must act, and REQ-05
  asks for the actor.
- `watch` and `consult` are plain words for a crew member who is not a doctor.
  `urgent` is reserved for the flight surgeon, who is the medical authority.

## How the rows use them

- A range is two rows: one `below` and one `above`. For an indicator where only
  one side matters, the other side has no rows.
- Several rows on the same side are steps. On `below`, a lower threshold must
  notify the same or someone more severe; on `above`, a higher threshold does.
  `scripts/check_content.py` blocks a file that breaks this.
- When several rows match one value, the most severe `notify` wins. Example:
  `below 37.5 crew` and `below 36.0 cmo`, a value of 35 is `cmo`.

## What each level never says

No level names a condition, gives a probability, or says "you have". A level
says how urgent the value is and who looks at it; the crew medical officer or
the flight surgeon confirms what it is. That is the rule in `AGENTS.md` and the
condition probabilities live in `config/rules/conditions.csv`, not here.

## Sources for the actors

- Crew medical officer and flight surgeon, roles and authority: NASA, OCHMO
  Technical Brief 044, Medical Operations (2025):
  https://www.nasa.gov/wp-content/uploads/2025/08/ochmo-tb-044-medical-operations.pdf
- Flight surgeon: a physician with aerospace medicine certification, on console
  in Mission Control as "Surgeon": https://www.nasa.gov/directorates/esdmd/hhp/flight-surgeons/
- Crew medical officer: a crew member with about 40 h of medical training, not
  required to be a physician; the ground flight surgeon directs the care:
  https://www.nature.com/articles/s41526-023-00284-1

The level names and the number of levels are a team decision, not a medical
statement: Assumption.
