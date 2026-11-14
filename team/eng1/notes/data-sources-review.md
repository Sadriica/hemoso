# HeMoSo data-source review

Checked 14 November 2026. This is a read-only research report for REQ-03, REQ-05, REQ-07, REQ-19 and REQ-29. It does not select values for the product.

## Retrieval notes

The live challenge Resources tab was opened. It lists exactly five resources: three NASA pages and two Canadian Space Agency (CSA) pages. It does not list an ESA resource. ESA material below is separated as an additional partner source reached from NASA's linked research pages, not as a sixth challenge-tab entry.

This machine rejected some valid HTTPS certificate chains. For public pages and PDFs only, I retried with `curl -sL --max-time 30 -k` as the task allowed. The Firecrawl CLI was unavailable and its documented keyless fallback prompted for login, so public pages were also checked through the web reader. No account was created and no login was used.

The four use codes in the tables are:

- **a**: how the indicator is measured on board (REQ-03)
- **b**: how spaceflight hazards affect it (REQ-07)
- **c**: published in-flight or ground values that may inform synthetic demo ranges (REQ-29)
- **d**: values that may inform attention thresholds (REQ-05)

“None found” means none was found in the resources reviewed. It does not mean no suitable source exists elsewhere.

## 1. Resource inventory

### Resources listed on the challenge tab

| Exact resource title | Link | Agency | What it actually offers | Format and access | Licence or terms | Selected indicators and use |
| --- | --- | --- | --- | --- | --- | --- |
| 5 Hazards of Human Spaceflight | https://www.nasa.gov/hrp/hazards/ | NASA | Narrative overview of the five hazards and links to hazard articles. It has no downloadable clinical dataset, table of indicator values, or API. | Public HTML; no login. | NASA site terms apply; check credited third-party material separately. | General **b** context for all nine indicators; no direct **a**, **c** or **d** values. |
| Risks of Human Spaceflight | https://www.nasa.gov/hrp/risks/ | NASA | Narrative summaries of 17 risks and links to Human Research Roadmap risk pages and evidence reports. | Public HTML and linked PDF reports; no login. No API on the page. | NASA site terms and the terms of each linked publication apply. | `hr_bpm`, `bp_sys_mmhg`, `bp_dia_mmhg`, `temp_core_c`, `spo2_pct`, `sleep_h`, `sleep_quality_1_5`, `mood_1_5`, `glucose_mgdl`: **b** through risk summaries/reports. Detailed support is uneven. |
| Ongoing HRP Research in Space | https://www.nasa.gov/hrp/ongoing-hrp-research/ | NASA | Study summaries and links. The page says ARCHeR used wrist actigraphy and Standard Measures collects physiological and psychological measures; it does not itself expose subject rows. | Public HTML; no login. Linked study pages and LSDA/NLSP hold details/data. | NASA site terms apply. | `sleep_h`, `sleep_quality_1_5`: **a**, **b**; `mood_1_5`: **a** through Standard Measures; other selected indicators only indirect study context. No **c** or **d** table on this page. |
| Monitoring Radiation for Astronaut Health | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | CSA partner | Narrative article about the CANS neutron instrument and earlier Canadian radiation monitors. It gives one percentage about neutron contribution, not crew vital-sign data. | Public HTML; no login; no download/API. | CSA permits personal, educational or informational non-commercial reproduction with accuracy, credit and no implied endorsement; commercial reuse needs permission: https://www.asc-csa.gc.ca/eng/terms.asp | General radiation **b** context only. None of the nine selected indicator values are measured by this page. |
| Why Do We Conduct Science Experiments in Space? | https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp | CSA partner | Narrative explanation of why ISS and deep-space experiments are done, with links to CSA experiment pages. No subject-level data or clinical table. | Public HTML; no login; no API. | Same CSA terms as above. | General **b** context for the selected indicators; no direct **a**, **c** or **d** support. |

### Data portals, standards and linked evidence

