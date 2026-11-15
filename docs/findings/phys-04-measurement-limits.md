# F-phys-04 · Two indicators measure something other than what their name suggests

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 20:10
**Reviewed by:** _pending_

## Claim

No opened NASA or partner page publishes the accuracy, the precision or the sampling
rate of the instruments behind the seven indicators, and two of them measure a
different quantity from the one their name suggests: skin temperature instead of core
temperature, and motion instead of sleep.

## What each number actually is

| Indicator | What the instrument records | What it is not | Source |
| --- | --- | --- | --- |
| `temp_core_c` | T-Mini headband: core body temperature over hours | Not the shirt: Bio-Monitor records **skin** temperature. They are different quantities and cannot share a limit | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| `sleep_h` | Actiwatch: motion (accelerometer) and ambient light (photodetectors) | Not brain activity. Sleep is inferred, and the questionnaire adds what the crew member perceived | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| `mood_1_5` | A questionnaire before sleep, plus journaling | Not an instrument reading. Two people can answer 3 meaning different things | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ |
| `hr_bpm` | ECG, Holter or the Bio-Monitor shirt | Not a stable baseline on Earth: in flight it was lower than preflight and rose past baseline at re-entry | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf |
| `glucose_mgdl` | i-STAT analyser: one fingerstick sample, read by amperometry | Not continuous monitoring. One value is a point, not a trend | https://ntrs.nasa.gov/citations/20230006919 https://pubmed.ncbi.nlm.nih.gov/9191561/ |
| `bp_sys_mmhg`, `bp_dia_mmhg` | Bio-Monitor shirt or an arm cuff | Not a single rule: clinical sources state a threshold across both numbers, and one id cannot say "or" | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| all seven | — | No page read states an accuracy, a precision, a sampling rate or a calibration procedure | the pages above |

## The two that matter most

**Skin is not core.** The candidate answer to "body temperature" contains two different
measurements, and a 36.8 °C reading from the shirt does not mean the same as 36.8 °C
from the headband. A single warning value for both would be wrong for one of them.

**Exercise moves the reading.** The Thermolab study reports that core temperature rises
higher and faster during exercise in space than on Earth, and stays elevated at rest.
A limit set at rest will flag a normal post-exercise reading, which is why
`context` exists in the entry: `rest`, `after_exercise`, `on_waking`, `before_sleep`.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Wearable Tech for Space Station Research | T-Mini "examines how the body regulates its core temperature"; Actiwatch "contains an accelerometer to measure motion and photodetectors to monitor ambient lighting" | NASA | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| CSA Bio-Monitor | Measures "skin temperature" among pulse, blood pressure, breathing, oxygen saturation and activity | NASA partner | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Thermolab, reported on the NASA page | Core temperature "rises higher and faster during exercise in space than on Earth", and the increase was sustained during rest | Peer-reviewed, NASA summary | https://www.nature.com/articles/s41598-017-15560-w |
| Cardiovascular evidence report, p. 23 | In-flight heart rate and blood pressure were lower than preflight and rose past baseline at re-entry | NASA | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf |
| Spaceflight Standard Measures | A questionnaire after waking on sleep quality and quantity; another before sleep on mood | NASA | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ |

## Confidence

Medium. The two concrete cases (skin versus core, motion versus sleep) come from pages
opened today and are stated in plain words. The general statement about missing
precision is an absence: it holds for the sources we read, not for the manufacturer's
documentation, which was not opened.

## What it changes in the solution

- `config/content/<indicator_id>.md`: Bio 1 words the measurement step from this table.
  For `temp_core_c` the text says T-Mini and not the shirt; for `sleep_h` it says
  actigraphy plus the crew member's own answer.
- The interface: no screen may claim an accuracy or a precision for a value.
- `docs/findings/phys-02`: `min_spread` for `sleep_h` is a criterion noise, not an
  instrument noise, because actigraphy infers sleep instead of measuring it.
- `config/data/indicators.csv`: `measured_on_board` already matches this table for the
  seven rows.

## Limits and open questions

- It does not say the instruments are inaccurate. It says how much is unknown.
- The manufacturer documentation (Carré Technologies, Hexoskin, Philips Actiwatch) was
  not opened. If it publishes an accuracy, this finding gains a second half.
- The page number for the cardiovascular report is quoted from
  `team/eng1/notes/challenge-resources.md`; re-check it before citing a number from it.
- Nothing here is a threshold. Attention values belong to `config/rules/attention.csv`
  (Bio 2).

## Sources

- Wearable tech: https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/
- Bio-Monitor: https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
- Thermolab (Nature, 2017): https://www.nature.com/articles/s41598-017-15560-w
- Cardiovascular evidence report: https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf
- Spaceflight Standard Measures: https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/
