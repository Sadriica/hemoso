# F-phys-07 · The eye check counts closed-eye time and blinks over 60 s, and nothing else

**Status:** Draft
**Owner:** phys
**Date:** Sun 15, 10:00
**Reviewed by:** _pending_

## Claim

The eye check runs for 60 s on the device camera and reports two numbers only:
`eye_closure_pct`, the share of the check with the eyes closed (a PERCLOS-like
measure, higher is worse), and `blink_rate_pm`, blinks per minute (either side can
matter). It measures eyelid position. It does not measure mood, stress, emotion or
mental state, and it is not a diagnosis.

## What the app runs

| Choice | Value | Basis |
| --- | --- | --- |
| Length | 60 s | Assumption (team choice, short for a daily self-check). See the limit below: the source found one minute predicts worse than 20 minutes |
| Eye signal | Eye aspect ratio (EAR) from six landmarks per eye, both eyes averaged | Soukupová and Čech 2016 |
| "Closed" | EAR below 0.2 | The paper's baseline threshold (t = 0.2). Not validated as a closure level for this app: Assumption |
| Blink | EAR below 0.2 for at least 3 frames in a row (about 100 ms at 30 fps), then back above, lasting no more than 400 ms | Blink length 100 to 400 ms from the paper; the 3-frame minimum is Assumption |
| Long closure | EAR below 0.2 for more than 400 ms: counted in `eye_closure_pct`, not counted as a blink | The paper says a low EAR also occurs when "a subject closes his/her eyes intentionally for a longer time"; the 400 ms cut is Assumption |
| `eye_closure_pct` | frames with EAR below 0.2, divided by frames with a face found, times 100 | PERCLOS definition, with EAR 0.2 in place of "80 percent closed" (Assumption) |
| `blink_rate_pm` | blinks counted, scaled to 60 s of frames with a face found | Assumption |
| Frames without a face | Not counted; fewer than 30 s of usable frames means no value is stored | Assumption |

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Dinges and Grace, FHWA Tech Brief MCRT-98-006, "PERCLOS: A Valid Psychophysiological Measure of Alertness As Assessed by Psychomotor Vigilance" | "PERCLOS is the percentage of eyelid closure over the pupil over time and reflects slow eyelid closures ("droops") rather than blinks." | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Same | "the measure referred to as "PERCLOS" was found to be the most reliable and valid determination of a driver's alertness level" | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Same | "only PERCLOS correlated highly with PVT lapses both within and between subjects" (14 men kept awake 42 hours, 10 scorable on video) | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Same | "A PERCLOS drowsiness metric was established in a 1994 driving simulator study as the proportion of time in a minute that the eyes are at least 80 percent closed." | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Same | "all technologies had a better prediction of PVT lapses when sampling a longer (20-minute) rather than briefer (1-minute) period" | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Same | Eye blink monitors were weaker and uneven: bout-to-bout correlations with PVT lapses ranged from -0.48 to 0.90 across subjects (Table 1), against 0.55 to 0.97 for PERCLOS | Federal report | https://rosap.ntl.bts.gov/view/dot/113 |
| Soukupová and Čech, CVWW 2016, "Real-Time Eye Blink Detection using Facial Landmarks" | "The eye blink is a fast closing and reopening of a human eye." and "The eye blink lasts approximately 100-400 ms." | Peer-reviewed (workshop) | http://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Same | EAR = (‖p2 − p6‖ + ‖p3 − p5‖) / (2‖p1 − p4‖), "where p1, ..., p6 are the 2D landmark locations"; "The EAR is mostly constant when an eye is open and is getting close to zero while closing an eye." | Peer-reviewed (workshop) | http://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Same | Figure 2 and Figure 7 plot "EAR thresholding (t = 0.2)" as the simple baseline | Peer-reviewed (workshop) | http://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Same | "It generally does not hold that low value of the EAR means that a person is blinking. A low value of the EAR may occur when a subject closes his/her eyes intentionally for a longer time or performs a facial expression, yawning, etc." | Peer-reviewed (workshop) | http://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Same | "The thresholding fails when a subject smiles (has narrowed eyes), has a side view or when the subject closes his/her eyes for a time longer than a blink duration." The 30 fps test videos are 320 × 240 px. | Peer-reviewed (workshop) | http://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf |
| Hazard: Isolation and Confinement (NASA HRP) | "Sleep loss, circadian desynchronization, and work overload compound this issue" | NASA | https://www.nasa.gov/hrp/hazard-isolation-and-confinement/ |

