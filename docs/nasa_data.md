# NASA data and resources · Phys

Required to compete for global awards: every NASA or partner-agency resource the
solution uses, what we took and where it is used. Filled on Sat 14 Nov for cp3.

| Resource | Link | What we take | Where it is used | Added by |
| --- | --- | --- | --- | --- |
| Hazard: Gravity Fields | https://www.nasa.gov/hrp/hazard-gravity-fields/ | Fluids shift headward and may press on the eyes; weight-bearing bones lose 1 % to 1.5 % of mineral density per month; lightheadedness and fainting at gravity transitions | `config/data/indicators.csv` | Phys |
| Hazard: Isolation and Confinement | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ | Sleep loss, circadian desynchronization and work overload; journaling used to assess mental and emotional state | `config/data/indicators.csv` | Phys |
| Hazard: Hostile/Closed Environments | https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ | Temperature, pressure, lighting, noise and microbes; stress hormones rise and the immune system changes | `config/data/indicators.csv` | Phys |
| Risks of Human Spaceflight | https://www.nasa.gov/hrp/risks/ | The 17 risks grouped by body system, and the statement that none gives a clinical threshold | `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| Spaceflight Standard Measures | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ | Wrist actigraphy for the sleep-wake cycle; a questionnaire after waking on sleep quality and quantity; a questionnaire before sleep on mood, team cohesion and habitability | `config/data/indicators.csv` | Phys |
| Wearable Tech for Space Station Research | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ | T-Mini headband for core temperature over hours; Actiwatch for motion and light; vest for heart rate and breathing in sleep; dosimeters for radiation | `config/data/indicators.csv` | Phys |
| NASA-STD-3001 Volume 1, Revision C | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | Requirement to monitor and trend vital and behavioural signs in mission; limits relative to pre-mission values; 37 °C as the normal core temperature | `docs/findings/phys-01-baseline-over-fixed-ranges.md`, `config/data/demo_ranges.csv` | Phys |
| HRP Cardiovascular Evidence Report (2022) | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf | In-flight heart rate and blood pressure lower than preflight, rising past baseline at re-entry; no in-flight attention values | `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| HRP Nutrition Evidence Report (2020) | https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf | Few studies on carbohydrate metabolism in microgravity and conflicting results, so no in-flight glucose range can be claimed from it | `docs/findings/phys-01-baseline-over-fixed-ranges.md`, glucose note in phys-02 | Phys |
| In-Situ Laboratory Analysis Capability for Exploration Spaceflight (NTRS 20230006919) | https://ntrs.nasa.gov/citations/20230006919 | Blood analysis exists in flight as a point-of-care capability with fingerstick cartridges, not as continuous monitoring | `config/data/indicators.csv` (`glucose_mgdl`) | Phys |
| Bio-Monitor: Keeping an eye on astronauts' vital signs (CSA) | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | Pulse and heart electrical activity, blood pressure, breathing rate and volume, skin temperature, oxygen saturation and activity, measured by a smart shirt worn in sleep and exercise | `config/data/indicators.csv` | Phys |

## What each resource cannot support

- **Hazard pages:** they say what changes and why it matters. They give no thresholds and no instrument data.
- **Risks of Human Spaceflight:** narrative summaries that link to reports. The page itself holds no clinical values.
- **Spaceflight Standard Measures:** describes the methods and says the data go to LSDA. The rows are not on the page.
- **Wearable Tech:** describes instruments. It publishes no accuracy, sampling rate or calibration.
- **NASA-STD-3001:** sets no heart-rate, blood-pressure, temperature, sleep-hour or mood cut-offs. Its limits are percentages of each crew member's pre-mission values.
- **Cardiovascular report:** documents the problem, including presyncope at landing, but gives no in-flight attention values.
- **Nutrition report:** documents that the glucose evidence is thin and contradictory. It cannot be used to claim a normal in-flight range.
- **NTRS 20230006919:** shows that in-flight blood analysis exists. It is not a dataset and gives no glucose range.
- **Bio-Monitor:** describes the device. It measures **skin** temperature, not core, and publishes no precision.

## The other challenge resources

The challenge page lists five resources. Two are used above (Hazards and Risks). The
other three, Ongoing HRP Research, CSA radiation monitoring and CSA "Why do we
conduct science experiments in space?", were read as context and are **not** declared
as used: nothing in `config/` or in the findings depends on them.

## Open

- The glucose row cites NTRS 20230006919 and the 1997 validation study in Clinical
  Chemistry. The NTRS record was opened; the two papers behind the specific i-STAT
  glucose claim were read by Bio 2 and should be opened again before the submission.
- Every number quoted from a PDF must be checked on its page before it enters
  `config/`.
