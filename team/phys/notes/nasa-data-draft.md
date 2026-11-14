# Draft for docs/nasa_data.md

Sat 14 Nov, 11:55. Ready-to-paste rows, kept here until `FORMATS.md` says which
indicators the app uses (T-06). The rule in the `nasa-data` skill: list only what
we actually use, not every page we read.

## Rows

| Resource | Link | What we take | Where it is used | Added by |
| --- | --- | --- | --- | --- |
| NASA HRP · Five hazards of human spaceflight | https://www.nasa.gov/hrp/hazards/ | The five hazard categories that the "how does spaceflight affect it" answer is built on | Content for each indicator card | Phys |
| NASA HRP · Risks of human spaceflight | https://www.nasa.gov/hrp/risks/ | The 17 risks and the body system each one affects | Content and the risk explanation in the app | Phys |
| NASA HRP · Ongoing HRP research | https://www.nasa.gov/hrp/ongoing-hrp-research/ | Which measurements are taken in flight, and with what | Measurement section of each card | Phys |
| NASA HRP · Wearable tech for space station research | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ | Core temperature (T-Mini), sleep (Actiwatch), heart and breathing in sleep (vest), CO2, radiation dosimeters | Measurement section | Phys |
| NASA HRP · Tempus Pro | https://www.nasa.gov/reference/tempus-pro/ | A telemedicine device that collects vital signs and imaging in flight | Evidence that in-flight vital-sign collection is feasible | Phys |
| NASA-STD-3001 Volume 1, Revision C | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | The requirement to monitor and trend vital signs and behavioural health in mission; limits relative to each crew member's own baseline | The reason the tool exists; the baseline comparison | Phys |
| OCHMO technical brief, bone loss (OCHMO-TB-030) | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf | No in-flight bone density measurement exists; the pre and post flight limits | Why bone density is explained and not measured | Phys |
| CSA · Bio-Monitor | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | How heart rate, blood pressure, breathing, skin temperature and oxygen saturation are measured on the ISS | Measurement section for four of the example indicators | Phys |
| CSA · Space radiation monitoring | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | Neutrons are about 30 % of the dose on the ISS; how radiation is monitored | Radiation explanation | Phys |
| NASA OSDR | https://osdr.nasa.gov/ | Not used yet | — | Phys |

## What each resource cannot support

- **HRP hazard and risk pages:** no clinical thresholds. They say what changes and
  why it matters, not when a value needs attention.
- **NASA-STD-3001:** its limits are relative to the crew member's own pre-mission
  values (80 %, 95 %), not absolute cut-offs. It sets no heart-rate, blood
  pressure, temperature, sleep-hour or mood limit.
- **OCHMO-TB-030:** bone density cannot be a daily input. Pre and post flight only.
- **Bio-Monitor and wearable pages:** they describe instruments, not accuracy. No
  precision, sampling rate or calibration is published there.
- **OSDR:** mostly pre and post flight samples and omics, not daily in-flight
  series. It cannot be the source of a trend line inside the app.

## Before this moves into docs/nasa_data.md

1. `FORMATS.md` must name the indicators (T-06). Rows for indicators we drop are cut.
2. Every number quoted from a PDF is checked on the page and cited from that page.
3. Bio 2 needs the final list for the "NASA data" field of the submission page.