| Resource | Link | Agency | What it actually offers | Format and access | Licence or terms | Selected indicators and use |
| --- | --- | --- | --- | --- | --- | --- |
| NASA Open Science Data Repository (OSDR) | https://osdr.nasa.gov/ | NASA | Space-biology study metadata and files from GeneLab and ALSDA. The public AWS bucket describes biological research data from spaceflight and related experiments. OSDR also has RadLab radiation measurements. | Biological Data API: REST JSON plus query output in CSV, TSV and JSON; direct file downloads. Public S3 bucket works without an AWS account. RadLab API returns CSV, TSV, JSON or HTML. No login was needed for these public endpoints. | AWS registry says, “There are no restrictions on the use of this data.” https://registry.opendata.aws/nasa-osdr/ Individual study metadata should still be checked. | No opened OSDR study supplied a range for one of the nine selected crew indicators. RadLab supports radiation exposure, which is hazard context rather than a selected indicator. Potential **b**, not direct **a/c/d** in the material opened. |
| NASA Life Sciences Portal (NLSP), successor interface to LSDA | https://nlsp.nasa.gov/ | NASA | Searchable archive of missions, experiments, datasets, images and documents. The live app distinguishes public downloads from privacy-protected or offline datasets available by request. | JavaScript web app; public data may be downloaded. Data-request routes require sign-in. The app exposes `/api/v1`, but no public API documentation was found. The SPA had no readable server-rendered page; its production app bundle was opened to confirm access states. | No portal-wide data licence was visible in the opened app shell. Dataset-specific terms must be checked. Human subject data can be privacy-protected and request-only. | Standard Measures points here for `hr_bpm`, `bp_sys_mmhg`, `bp_dia_mmhg`, `sleep_h`, `sleep_quality_1_5`, `mood_1_5` data. Actual dataset rows/files were **not opened**, so no **c/d** values are reported. |
| NASA Technical Reports Server (NTRS) | https://ntrs.nasa.gov/ | NASA | Metadata records and full-text documents, images and videos, including reports used by HRP. Public records expose per-record distribution and copyright fields. | Public web search and direct PDF/other downloads without login. NTRS Registered content requires NASA Launchpad credentials and is limited to NASA civil servants, contractors and grantees. | Per-record terms vary: examples say “Public Use Permitted,” “Work of the US Gov. Public Use Permitted,” or a narrower permission. Check each record. | Can locate evidence for every selected indicator, but NTRS itself supplies no indicator value. Uses depend on the opened report; no direct **a-d** claim should cite only the portal landing page. |
| Human Research Roadmap (HRR) | https://humanresearchroadmap.nasa.gov/ | NASA | Risk, gap, task and evidence navigation. Mostly structured narrative records; the evidence index links reports and journal articles. | Public HTML and linked PDFs; no login encountered. No public API found. | NASA terms and each linked publication's terms apply. | All nine selected indicators can be researched for **b**; evidence reports also support some **a**. No portal-level **c/d** values. |
| HRP Evidence | https://humanresearchroadmap.nasa.gov/Evidence/ | NASA | Evidence reports and cited journal articles for each HRP risk. The index calls them the “current record of the state of knowledge from research and operations.” | Public HTML index; mainly PDF reports and publication links; no login. | NASA terms; journal links may carry publisher terms. | Strongest opened source for `hr_bpm`, both BP indicators and `glucose_mgdl` **b**; can contain tables/figures, but no suitable absolute demo range or operational alert threshold was found for those indicators. |
| NASA-STD-3001 Volume 1, Revision C, Crew Health | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | NASA | Engineering/medical requirements and rationale, including monitoring vital and behavioural signs, a sleep-period recommendation, definitions and exposure limits. It is not a dataset. | Public PDF, 86 pages; no login. | Public NASA standard; NASA content rules apply. | All selected indicators: general **a** rationale. `sleep_h`: **c** planning point. `temp_core_c`: **c/d** definition values. `mood_1_5`: **d** only as an unnumbered “clinically accepted values” requirement. No HR/BP/SpO2/glucose cut-off. |
| NASA-STD-3001 Volume 2, Revision F, Human Factors, Habitability, and Environmental Health | https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2 | NASA | System design and environment requirements, including atmosphere, temperature, radiation monitoring and alerting. It is not a clinical subject dataset. | Public HTML by section and PDF. Standards site says it is cleared for public internet access; no login. Revision F is the active 14 July 2026 version. | “Internet Public -- Standard is cleared for public accessibility on the internet.” | `temp_core_c` and `spo2_pct`: indirect **b** context through environment requirements. It gives inspired oxygen/cabin limits, not SpO2 attention values. No direct selected-indicator **c/d** range. |
| Spaceflight Standard Measures | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ | NASA | Exact measurement descriptions and a statement that the resulting data go to LSDA. | Public HTML; linked LSDA/NLSP database. | NASA terms; LSDA dataset terms separately. | `sleep_h`, `sleep_quality_1_5`, `mood_1_5`: **a**. `hr_bpm` and both BP indicators: pre/post-flight test **a**, not the team's in-flight method. No scale or thresholds. |
| Wearable Tech for Space Station Research | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ | NASA page describing NASA, ESA and CSA investigations | Measurement descriptions for T-Mini, Actiwatch, wearable heart monitoring and radiation dosimeters. No downloadable subject table on the article. | Public HTML; links to investigations/publications. | NASA terms; linked ESA/CSA/publication terms separately. | `temp_core_c`: **a/b**; `sleep_h`, `sleep_quality_1_5`: **a/b**; `hr_bpm`: **a** during sleep. No **c/d** values. |
| Bio-Monitor: Keeping an eye on astronauts' vital signs | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | CSA partner | Device description and measurement list; no downloadable readings. | Public HTML; no login/API. | CSA terms above. | `hr_bpm`, `bp_sys_mmhg`, `bp_dia_mmhg`, `spo2_pct`: **a**. It says skin temperature, not core temperature, so it does not directly support `temp_core_c`. No **c/d**. |
| ESA Human and Robotic Exploration Data Archive (HREDA) | https://hreda.esac.esa.int/hreda/ | ESA partner | Archive landing app for ESA-funded/co-funded microgravity and ground investigations. A search result exposed a SLEEP investigation metadata record, DOI and CC licence, but the record/download itself did not render in either reader. | JavaScript app; landing page opened with no readable lines. Investigation files and whether they require an account were **not opened**. | Search metadata stated CC BY-NC 3.0 IGO for hosted ESA Space Science Archive data, but the record could not be opened; verify before reuse. | Likely relevant to `sleep_h`/`sleep_quality_1_5`, but data and fields are **not opened**, so no **a-d** support is claimed. |
| ESA Space Medicine | https://www.esa.int/%20About_Us/EAC/Space_Medicine | ESA partner | Narrative programme page about medical operations and human research. It names the European Astronaut Centre database but exposes no subject table. | Public HTML; no login. | ESA says its published material is copyright-protected; use must follow the credited material's terms. | General **b** context; no direct source for a selected indicator's **a**, **c** or **d** use. |

