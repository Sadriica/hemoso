# A shape for the indicator list that holds up

Sat 14, 12:10. Proposal for the empty section "Indicators we chose, and why" in
`docs/DECISIONS.md` (T-06). This is the Phys view: what can be measured, with what,
and what we can honestly compare against.

## 1. What changes in the original idea

The original shape was: value vs. a fixed reference range, then a verdict. The weak
point is the range, not the idea. NASA publishes no in-flight cut-offs, its own
limits are relative to each crew member's pre-mission values, and a clinical range
from Earth is not a diagnosis tool for orbit (see `docs/findings/phys-01`).

The shape that survives: **each astronaut is compared with their own baseline**, and
the app says so. A fixed range appears only where a published source gives one, and
then as a boundary that sends the case to the CMO, never as a verdict.

That inverts the pitch: the tool is not "am I normal?" but "am I still myself?".
That is the honest question in microgravity, and it is a stronger one for the judges.

## 2. Three tiers, because not every indicator has a sensor

| Tier | Meaning | Indicators | Comparison basis |
| --- | --- | --- | --- |
| A · Measured | An instrument that already flies records it | heart rate, blood pressure, core temperature, skin temperature, oxygen saturation, sleep hours | baseline first, clinical boundary second |
| B · Self-reported | The crew member answers or logs it | sleep quality, mood, fatigue, symptoms | baseline of the person's own answers |
| C · Explained | No in-flight measurement exists | blood glucose, bone density, radiation dose | explained, never an input |

Tier C is not filler. The challenge asks when a result needs attention and what
prevents a critical condition, and for these three the answer is "this cannot be
self-measured in flight, here is why, here is what NASA does instead". That
answers a question instead of faking a number.

### Identifiers proposed for FORMATS.md section 2

| id | Name | Unit | Direction | Tier |
| --- | --- | --- | --- | --- |
| `hr_bpm` | Heart rate | bpm | both | A |
| `bp_sys_mmhg` | Systolic blood pressure | mmHg | both | A |
| `bp_dia_mmhg` | Diastolic blood pressure | mmHg | both | A |
| `rr_bpm` | Breathing rate | breaths/min | both | A |
| `spo2_pct` | Blood oxygen saturation | % | higher is better | A |
| `temp_core_c` | Core temperature | °C | both | A |
| `temp_skin_c` | Skin temperature | °C | both | A |
| `sleep_h` | Sleep duration | h | higher is better to a point | A |
| `sleep_quality_1_5` | Sleep quality | 1 to 5 | higher is better | B |
| `mood_1_5` | Mood | 1 to 5 | higher is better | B |
| `fatigue_1_5` | Fatigue | 1 to 5 | lower is better | B |
| `glucose_mgdl` | Blood glucose | mg/dL | both | C |
| `bmd_pct` | Bone mineral density | % of pre-mission | higher is better | C |
| `dose_msv` | Radiation dose | mSv | lower is better | C |

## 3. Three comparison bases, never mixed

| Basis | What it means | Where the number comes from | How the app shows it |
| --- | --- | --- | --- |
| `baseline` | This person's own recent values | The measurement history in the app (REQ-27) | "in your usual range" |
| `clinical` | A published limit from a named body | The source is shown with the value | "needs review by the CMO" |
| `assumption` | No source exists | Marked as Assumption | "reference value pending" |

NASA-STD-3001 sets the principle for `baseline`: its limits compare in-mission
values with each crew member's pre-mission ones. The app applies the same idea to
vitals.

WHO gives the one `clinical` boundary I would use for blood pressure: 140/90 mmHg
or higher measured on two different days, and 180/120 mmHg or higher with symptoms
means care at once. Both are Earth adult criteria, diagnosis belongs to a
professional, and the app says so next to the number.

## 4. Four states, and the words for them

| State | When | What the astronaut reads |
| --- | --- | --- |
| No data | Fewer readings than the baseline needs | "Record 3 more mornings to set your range" |
| In your usual range | Inside the person's own spread | "In your usual range" |
| Outside your usual range | Outside the spread, no clinical boundary crossed | "Outside your usual range. Record it again tomorrow" |
| Needs review | A cited clinical boundary is crossed, or a symptom is logged with it | "Show this to the CMO" |

Never "normal", "abnormal", "high risk", or a percentage. The flight surgeon and the
CMO stay the only ones who interpret.

## 5. The 3D body is navigation, not measurement

The team's base idea includes a body view. It works if it maps to **systems**, and
each system holds its indicators:

| Body area | System | Indicators it opens |
| --- | --- | --- |
| Heart and vessels | Cardiovascular | `hr_bpm`, `bp_sys_mmhg`, `bp_dia_mmhg` |
| Lungs | Respiratory and oxygenation | `rr_bpm`, `spo2_pct` |
| Whole body, skin | Thermoregulation | `temp_core_c`, `temp_skin_c` |
| Head, eyes | Sleep, circadian and ocular | `sleep_h`, `sleep_quality_1_5` |
| Head, brain | Neuro-behavioural | `mood_1_5`, `fatigue_1_5` |
| Skeleton, muscles | Musculoskeletal (explained) | `bmd_pct` |
| Whole body | Radiation (explained) | `dose_msv` |

This also answers question 3 of the challenge ("how do spaceflight hazards affect
it") once per system instead of once per value, which is less writing for Bio 1 and
less clicking for the judge.

## 6. Files Phys proposes (for FORMATS.md, section 1)

| File in `config/data/` | Columns | Owner | Checked by |
| --- | --- | --- | --- |
| `reference-bands.csv` | `id, low, high, unit, basis, source, note` | Phys | Bio 2 |
| `baseline.csv` | `id, median, spread, days_used, source` | Phys | Eng 1 |
| `demo-astronaut.csv` | `day, id, value, context, instrument, synthetic` | Phys | Bio 2 |

`context` is `rest`, `after exercise`, `on waking`, `before sleep`. Without it a
value cannot be compared: core temperature after exercise is not the same reading as
on waking.

## 7. What to cut, in order

1. Glucose as a measured value. Keep it only if the demo needs six cards; then it is
   manual, `assumption`, and explained as not measured in flight.
2. The body view's muscles and ligaments. Bones and organs earn their place; muscles
   do not, and they cost days of work.
3. Breathing rate, if the block runs short. It is real but it is the least used.

## 8. Open decisions for the team (not mine to take)

1. Which Tier C indicators stay in the interface.
2. Baseline definition: first 7 days, rolling 14 days, or pre-mission exam values.
3. Who writes the "needs review" wording: Bio 2, with the CMO caveat.
4. Whether the body view shows systems only, or organs with individual states.

## Sources

- NASA-STD-3001 Vol 1 Rev C: https://www.nasa.gov/wp-content/uploads/2023/11/nasa-std-3001-vol-1-rev-c-with-signature.pdf
- HRP risks: https://www.nasa.gov/hrp/risks/
- Wearable tech for space station research: https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/
- Bio-Monitor (CSA): https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
- WHO, Hypertension: https://www.who.int/news-room/fact-sheets/detail/hypertension
- Measurement notes: `team/phys/notes/measurement-in-flight.md`
