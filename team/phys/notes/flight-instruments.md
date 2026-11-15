# Which instruments actually fly

Sun 15 Nov, 11:55. Answer for the submission page and the mission-concept pitch: one
row per indicator in `config/data/indicators.csv`, the instrument that measures it, and
whether that instrument has flown.

| Indicator | Instrument or method | Flies? | Evidence |
| --- | --- | --- | --- |
| `hr_bpm` | Bio-Monitor smart shirt; ECG and Holter in research | **Yes** | CSA Bio-Monitor page: pulse and electrical activity of the heart |
| `bp_sys_mmhg` | Bio-Monitor; arm cuff | **Yes** | CSA Bio-Monitor page: blood pressure among the measured signs |
| `bp_dia_mmhg` | Same as above | **Yes** | Same page |
| `temp_core_c` | T-Mini headband (ESA Thermo-Mini) | **Yes** | NASA wearables page: headband worn for hours, core temperature |
| `sleep_h` | Actiwatch wrist monitor plus the daily questionnaire | **Yes** | NASA wearables page and Standard Measures |
| `mood_1_5` | Questionnaire before sleep, plus journaling | **Yes, as a questionnaire** | Standard Measures: questionnaire before sleep on mood |
| `glucose_mgdl` | i-STAT point-of-care analyser, fingerstick | **Partly** | NTRS 20230006919 and the 1997 validation. NASA also records that onboard laboratory capability is "little to no" (gap IM-201) |
| `reaction_median_ms` | Reaction Self Test on a tablet, 3-minute PVT-B, run here as 90 s | **Yes** | JSC-CN-18714: 3-minute performance period on the ISS |
| `reaction_lapses` | Same test | **Yes** | Same record; lapse definition from the PVT-B papers |
| `appetite_1_5` | Self-rated question at the daily check-in | **No instrument** | It is a question, not a measurement |
| `fluid_intake_ml` | Metered galley dispenser; the crew logs what it drinks | **Yes, manual** | OCHMO-TB-027 |
| `body_mass_kg` | SLAMMD on the ISS; BMMD in the Russian segment | **Yes** | SLAMMD validation (PubMed 25197887) |

## How to say it in one line

> **Nine of the twelve indicators are measured by instruments that already fly on the
> ISS**; two are self-reported by the crew; one is measured with a point-of-care
> analyser that flies but is not a routine monitor.

Counting: instrument 9 (`hr`, `bp_sys`, `bp_dia`, `temp`, `sleep`, `reaction_median`,
`reaction_lapses`, `body_mass`, and `fluid` with the metered dispenser counted as
manual). Self-reported 2 (`mood`, `appetite`). Partial 1 (`glucose`).

If you count the metered dispenser as manual rather than an instrument, the line becomes
"eight by instruments, three by the crew". Choose one and keep it.

## What not to say

- Not "all indicators are measured by wearables": the reaction test is a tablet task and
  the mass measurement is a device the crew uses, not something worn.
- Not "continuous monitoring": only the shirt is continuous; sleep, mass and reaction are
  periodic, and glucose is a single sample.
- Not "NASA-approved": nothing here is certified for operational use.
