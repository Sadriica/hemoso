# F-phys-03 · Every system the app shows is affected by a named hazard

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 19:20
**Reviewed by:** _pending_

## Claim

Each of the five systems the app shows is linked by NASA to at least one of the
five spaceflight hazards, with a stated mechanism, and none of those pages gives a
value at which the effect becomes a problem.

## The table Bio 1 needs (question 3 of the statement)

| System | Hazard | What NASA says happens | Source |
| --- | --- | --- | --- |
| Cardiovascular | `gravity_fields` | Fluids shift upward to the head and may press on the eyes; crews feel lightheaded and may faint at gravity transitions; weight-bearing bones lose 1 % to 1.5 % of mineral density per month | https://www.nasa.gov/hrp/hazard-gravity-fields/ |
| Cardiovascular | `radiation` | Lifetime cardiovascular risk rises above 0.5 Gy-Eq of radiation exposure | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf (p. 8) |
| Thermoregulation | `hostile_closed_environments` | The habitat fixes temperature, pressure, lighting and noise; the absence of convection changes how the body loses heat, and core temperature rises higher and faster during exercise in space than on Earth | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Sleep | `isolation_and_confinement` | Sleep loss, circadian desynchronization and work overload compound in isolation and confinement | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ |
| Sleep | `hostile_closed_environments` | Lighting and noise are habitat conditions that NASA names as part of this hazard | https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ |
| Neuro-behavioural | `isolation_and_confinement` | Behavioural responses appear in isolated groups; journaling is used to assess mental and emotional state; light therapy is a countermeasure | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ |
| Metabolic | `hostile_closed_environments` | Stress hormones can rise and the immune system can change in a closed habitat; microbes behave differently in space | https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ |
| Metabolic | `gravity_fields` | Diet and body mass change with weightlessness; the nutrition report records typical losses of 1 % to 5 % of preflight mass | https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf (p. 22) |

## Evidence, and why the immune risk page matters

The HRP risk pages connect a body system with the stressors behind it. The immune
risk names them explicitly in its gap IM-106: "the effect of the stressors associated
with spaceflight (stress, microgravity, radiation, altered nutrition, circadian
misalignment, hypoxia, etc.) on human immunity".

That sentence is the closest NASA comes to naming the hazards together, and it is
why the table above can be defended: the mechanism is stated, the threshold is not.

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Risk of altered immune response, HSRB state of knowledge | "Subclinical altered human immune function has been documented in crewmembers post-flight & in-flight … These immune changes persist for the duration of a 6 month orbital flight" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 |
| Risk of altered immune response, gap IM-106 | The stressors are named: "stress, microgravity, radiation, altered nutrition, circadian misalignment, hypoxia" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 |
| Hazard: Gravity Fields | "Water and other fluids in the body shift upward to the head, which may put pressure on the eyes and cause vision problems" | NASA | https://www.nasa.gov/hrp/hazard-gravity-fields/ |
| Hazard: Isolation and Confinement | "Sleep loss, circadian desynchronization, and work overload compound this issue" | NASA | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ |

## Confidence

High for the links themselves: each row quotes a NASA page that states the
mechanism in one sentence. Medium for the cardiovascular `radiation` row, because the
0.5 Gy-Eq figure comes from the evidence report page quoted in
`team/eng1/notes/challenge-resources.md` and has not been reopened by Phys.

## What it changes in the solution

- `config/data/indicators.csv`: the `hazards` column of each indicator is already
  consistent with this table. No value changes.
- `config/content/<indicator_id>.md` section "How spaceflight affects it": Bio 1 can
  write it from this table, one sentence per hazard, with the link.
- The 3D body view: the system ids in `indicators.csv` gain a second layer, the hazard
  that acts on them.

## Limits and open questions

- It says what changes, not when it becomes a problem. Question 4 stays unanswered
  here and belongs to `config/rules/attention.csv` (Bio 2).
- The immune system is affected and has no indicator in the app. It appears only as
  context, and that is a deliberate omission, not an oversight.
- The metabolic rows are the weakest: nutrition is not one of the five hazards, so the
  link is made through body mass and diet, not directly.
