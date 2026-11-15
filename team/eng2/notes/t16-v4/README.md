# T-16 · video draft v4 (for Wambi to refine)

Sun 15 Nov, Eng 2. Card #52, REQ-31. A draft, not the final video: the team has
not approved the changes listed under "Needs a decision".

| File | What |
| --- | --- |
| `HeMoSo-demo-draft-v4.mp4` | The draft: 30.00 s, 1920 × 1080, H.264 and AAC |
| `t16_v4_build.py` | Rebuilds it from a local build of `main` in one run |
| `subs.srt` | The 11 subtitle cues that match the narration of this draft |

## What is on screen

Only the app itself, in its dark theme. No text cards and no zooms.

| Time (s) | Screen | Voice |
| --- | --- | --- |
| 0–6.7 | The app's intro animation: the logo draws, HEMOSO is typed, it fades into "Who is on duty today?" | "We're team ReTardis." · "Astronaut health monitoring, because Earth is far away." · "Meet HeMoSo: twelve daily readings, |
| 6.7–10 | The report and its rows, each with its earlier readings | each checked against your own usual range." |
| 10–12.5 | Core temperature with 38.5 typed | "She logs a fever and a fast pulse. |
| 12.5–15 | Status, orbit view with the 3D body | HeMoSo compares them with her usual range, |
| 15–17 | Evidence board: Fever, evidence 0.75 of 1 | scores the evidence, |
| 17–20 | The temperature card with "Tell the CMO" | and says: tell the CMO. Built from NASA's open data." |
| 20–23 | Status, list view | "From lunar missions to Mars: the same daily check, |
| 23–26 | Details: measurement steps, limits and sources | with every limit and its source on screen." |
| 26–30 | The logo animation again, with `hemoso.space` | "Because exploring further means taking better care of those who explore." |

The intro animation is the one of `Portada.mov` (a phone recording of the app),
recorded again from the app at 1920 × 1080 so it fills a landscape frame.

## How to rebuild

```bash
pnpm --dir frontend build
pnpm --dir frontend preview --port 4399
pip install playwright edge-tts && playwright install chromium
python team/eng2/notes/t16-v4/t16_v4_build.py http://localhost:4399 t16-v4-work
```

It needs `ffmpeg` and `ffprobe` (tested with 9.0.2) and prints the length at the
end. Record from a local build, never from https://www.hemoso.space: saving the
staged fever there writes it into the demo history everyone sees.

To change something: the narration is `BEATS`, the shot order and lengths are
`SHOTS`, the subtitle and label styles are in `assemble`, and the cues are
`subs.srt`. Each spoken line is fitted to its beat, so a longer line is spoken
faster (up to 30 %) before it is stretched.

## Needs a decision

| What | Who |
| --- | --- |
| The voice is synthetic (text-to-speech). The guide allows it when it is disclosed: the video carries the label "Voice: synthetic (text-to-speech)" for its whole length and the same note in its metadata; the page's SI answer, `SI-USE.md` and the description of the published video must say it too | Bio 2, Wambi |
| No faces: the team name is spoken and subtitled over the logo, where `submission/video.md` plans five faces at 0–2 s and 26–30 s | Bio 1, the team |
| Three lines of the narration are new and more descriptive than `submission/video.md` (5–10 s, 10–20 s, 20–26 s); `subs.srt` here replaces Bio 1's cues if they are accepted | Bio 1 |
| Bio 1's PNG cards (`submission/slides/cards/` on `bio1`) and `team/eng1/notes/t16_edit.py` are not used in this draft | Wambi, Bio 1 |

## Seen in the app while recording

- The status summary says "4 outside usual range": with the on-threshold rule
  (Q4) the demo astronaut's reaction lapses (3, row "above 3") and appetite
  (3, row "below 3") sit exactly on their `watch` rows. Bio 2 or Phys.
- "Hypoglycaemia: Possible 0.33" shows next to Fever, from the `sweating` report
  of day 29 in `symptom_log.csv`. Correct by the rule, but it shares the frame
  with the fever story.
- The temperature card says "compared with your last 14 readings"; the rule is
  now 14 mission days. The narration says "usual range" to avoid the number.
- The "Skip intro" button of the app is visible during the animation.
