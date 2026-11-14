# How each value is measured in flight

Sat 14 Nov, 11:50. Working note for the Phys role. Every row was read on the
linked page today; nothing here comes from memory. This feeds the "can it be
measured in space, and how" question of the challenge and the limits Bio 2 needs
before writing thresholds.

## 1. Instruments and what they record

| Value | Instrument or study | What the instrument records | Unit | Precision reported | Source |
| --- | --- | --- | --- | --- | --- |
| Heart rate and rhythm | Bio-Monitor (CSA smart shirt) | Pulse and electrical activity of the heart | bpm | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Blood pressure | Bio-Monitor | Blood pressure | mmHg | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Breathing | Bio-Monitor | Breathing rate and volume | Breaths/min, L | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Blood oxygen saturation | Bio-Monitor | Blood oxygen saturation | % | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Skin temperature | Bio-Monitor | Skin temperature | °C | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Physical activity | Bio-Monitor | Activity level | Not stated | Not stated | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |
| Core temperature | T-Mini (ESA Thermo-Mini), headband | Core body temperature, worn for hours | °C | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Sleep length and quality | Actiwatch Spectrum, wrist | Motion (accelerometer) and ambient light (photodetectors) | h, min | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Heart rate and breathing during sleep | Wearable Monitoring vest | Heart rate and breathing patterns without waking the crew member | Not stated | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Carbon dioxide near the crew | Personal CO2 Monitor, worn on clothing | CO2 in the wearer's immediate surroundings | Not stated | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Radiation dose on a spacewalk | EVARM (CSA), wireless dosimeters in a pocket | Dose during EVA | Not stated | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Radiation over a mission | ESA Active Dosimeter, worn | Exposure over time, by orbit, altitude, solar cycle and flares | Not stated | Not stated | https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/ |
| Vital signs plus imaging, remote support | Tempus Pro telemedicine device | Collects and integrates vital data and medical imaging; tested on Polaris Dawn | Not stated | Not stated | https://www.nasa.gov/reference/tempus-pro/ |

## 2. The Bio-Monitor is the closest thing to what the app asks for

The CSA page states the devices the crew used before it: electrocardiographs, blood
pressure cuffs, fingertip oxygen saturation monitors and ankle-bracelet activity
sensors. It calls them bulky and invasive, disruptive and time-consuming, and says
the Bio-Monitor replaces them with a shirt, a headband and a tablet application.
It can be worn during sleep and exercise, and the battery pack is docked to send
data to the ground.

For the challenge this settles the "how" for four of its example indicators:
heart rate, blood pressure, temperature and oxygen saturation are all measured by
one wearable system that already flies on the ISS.

Source: https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp

## 3. What no page gives, and what that costs us

None of the pages read today states an accuracy, a precision, a sampling rate or a
calibration procedure. They describe what is recorded, not how well. Consequences:

- The app cannot claim device-grade accuracy. Test data is synthetic and labelled
  as such.
- A reading belongs to an instrument and a context. Skin temperature from the
  shirt is not core temperature from the headband; they cannot share one threshold.
- Exercise changes the reading. The Thermolab study reports that core temperature
  rises higher and faster during exercise in space than on Earth, and stays
  elevated at rest, a difference from the ground case that a static threshold
  would misread.
- Sleep is inferred from motion and light, not from brain activity. "Sleep hours"
  in the app means actigraphy plus the crew member's own report.

## 4. Indicators the sources do not support

| Indicator | Status | Why |
| --- | --- | --- |
| Blood glucose | No in-flight measurement found in any challenge resource | The nutrition evidence report says requirements in flight are "thought to be similar" to Earth, with few and conflicting studies. Either drop it or mark the value Assumption. |
| Bone density | Cannot be an in-flight input | OCHMO-TB-030: "No system to date measures bone density in-flight". Pre and post flight only. |
| Radiation dose to the crew | Not self-measured | Dosimetry is run by the radiation team; the crew carries passive dosimeters. The app can explain the risk, not read the dose. |

## 5. Sources

- Bio-Monitor: https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp
- Wearable tech for space station research (T-Mini, Actiwatch, vest, CO2, dosimeters): https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/
- Tempus Pro: https://www.nasa.gov/reference/tempus-pro/
- Thermolab result, via the wearable article (Nature, 2017): https://www.nature.com/articles/s41598-017-15560-w
- Nutrition evidence report, blood glucose: https://humanresearchroadmap.nasa.gov/Evidence/other/Nutrition%20ER_human_adaptation_2020_final.pdf
- OCHMO-TB-030, bone loss: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-030-bone-loss.pdf

## 6. Open

- Precision and sampling rate for Bio-Monitor and T-Mini: manufacturer documentation
  (Carré Technologies, Hexoskin) or a peer-reviewed validation study. Until then,
  the app shows values without a stated accuracy.
- A source for blood glucose measurement in flight, or a decision to drop it.