## 2. Best opened source by indicator and use

### `hr_bpm` — Heart rate

- **a — on-board measurement:** CSA Bio-Monitor, “The system measures the following: ... pulse and electrical activity of the heart”. Location: **Background**, measurement list. The page also says the garments can be worn during sleep and exercise.
- **b — hazard effect:** HRP cardiovascular evidence report, “Inflight heart rate and systolic and diastolic blood pressure were decreased when compared to the preflight values (Figure 5).” Location: *Evidence Report: Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes*, document p. 16 (PDF p. 23), paragraph before Figure 5. Link: https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf
- **c — demo range:** None found. Figure 5 shows study values, but no exact table cell or population range was available in the text layer, so no number is copied.
- **d — attention value:** None found. The same report describes observations, not an operational heart-rate cut-off.

### `bp_sys_mmhg` — Systolic blood pressure

- **a:** CSA Bio-Monitor, “The system measures the following: ... blood pressure”. Location: **Background**, measurement list.
- **b:** Same cardiovascular report and exact sentence quoted for `hr_bpm`; document p. 16 (PDF p. 23), Figure 5 discussion.
- **c:** None found in an exact table cell suitable as a range. The report's values are study observations and should not be silently converted into a synthetic range.
- **d:** None found in these resources.

### `bp_dia_mmhg` — Diastolic blood pressure

- **a:** CSA Bio-Monitor, “The system measures the following: ... blood pressure”. Location: **Background**, measurement list.
- **b:** Same cardiovascular report sentence: “Inflight heart rate and systolic and diastolic blood pressure were decreased when compared to the preflight values (Figure 5).” Location: document p. 16 (PDF p. 23).
- **c:** None found in an exact table cell suitable as a range.
- **d:** None found in these resources.

### `temp_core_c` — Core temperature

- **a:** NASA *Wearable Tech for Space Station Research*: “The study uses a non-invasive headband monitor that astronauts can wear for hours at a time.” Location: **Warm to the core**. The preceding sentence identifies the investigation as Thermo-Mini/T-Mini and says it examines core temperature.
- **b:** Same section: “Spaceflight can affect body temperature regulation and daily rhythms due to factors such as the absence of convection ... and changes in the cardiovascular and metabolic systems.”
- **c:** NASA-STD-3001 Volume 1 says, “Normal body temperature is around 98.6ºF (37ºC).” Location: **Appendix A, Definitions, Hypothermia**, p. 63 of 86. This is one reference point, not an in-flight range.
- **d:** Same definition: “Hypothermia occurs as your body temperature falls below 95ºF (35ºC).” Location: **Appendix A, Definitions, Hypothermia**, p. 63 of 86. This reports the standard's definition; Phys/Bio 2 must decide whether and how it can be used in an attention rule.

### `spo2_pct` — Blood oxygen saturation

