# PVT research: which lapse threshold belongs to the 3-minute test

**Claim:** the 3-minute in-flight test is a PVT-B run with 2-5 s inter-stimulus intervals, and 355 ms is the lapse threshold stated for that implementation, while 500 ms belongs to the 5-minute and 10-minute PVT.

## Sources

| Source | Exact quote | Type | Link | Opened |
| --- | --- | --- | --- | --- |
| Dinges, Mollicone, Ecker. Psychomotor Vigilance Self Test on ISS, JSC-CN-18714, 2009 | "The Reaction Self Test uses repeated reaction times to a light stimulus ... during a 3-minute performance period"; "Wake state instability as measured by lapses (errors of omission)" | NASA | https://ntrs.nasa.gov/citations/20090029851 | 2026-11-14 |
| Arsintescu. PVT Evaluation for Touchscreen Devices, ARC-E-DAA-TN40373, 2017 | "ISI interval 2-10 sec, randomly (rectangular distribution)"; "Lapses - the cumulative number of RTs exceeding 500 ms." | NASA | https://ntrs.nasa.gov/citations/20170009855 | 2026-11-14 |
| Basner, Mollicone, Dinges. Acta Astronautica 69(11-12):949-959, 2011 | "The inter-stimulus intervals varied randomly from 1–4 s (including a 1 s RT feedback interval)."; "the number of lapses based on a lapse definition of ≥ 355 ms" | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC3197786/ | 2026-11-14 |
| Tu, Basner, Dinges et al. Scientific Reports 12:11032, 2022 (NASA NNX08AY09G) | "The RST consists of a short survey ... followed by a computerized and brief (3-min) version of the Psychomotor Vigilance Test (PVT-B)."; "the next stimulus was presented after a random inter-stimulus interval of 2-5 s" | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC9246897/ | 2026-11-14 |
| Dev, Khader, Begerowski, Anderson, Clément, Bell. Frontiers in Physiology 15:1451269, 2024 (NASA BHP Laboratory, JSC) | "The current implementation utilized a validated 3-min version with 2–5 s interstimulus intervals and a 355-m lapse threshold." (printed as "355-m", meaning 355 ms) | Peer-reviewed | https://pmc.ncbi.nlm.nih.gov/articles/PMC11614644/ | 2026-11-14 |

## Reading of the sources

The 2009 and 2017 NASA presentations describe two different instruments. JSC-CN-18714 is the ISS Reaction Self Test: 3 minutes of testing, a light stimulus, lapses defined only as errors of omission, no inter-stimulus interval and no threshold given. ARC-E-DAA-TN40373 is a touchscreen NASA-PVT validated against the PVT-192 with 5-minute tests, 2-10 s intervals and a 500 ms lapse.

The peer-reviewed record joins the ISS test to the PVT-B. Tu et al. call the Reaction Self Test a 3-minute PVT-B and give its in-flight interval as 2-5 s. Dev et al., from the NASA laboratory that runs the ISS Cognition Battery, state 355 ms for that same 3-minute, 2-5 s implementation.

So 500 ms is not wrong on its own: it is the standard PVT lapse (Basner et al.: "Lapses (errors of omission) were defined as RTs ≥ 500 ms"). It belongs to the 10-minute PVT and the 5-minute touchscreen device, not to the 3-minute test our indicator describes.

## What the sources do not settle

- No NTRS record retrieved states 355 ms. Queries for `"355 ms"` and `"PVT-B"` in the NTRS search API returned 0 results; 355 ms appears only in journal papers.
- The PVT-B was validated with 1-4 s intervals; the ISS implementation uses 2-5 s. No source explains the change or re-validates 355 ms at 2-5 s.
- The lapse threshold in use during Expeditions 21 and 22 is not published. 355 ms is documented for the later, current implementation.
- Our own stimulus timing in the app is not yet defined, so no source can say whether our test reproduces either instrument.
- `min_spread = 20` ms for `reaction_median_ms` has no source: Assumption.

## Recommendation

Change `reaction_lapses` to 355 ms and keep the 3-minute duration, citing Dev et al. 2024 and Basner et al. 2011.

Trade-off: 355 ms matches the instrument our indicator names and is the threshold NASA's own laboratory publishes for it, but it is documented only in journal papers and was validated at 1-4 s intervals, so it is slightly less directly evidenced than 500 ms. Keeping 500 ms would preserve the classic PVT definition at the cost of describing a 3-minute test with the threshold of a 5-minute one.

If 500 ms is kept, the row must stop calling the test the "NASA Reaction Self Test" and say 5-minute NASA-PVT instead.
