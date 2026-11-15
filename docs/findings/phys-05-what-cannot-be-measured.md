# F-phys-05 · Four things the app must explain instead of graph

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 20:35
**Reviewed by:** _pending_

## Claim

Four things a health monitor might promise cannot be self-measured in flight: bone
density, radiation dose, continuous blood glucose and immune status. NASA measures
them before and after the flight, with dedicated instruments, or in a laboratory on
the ground.

## The four, and what NASA does instead

| What cannot be measured in flight | Why | What NASA does instead | What the app can still say | Source |
| --- | --- | --- | --- | --- |
| Bone mineral density | "No system to date measures bone density in-flight". The measurement is DXA, a scanner | Scans before and after the mission; the limit is 95 % of pre-mission values for hip and spine, 90 % for the femoral neck | Why it matters, which hazard causes the loss (1 % to 1.5 % per month), and the countermeasure: resistive exercise | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf |
| Radiation dose to the crew | It is not a vital sign. Dedicated instruments record it, not the astronaut | Passive and active dosimeters; Canada flies CANS to measure neutrons, which are about 30 % of the dose on the ISS | Which hazard it is, and that the career limit is held by the radiation team | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp |
| Continuous blood glucose | The analyser takes one fingerstick sample; there is no continuous monitor in the sources read | A point measurement when the crew takes a sample. NASA itself records that onboard laboratory capability is "little to no" and lists instruments still in development | One value with its time and context, never a trend line built from a single point | https://ntrs.nasa.gov/citations/20230006919 https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 |
| Immune status | It needs blood, saliva or urine markers | Samples are collected in flight and returned to Earth; researchers are working on in-flight monitoring tools | Symptoms the crew can report: cold sores, rashes, atypical allergies, infections | https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/ |

## Why this is a strength and not a gap

The challenge asks two of its five questions about action: when a result needs
attention, and what prevents a critical condition. For these four the honest answer
exists and is useful. It says what NASA does, who does it, and which countermeasure is
already in place. None of that needs a value on a chart.

An app that graphs bone density has invented data. An app that says "this is measured
before and after the flight, here is your limit and here is the exercise that protects
it" is telling the crew something true and useful.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| OCHMO technical brief, bone loss | "No system to date measures bone density in-flight" | NASA | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf |
| HRP risk, altered immune response, gap IM-201 | "there is little to no medical laboratory analysis capability on board ISS" | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85 |
| Risk of altered immune system responses | "Radiation, microgravity, poor sleep and other spaceflight stressors can alter the immune system"; reported symptoms include cold sores, rashes, atypical allergies and infections | NASA | https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/ |
| CSA, monitoring radiation | "Neutron radiation, which contributes to about 30% of total radiation on the ISS"; Canada flies CANS to measure it | NASA partner | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp |
| Risk of spaceflight-induced bone changes | "Without gravity, bones break down and become more brittle"; research seeks to quantify the losses and preserve strength through diet, exercise and medication | NASA | https://www.nasa.gov/hrp/risks/ |

## Confidence

High for the first three: each rests on a NASA or partner page that states the
limitation in plain words. Medium for immune status, because the page gives the
symptoms and the sampling method but does not say that no in-flight monitor exists;
that claim rests on gap IM-201.

## What it changes in the solution

- `config/content/<indicator_id>.md`: the four are written as explanation, with no
  chart and no daily entry.
- The 3D body: bone and the eye/brain system stay as readable regions, not as inputs.
- The pitch: this finding is the answer to "why do you not measure everything?", which
  a judge will ask.
- `docs/nasa_data.md`: the sources above are declared there.

## Limits and open questions

- It does not say these measurements are unimportant. It says the crew cannot take
  them with a wearable.
- NASA is developing in-flight laboratory capability. If one of those instruments
  reaches routine use, this finding changes; the date matters.
- The bone limit (95 %) is relative to each crew member's pre-mission scan, so the app
  cannot compute it without that scan. It can only explain it.

## Sources

- OCHMO-TB-030, bone loss: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf
- HRP risk, altered immune response: https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=85
- Risk of altered immune system responses: https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/
- CSA, monitoring radiation: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- Risks of human spaceflight: https://www.nasa.gov/hrp/risks/