## Decisions and what the sources settle

- **PERCLOS against the PVT.** The FHWA study validated PERCLOS on video scored by
  trained people, against PVT lapses, under 42 hours of sleep loss. That supports
  `eye_closure_pct` going up when alertness drops, so direction is `higher`.
- **EAR 0.2 is not the 80 % closure of PERCLOS.** The paper gives 0.2 only as a
  baseline for detecting blinks. Nobody has shown that EAR 0.2 equals "80 percent
  closed". The app's number is a PERCLOS-like measure and is compared only with the
  person's own earlier checks.
- **Landmarks.** The paper uses six landmarks per eye, taken from the face-landmark
  detectors Chehra and Intraface. It does not say 68. A 68-point face model (as in
  common open-source detectors) holds six points per eye, so the same EAR applies,
  but that mapping is not in the paper and no source here states it: the detector
  choice stays with Eng 1 and the indicator row says "six landmarks per eye".
- **Blink rate direction is `both`.** The Tech Brief reports eye blink monitors as
  inconsistent against PVT lapses, and the paper makes no claim about blink rate
  and sleepiness. No source here says whether a higher or a lower rate is worse, so
  either side counts and the person's own baseline decides.
- **Hazards.** Only `isolation_and_confinement`, through sleep loss in the HRP page.
  No source opened here ties this measure to radiation, gravity fields,
  distance from Earth or closed environments.
- **Tier B, system `neuro_behavioural`.** The crew member runs it on a personal device.
  No instrument that flies is involved, and the result depends on how the person sits.
- **`min_spread`.** `eye_closure_pct` 1 % and `blink_rate_pm` 3 per min: engineering
  defaults, Assumption, to keep a flat history from flagging small changes.

## Confidence

Medium for "eye closure over time follows PVT lapses" (one federal report from one
laboratory, 10 scorable subjects, trained human scoring, not a camera algorithm).
Low for every number the app uses: 60 s, EAR 0.2 as closed, 3 frames, 400 ms, and
both `min_spread` values are Assumptions.

## What it changes in the solution

- `config/data/indicators.csv`: new rows `eye_closure_pct` (`%`, `higher`) and
  `blink_rate_pm` (`per min`, `both`), tier B, system `neuro_behavioural`.
- `config/data/demo_ranges.csv` and `demo_data.csv`: synthetic ranges and 10 entries
  per indicator.
- Still to do by others: rows in `FORMATS.md` section 2 (Eng 1), rows in
  `config/rules/attention.csv` and signals in `config/rules/conditions.csv`
  (`current_state`) (Bio 2), and `config/content/eye_closure_pct.md` and
  `config/content/blink_rate_pm.md` (Bio 1).

## Limits and open questions

- The study scored video by hand. No source tested a phone or laptop camera, an EAR
  threshold or this app against the PVT. Until that is done, the check is a trend
  signal against the person's own baseline and nothing more.
- The same report found a one-minute sample predicts PVT lapses worse than a
  20-minute one. A 60 s check is therefore noisy. A single check is not a signal.
- The paper's EAR threshold fails with narrowed eyes (smiling), a side view and
  closures longer than a blink. Low light, glasses, screen glare, camera angle and
  distance, and head movement can all change EAR with no change in alertness.
  Phone and laptop angles differ from the 30 fps, 320 × 240 px test videos.
- It reads the eyelids only. It says nothing about mood, stress, emotion or mental
  state, and it never names a condition. Any result feeds the current-state evidence
  score, and the CMO or flight surgeon confirms.
- Reaction-test results (`reaction_median_ms`, `reaction_lapses`) are the direct
  PVT-based measures in the app; this check is a camera estimate beside them.
- The face and eye analysis runs on the device with no external AI services (team
  decision T-06, `docs/DECISIONS.md`). That frames are neither stored nor sent is our
  design intent (Assumption), not something a source shows.
