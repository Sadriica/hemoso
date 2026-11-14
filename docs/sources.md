# Sources · Phys

| Source | Link | Value taken | File where it is used | Added by |
| --- | --- | --- | --- | --- |
| Bio-Monitor: Keeping an eye on astronauts' vital signs (CSA) | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | Pulse and heart electrical activity, blood pressure, breathing rate and volume, skin temperature, blood oxygen saturation and activity, measured by a smart shirt worn in sleep and exercise | `config/data/indicators.csv` | Phys |
| Hazard: Gravity Fields (NASA HRP) | https://www.nasa.gov/hrp/hazard-gravity-fields/ | Fluids shift upward to the head and may press on the eyes; weight-bearing bones lose 1 % to 1.5 % of mineral density per month; lightheadedness and fainting at gravity transitions | `config/data/indicators.csv` | Phys |
| Hazard: Isolation and Confinement (NASA HRP) | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ | Sleep loss, circadian desynchronization and work overload compound in isolation; journaling is used to assess mental and emotional state | `config/data/indicators.csv` | Phys |
| Hazard: Hostile/Closed Environments (NASA HRP) | https://www.nasa.gov/hrp/hazard-hostile-closed-environments/ | Temperature, pressure, lighting, noise and microbes; stress hormones can rise and the immune system can change | `config/data/indicators.csv` | Phys |
| Spaceflight Standard Measures (NASA) | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ | Wrist actigraphy for the sleep-wake cycle; a questionnaire after waking on sleep quality and quantity; a questionnaire before sleep on mood, team cohesion and habitability | `config/data/indicators.csv` | Phys |
| Wearable Tech for Space Station Research (NASA) | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ | T-Mini headband for core temperature over hours; Actiwatch for motion and ambient light; vest for heart rate and breathing in sleep; dosimeters for radiation | `config/data/indicators.csv`, `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| WHO · Hypertension fact sheet | https://www.who.int/news-room/fact-sheets/detail/hypertension | Hypertension is 140/90 mmHg or higher measured on two different days; 180/120 mmHg or higher with symptoms means care at once; diagnosis belongs to a health professional | `config/data/demo_ranges.csv`, `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| Risks of Human Spaceflight (NASA HRP) | https://www.nasa.gov/hrp/risks/ | The 17 risks, grouped by body system; each page states what changes and what protects the crew, and none gives a clinical threshold | `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| NASA-STD-3001 Volume 1, Revision C | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | Programs shall monitor physiological and psychosocial well-being and trend vital signs in mission; permissible limits are relative to pre-mission values (80 % aerobic capacity and muscle strength, 95 % bone mineral density) | `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |
| Cardiovascular evidence report (2022) | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf | In-flight heart rate and blood pressure were lower than preflight and rose past baseline at re-entry; the report gives no in-flight attention values | `docs/findings/phys-01-baseline-over-fixed-ranges.md` | Phys |

Two rows were quoted from `team/eng1/notes/challenge-resources.md`, which records the
page numbers: the cardiovascular report and NASA-STD-3001. Re-check the page before
any number from them goes into `config/`.

`scripts/check_sources.py` reported a `URLError` for the CSA Bio-Monitor page on
Sat 14 at 16:30; the page opened normally earlier the same day from this machine.