- **a:** CSA Bio-Monitor, “The system measures the following: ... blood oxygen saturation”. Location: **Background**, measurement list.
- **b:** NASA-STD-3001 Volume 2 says, “A safe, breathable atmosphere is critical to human health and performance.” It then requires control of oxygen partial pressure and other cabin variables. Location: **6.2 Internal Atmosphere**, Revision F. This is indirect environmental support; it does not state how a crew member's SpO2 changes.
- **c:** None found.
- **d:** None found. Volume 2 gives inspired oxygen/cabin-atmosphere limits, not a blood-oxygen-saturation threshold; the two must not be treated as interchangeable.

### `sleep_h` — Sleep duration

- **a:** NASA Standard Measures: “Astronauts complete a questionnaire after they wake up that measures sleep quality and quantity”. Location: **Sleep quality/team questionnaire**. NASA's wearable article also says Actiwatch contains an accelerometer for motion and photodetectors for ambient light and was used to monitor sleep length and quality; location: **To sleep, perchance to dream**.
- **b:** NASA *Risks of Human Spaceflight*: “Stressors include chronic sleep loss, constant work demands, and irregularities in their internal biological clocks.” Location: **Risk of Inadequate Sleep and Irregular Schedules**.
- **c:** NASA-STD-3001 Volume 1 lists “Recommended 8.5 hr. sleep period (need to also include pre sleep of 2 hrs./post sleep of 1.5 hrs.)”. Location: **[V1 6001] Circadian Shifting Operations and Fatigue Management rationale**, p. 50 of 86. This is a planned sleep opportunity, not an observed range.
- **d:** None found. [V1 4014] says planned sleep periods “shall have established limits,” but the standard does not turn hours slept into a crew/CMO/flight-surgeon alert rule.

### `sleep_quality_1_5` — Sleep quality

- **a:** NASA Standard Measures exact sentence: “Astronauts complete a questionnaire after they wake up that measures sleep quality and quantity”. Location: **Sleep quality/team questionnaire**.
- **b:** NASA *Risks of Human Spaceflight* exact sentence quoted for `sleep_h`; location: **Risk of Inadequate Sleep and Irregular Schedules**.
- **c:** None found. None of the opened NASA/partner pages says this questionnaire uses a 1-to-5 scale.
- **d:** None found. No cut-off on a 1-to-5 scale appears in the opened resources.

### `mood_1_5` — Mood

- **a:** NASA Standard Measures: “another questionnaire before going to sleep about mood, team cohesion and performance, and crew livability and habitability.” Location: **Sleep quality/team questionnaire**.
- **b:** NASA *Risks of Human Spaceflight*: “Isolation, radiation, distance from Earth, and other intense space stressors may all take a toll on the mental health of the crew.” Location: **Risk of Behavioral Changes and Psychiatric Disorders**.
- **c:** None found. The opened source does not state a 1-to-5 scale.
- **d:** NASA-STD-3001 Volume 1 requires behavioural health and cognitive status to be “within clinically accepted values as determined by behavioral health evaluations.” Location: **[V1 4011] Mission Cognitive Status**, p. 34 of 86. It supplies no number and does not support a 1-to-5 alert threshold.

### `glucose_mgdl` — Blood glucose

- **a:** None found. The nutrition report discusses in-flight glucose-tolerance research, but no opened source describes a routine self-measurement device or procedure on board.
- **b:** NASA HRP Nutrition Evidence Report: “However, to date, few investigations have been conducted to assess how microgravity affects the metabolism of dietary carbohydrate, and those studies have had conflicting results.” Location: *Nutrition Evidence Report*, **Fuel Sources — Carbohydrate (and Fiber)**, document pp. 34–35. Link: https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf
- **c:** None found. The same report describes conflicting study results and does not provide a general in-flight mg/dL range.
- **d:** None found.

## 3. Gaps

| Indicator | Missing use(s) after this review | Why it remains open |
| --- | --- | --- |
| `hr_bpm` | **c, d** | Measurement and direction of in-flight change are documented, but no exact general range or attention cut-off was found. |
| `bp_sys_mmhg` | **c, d** | Same. The current WHO source in `demo_ranges.csv` is outside this NASA/partner-resource review. |
| `bp_dia_mmhg` | **c, d** | Same. |
| `temp_core_c` | Full **c** range | NASA-STD-3001 gives a normal reference point and hypothermia definition, not a complete in-flight/ground range. |
| `spo2_pct` | Direct **b**, **c, d** | On-board measurement is documented. Cabin oxygen requirements are not equivalent to SpO2 values. |
| `sleep_h` | Observed **c** range, **d** | The 8.5-hour value is a schedule recommendation, not an observed range or alert threshold. |
| `sleep_quality_1_5` | Scale source for **a/c**, plus **c, d** | The questionnaire is documented, but the 1-to-5 scale is not. |
| `mood_1_5` | Scale source for **a/c**, plus **c, numeric d** | Mood questionnaire is documented; scale and cut-off are not. |
| `glucose_mgdl` | **a, c, d** | Evidence discusses glucose metabolism and tests, not a routine onboard device, general mg/dL range, or attention value. |

