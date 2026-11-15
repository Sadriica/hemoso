# F-phys-07 · Eye closure check: an EAR measure, not PERCLOS

**Status:** Draft
**Owner:** phys
**Date:** Sun 15 Nov, 11:50
**Reviewed by:** _pending_

## Claim

The camera check measures how long the eyes stay closed using the eye aspect ratio
with a threshold of 0.2, and counts a blink when that closure lasts between 100 and
400 ms. It is **not** PERCLOS, because PERCLOS needs the degree of eyelid closure and
facial landmarks only give a ratio.

## Why not PERCLOS

PERCLOS is the proportion of time the eyelids are at least 80 % closed (Dinges and
Grace, FHWA, 1998). It needs the eyelid aperture measured against the fully open eye.
Facial landmarks give the eye aspect ratio: the distance between the upper and lower
eyelid divided by the eye width. That ratio falls when the eye closes, but it does not
report "80 % closed". Naming our number PERCLOS would be a claim we cannot support.

## The decisions

| Decision | Value | Why |
| --- | --- | --- |
| Duration of one check | **60 s** | Long enough to count 10 to 20 blinks and to see a long closure; short enough for a daily routine |
| Eyes closed | **EAR below 0.2** in that frame | The threshold the EAR paper plots against its classifier (t = 0.2); a per-person calibration is better and is not implemented |
| Blink | A continuous closure **from 100 to 400 ms** | "The eye blink lasts approximately 100-400 ms" (Soukopova and Cech, 2016) |
| Longer closure | **Not a blink.** Counts in the percentage, not in the rate | A closure over 400 ms is a different event from a blink |
| Blinks per minute | Count of blinks in the 60 s, reported as a rate | The check is one minute, so the count is the rate |
| Closed-eye percentage | Frames with EAR below 0.2 divided by all frames, times 100 | The measure we can defend; it is not PERCLOS |

## The two indicators

| id | Name | Unit | Direction | min_spread | Tier | System |
| --- | --- | --- | --- | --- | --- | --- |
| `eye_closure_pct` | Eye closure | % | `higher` | 5 | A | `neuro_behavioural` |
| `blink_rate_pm` | Blink rate | blinks/min | `both` | 3 | A | `neuro_behavioural` |

- `measured_on_board` for both: "Tablet camera, facial landmarks, eye aspect ratio below 0.2 for one minute".
- `min_spread` values are engineering defaults, **Assumption**: they are the noise floor
  of a camera measure, not clinical values.
- `blink_rate_pm` is `both` because a rate far below the person's usual suggests staring
  and fatigue, and a rate far above suggests dryness or irritation. Both sides are
  outside the person's own range, which is the comparison the app already makes.
- Hazard: `isolation_and_confinement` (sleep loss and circadian disruption drive both
  measures).

## What it cannot claim

- **It is not PERCLOS.** See above.
- **It is not a SANS test.** Spaceflight-associated neuro-ocular syndrome is assessed by
  imaging the back of the eye; a front camera cannot see the retina
  (https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105).
- **It does not diagnose drowsiness.** It reports two numbers; the CMO or flight surgeon
  interprets them.
- **It is not validated in spaceflight.** The EAR method was validated on video of
  people blinking, not on crew members in microgravity with head motion.
- **It depends on the face being visible:** lighting, glasses, eye shape, head pose and
  camera distance all move the EAR. A check with the face partly out of frame is
  "no data", not a zero.

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Soukopova and Cech, Real-Time Eye Blink Detection using Facial Landmarks, CVWW 2016 | "The eye aspect ratio EAR in Eq. (1)"; "EAR thresholding (t = 0.2)"; "The eye blink lasts approximately 100-400 ms" | Peer-reviewed | https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Dinges and Grace, PERCLOS, FHWA, 1998 | The origin of PERCLOS as the proportion of time the eyelids are 80 % or more closed. Read by title only: the report was not opened for this finding, and the app does not implement it | Reference | report number FHWA-MC-97-006 |
| NASA, Spaceflight Associated Neuro-ocular Syndrome risk | SANS is a risk to the eyes and brain in flight | NASA | https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105 |

## Confidence

Medium. The threshold and the blink window come straight from the method paper. What
is missing is validation on the device we ship and in the environment we ship it in.

## What it changes in the solution

- `config/data/indicators.csv`: two rows, as specified above.
- `config/data/demo_ranges.csv` and `demo_data.csv`: synthetic values, one check per
  mission day, context `rest`.
- The screen must say "Not PERCLOS" nowhere and "eye closure" everywhere, and it must
  never say "drowsy", "asleep" or "fatigued".

## Limits and open questions

- Per-person calibration of the EAR threshold is not implemented. A fixed 0.2 works for
  most faces and fails for some.
- Frame rate matters: at 10 frames per second a 100 ms blink spans one frame. Below
  15 fps the blink count is unreliable.
- Whether 60 s is the right length for a daily check is a product decision, not a
  scientific one.
