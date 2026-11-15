# F-phys-06 · The reaction test is a 3-minute PVT-B, and its lapse threshold is 355 ms

**Status:** Draft
**Owner:** phys
**Date:** Sat 14, 23:45
**Reviewed by:** _pending_

## Claim

The reaction test in the app reproduces the 3-minute PVT-B used on the ISS: stimuli
appear at random intervals of 2 to 5 s, and a response slower than 355 ms counts as a
lapse. The 500 ms figure belongs to the 5-minute and 10-minute PVT, which are different
instruments.

## The two instruments, side by side

| | 3-minute PVT-B (what the app uses) | 5-minute NASA-PVT / PVT-192 |
| --- | --- | --- |
| Duration | 3 minutes | 5 minutes, and 10 minutes for the classic PVT |
| Inter-stimulus interval | 2 to 5 s in flight; 1 to 4 s in validation | 2 to 10 s, random |
| Lapse threshold | **355 ms** | **500 ms** |
| Source | Dev et al. 2024; Tu et al. 2022 | Arsintescu 2017 (NASA) |

## Evidence

| Source | What it says (short quote) | Type | Link |
| --- | --- | --- | --- |
| Dev et al., Frontiers in Physiology 15:1451269, 2024 (NASA BHP Laboratory) | "The current implementation utilized a validated 3-min version with 2-5 s interstimulus intervals and a 355-m lapse threshold" | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC11614644/ |
| Tu et al., Scientific Reports 12:11032, 2022 | The Reaction Self Test "consists of a short survey … followed by a computerized and brief (3-min) version of the Psychomotor Vigilance Test (PVT-B)"; "the next stimulus was presented after a random inter-stimulus interval of 2-5 s" | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC9246897/ |
| Basner, Mollicone, Dinges, Acta Astronautica 69(11-12), 2011 | "The inter-stimulus intervals varied randomly from 1-4 s"; "the number of lapses based on a lapse definition of 355 ms or more" | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/ |
| Dinges, Mollicone, Ecker, JSC-CN-18714, 2009 | The Reaction Self Test measures "wake state instability as measured by lapses (errors of omission)" during a "3-minute performance period" | NASA | https://ntrs.nasa.gov/citations/20090029851 |
| Arsintescu, ARC-E-DAA-TN40373, 2017 | "ISI interval 2-10 sec, randomly"; "Lapses - the cumulative number of RTs exceeding 500 ms" | NASA | https://ntrs.nasa.gov/citations/20170009855 |

## Why 500 ms looked right and is not

The NASA presentation that gives 500 ms is a validation of a touchscreen PVT against the
PVT-192, using 5-minute tests. Its 500 ms is the classic PVT lapse. Our indicator names
a 3-minute test, and the laboratory that runs that test publishes 355 ms for it. Mixing
the duration of one instrument with the threshold of another would make the indicator
lie about what it measures.

## How the baseline rule applies

Reaction time is noisier than a vital sign. Two consequences for `phys-02`:

- `min_spread` of 20 ms is an engineering default with no source. It stops a 5 ms
  difference from being called a change when the test-to-test variation is larger.
- A single lapse is not a signal. The lapse count only makes sense against the person's
  own window, which is why `reaction_lapses` uses the same baseline rule as the vitals.
- The first test after waking or after a long break is slower. That is another reason
  `context` exists in the entry.

## Confidence

High for the duration and the inter-stimulus interval: two peer-reviewed papers and a
NASA presentation agree, and the 2009 NASA document states the 3 minutes directly.
Medium for the 355 ms threshold: it is published by NASA's own laboratory and by the
PVT-B validation paper, but no NTRS record states it, and the validation used 1 to 4 s
intervals while the flight implementation uses 2 to 5 s.

## What it changes in the solution

- `config/data/indicators.csv`: `reaction_median_ms` and `reaction_lapses` describe the
  3-minute PVT-B, with 2 to 5 s and 355 ms.
- `config/content/reaction_*.md` (Bio 1): the instructions must match, or the crew takes
  a different test from the one the threshold was built for.
- `config/rules/attention.csv` (Bio 2): any row for these indicators inherits the
  355 ms definition.

## Limits and open questions

- No source explains why the flight version uses 2 to 5 s instead of the validated 1 to
  4 s, or whether 355 ms was re-validated at 2 to 5 s.
- The threshold in use on Expeditions 21 and 22 is not published; 355 ms documents the
  current implementation.
- Screen latency of the device the app runs on is not characterised. If the tablet adds
  20 ms, every reaction time is 20 ms longer.
- `min_spread = 20` ms and `min_spread = 1` lapse are Assumptions, not clinical values.