Cross-resource gaps:

- The five challenge-tab resources are not data downloads. Their value is source-backed narrative and links.
- OSDR's opened public datasets/API are mainly biology and radiation data, not a ready table of these nine crew self-monitoring indicators.
- LSDA/NLSP may hold relevant Standard Measures data, but privacy-protected data can be request-only. No subject file was opened, so it cannot yet source `demo_ranges.csv`.
- The ESA HREDA SLEEP record and files were not opened. Its licence and login/download path must be rechecked in the live archive before use.
- No opened resource supports the team's 1-to-5 sleep-quality or mood scales.
- Except for the NASA-STD-3001 hypothermia definition, the opened NASA/partner resources do not supply operational attention thresholds for the chosen indicators. No diagnosis claim should be inferred from study observations.

## 4. Suggested rows for Phys-owned tables

These are suggestions only. Phys should open the link again, choose whether the project actually uses it, and then copy/edit a row.

### Rows in the format of `docs/nasa_data.md`

| Resource | Link | What we take | Where it is used | Added by |
| --- | --- | --- | --- | --- |
| Spaceflight Standard Measures | https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space/ | On-board sleep quantity/quality and mood questionnaire methods; LSDA destination | `config/data/indicators.csv` measurement methods for `sleep_h`, `sleep_quality_1_5`, `mood_1_5` | Phys |
| Wearable Tech for Space Station Research | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ | T-Mini core-temperature method and Actiwatch sleep method; spaceflight effects | `config/data/indicators.csv`; indicator content for temperature and sleep | Phys |
| HRP Cardiovascular Evidence Report | https://humanresearchroadmap.nasa.gov/evidence/reports/Cardio%20Risk%20EB%202022%20FINAL_4-3-2023.pdf | In-flight heart-rate and blood-pressure measurement and directional change from preflight | Heart-rate and blood-pressure findings/content | Phys |
| HRP Nutrition Evidence Report | https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf | Limits of current evidence on glucose/carbohydrate metabolism in spaceflight | Glucose finding and documented source gap | Phys |
| NASA-STD-3001 Volume 1, Revision C | https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf | Vital/behavioural monitoring requirement; sleep-period recommendation; temperature definition | Requirements/content and possible source review for `temp_core_c` and `sleep_h` | Phys |
| NASA-STD-3001 Volume 2, Revision F | https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2 | Cabin atmosphere and environmental monitoring requirements; not an SpO2 threshold | Hazard context for temperature and oxygen saturation | Phys |
| NASA OSDR Biological Data API | https://visualization.osdr.nasa.gov/biodata/api/ | Evidence that OSDR offers REST JSON, CSV/TSV/JSON queries and direct downloads | NASA-data disclosure only if the project actually consumes an OSDR record/API | Phys |

### Rows in the format of `docs/sources.md`

| Source | Link | Value taken | File where it is used | Added by |
| --- | --- | --- | --- | --- |
| CSA Bio-Monitor | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp | On-board pulse/heart electrical activity, blood pressure and blood oxygen saturation measurement | `config/data/indicators.csv` | Phys |
| CSA Monitoring Radiation for Astronaut Health | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp | Radiation-monitoring context only; no selected vital-sign value | Radiation hazard finding/content, if used | Phys |
| CSA Why Do We Conduct Science Experiments in Space? | https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp | Partner-agency context for weightlessness, radiation, isolation and communication delay | Hazard overview, if used | Phys |
| ESA HREDA | https://hreda.esac.esa.int/hreda/ | Nothing yet; record/files not opened | Do not add as used until dataset and licence are verified | Phys |

## Bottom line

The five official challenge resources are good evidence for why and how measurements are made, but they are not direct data feeds. OSDR is the clearest open NASA data/API resource; its opened material does not provide ready ranges for the nine chosen indicators. LSDA/NLSP is the likely home of relevant human Standard Measures data, but access depends on each dataset and privacy status. The best direct partner source is CSA Bio-Monitor for heart rate, blood pressure and oxygen saturation methods. Most `demo_ranges.csv` values and almost all attention thresholds still need a different exact source or the required `Assumption` label.
