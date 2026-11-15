# Video · 30 seconds, English subtitles

Owner: Bio 1. Recorded by Eng 2 (REQ-31, card #52). Script v6, Sun 15 Nov 08:45.

This version is written against the app on `main` (3dd596b), after Eng 2's
recording plan (`team/eng2/notes/t16-recording-plan.md`, Sun 06:55). The plan is
accepted with the changes below. The story the guide asks for does not change:
who we are, the challenge, the name, the prototype, the future.

Submission guide, video demo instructions
(https://www.spaceappschallenge.org/resources/project-submission-guide/), as
quoted by the team on Sat 14 Nov; the 30 s limit and the English subtitles are
also in `docs/CHALLENGE.md`.

## What changed from v5, and why

1. **The screens are the real ones.** The app has three phases (identify,
   report, status), four states and an evidence board. It has no yellow, orange
   or green levels, so the script no longer talks about them.
2. **Day 46 is out.** The demo data ends on Flight Day 30, and a return to the
   usual range cannot be shown without inventing days. The evidence board takes
   that time, and the future beat carries the outlook instead.
3. **"Symptoms" is out.** The report screen has no symptom field yet (T-80), so
   the voice does not promise it.
4. **One staged reading replaces three days.** Eng 2 logs Flight Day 31 with
   38.5 °C and 96 bpm on a local build. That single reading produces every state
   the video needs: needs review, outside the usual range, and an evidence board.
5. **"Baseline" becomes "usual range"** in the spoken line and the subtitles,
   because that is the phrase on screen. The wording decision of Sat 17:45 used
   "baseline"; the video follows the interface, and the difference is noted in
   "Still open".

## How the team speaks

| Time | Who | Job |
| --- | --- | --- |
| 0:00–0:02 | All five, together | Team name |
| 0:02–0:05 | V1, Bio 1 | The challenge and the problem |
| 0:05–0:10 | V2, Phys | Project name and tagline |
| 0:10–0:20 | V1, Bio 1 | One reading, over the prototype |
| 0:20–0:26 | V2, Phys | The future |
| 0:26–0:30 | V2 alone, the team on camera | The closing line |

Tone: calm and factual. No rising music, no slow motion, no "imagine". Let the
pauses at 0:05 and 0:26 do the work.

## Script

| Time (s) | Speaker | Line | Direction |
| --- | --- | --- | --- |
| 0.0–2.0 | Team | We're team ReTardis. | One voice, five faces, no gesture |
| 2.0–5.0 | V1 | Astronaut health monitoring, because Earth is far away. | One sentence, a small pause at the comma |
| 5.0–10.0 | V2 | Meet HeMoSo: your health, checked against your usual range. | A short stop after the name |
| 10.0–20.0 | V1 | She logs 38.5 °C and a fast pulse. HeMoSo compares them with her usual range, shows the evidence, and asks her to tell the CMO. Built from NASA's open data. | Even pace; "tell the CMO" one step louder |
| 20.0–26.0 | V2 | From lunar missions to Mars: the same daily check, so a change is seen in time. | Same volume, no dreamy tone |
| 26.0–30.0 | V2 | Because exploring further means taking better care of those who explore. | Slower than the rest, one idea per breath |

77 words, 2.6 per second. If a take runs past 29.5 s, cut "Built from NASA's open
data" from the voice and keep it in the caption; never shorten the closing.

Line notes:

- "Astronaut health monitoring" names the challenge; without it a judge scores
  Relevance from memory, not from the video.
- "Because Earth is far away" keeps the beat to one sentence. Two sentences read
  like a list. The Canadian Space Agency page on long missions supports the point
  (less reliance on Earth for emergency medical help).
- Beat 4 answers the guide's three questions in order: a user's experience ("she
  logs"), how it works ("compares, shows the evidence, asks her to tell the CMO")
  and the data ("built from NASA's open data").
- "Shows the evidence" is the honest verb for an evidence board with 0.75 and two
  signals. It is more precise than "suggests" and less than "diagnoses".
- No "critical", no accuracy figure, no claim we cannot rerun.

## Shots

Taken from Eng 2's plan, with the changes marked. Record at 1280 × 800, 30
frames per second, from a local build, one take per shot, and save one PNG per
shot for the slides.

| Shot | Time (s) | Screen on `main` | Must be visible |
| --- | --- | --- | --- |
| S0 | 0–2 | Five faces, one frame | Five people; the team name in the lower third with the five first names |
| S1 | 2–5 | Status, list view (`s6-status-list.png`) | The "needs review" banner and the day |
| S2 | 5–7 | Title card | HeMoSo and the tagline, nothing else |
| S3 | 7–10 | Identify (`s3-identify.png`) | "Who is on duty today?" with the demo astronaut |
| S4 | 10–13 | Report (`s4-entry.png`) | The values typed, 38.5 °C last |
| S5 | 13–16 | Status, orbit view (`s5-status-orbit.png`) | Each reading against its usual range: "Needs review · consult" and "Outside your usual range" |
| S6 | 16–18.5 | Evidence board (`s7-fever-evidence.png`) | Fever, evidence 0.75 of 1, the two signals, the ntrs.nasa.gov source |
| S7 | 18.5–20 | Same board | "Ask your CMO or flight surgeon to check this" |
| S8 | 20–23 | Status, list view again | The other readings in the usual range: the whole picture, not one number |
| S9 | 23–26 | Vision card | Moon, Mars, base: three words, no illustration |
| S10 | 26–30 | Five faces, one frame | The team, with the end card over the lower third |

The picture follows the voice clause by clause: logging, comparing, the evidence,
who acts. When the voice names an action, the screen shows it, not the screen
before it.

S10 carries three things in four seconds: the faces, the name and the URL, and
the rule. Two lines of text at most: `HeMoSo · {{DEMO_URL}}` and
`HeMoSo suggests. Your CMO decides.` If the URL is long, move it to the vision
card and leave the faces alone for the last four seconds.

From 5 to 26 s the prototype carries a small corner label, `Prototype ·
synthetic data`. It is true, it costs no words, and it answers the judge who
wonders whether the fever belongs to a real person.

Record S0 and S10 in the same place, same light, same order of people, in one
sitting: they are the same shot, 26 seconds apart.

## NASA data

The guide asks how NASA's free and open data and partner data made the solution
possible. The video answers three times: the voice ("built from NASA's open
data"), the source line inside the evidence board (`ntrs.nasa.gov`), and a
caption from 13 to 20 s with two lines, the exact resource and what we took:

```
{{NASA_RESOURCE}}
{{WHAT_WE_TOOK}}
```

The name comes from Phys (`docs/nasa_data.md`, REQ-19). If Phys also uses a
partner agency resource, the second line adds it; if not, the video does not
mention partner data.

## Subtitles

Paste as `subs.srt`. English, burned in, readable muted.

```
1
00:00:00,000 --> 00:00:02,000
We're team ReTardis.

2
00:00:02,000 --> 00:00:05,000
Astronaut health monitoring,
because Earth is far away.

3
00:00:05,000 --> 00:00:07,500
Meet HeMoSo.

4
00:00:07,500 --> 00:00:10,000
Your health, checked
against your usual range.

5
00:00:10,000 --> 00:00:13,500
She logs 38.5 °C and a fast pulse.

6
00:00:13,500 --> 00:00:16,500
We compare them with her usual range
and show the evidence.

7
00:00:16,500 --> 00:00:20,000
She tells the CMO.
Built from NASA's open data.

8
00:00:20,000 --> 00:00:23,000
From lunar missions to Mars:
the same daily check.

9
00:00:23,000 --> 00:00:26,000
So a change is seen in time.

10
00:00:26,000 --> 00:00:30,000
Because exploring further means
taking better care of those who explore.
```

Rules: two lines at most, 42 characters per line, about 20 characters per second,
white with a black outline, bottom centre, one eighth of the height free of UI,
never over the value it talks about. Subtitles carry the meaning for a muted
judge, not a transcript. Cue 10 is the only one written exactly as spoken.

## Recording and export

- Record from a local build, never from https://www.hemoso.space: "Save readings"
  on the public site writes the staged fever into production and changes
  `demo_astronaut_1` for every viewer (Eng 2's note, Sun 06:55).
- The path is Eng 2's: `pnpm --dir frontend build`, `preview --port 4399`, then
  `team/eng2/notes/t16_record.py`. It saves one WebM and one PNG per shot.
- Voice: the five team members, English, one microphone, three takes of the
  unison line. Normalise to about −16 LUFS.
- `ffmpeg` is not installed on this machine; the cut, the subtitles and the
  `ffprobe` check happen on Juli's. The export keeps the audio track: `-c:a aac
  -b:a 128k`, not `-an`.
- Target 29.5 s. `ffprobe` rounds and the guide sets a maximum.
- H.264, `yuv420p`, 1280 × 800, no black frame at the start.
- Check it on a phone, muted, once.

## What stays off screen

- The full official challenge title: it takes six seconds to say.
- The 3D body, the camera and the forecast models: each needs more than 4 s and
  the product has ten. They belong in the slides.
- Symptoms: the report screen does not have them yet (T-80).
- Accuracy figures, "detects", "diagnoses". The board shows evidence and the CMO
  decides.
- Real faces, names or medical data of anyone outside the team, and any person
  under 18. The demo astronaut is synthetic.
- NASA logos, flags or mission identifiers, and nothing that suggests NASA built
  or endorses HeMoSo.

## Check before upload

| Check | Serves |
| --- | --- |
| Name at 0:00, challenge at 0:02, project at 0:05, idea at 0:10, future from 0:20 | Guide's video instructions |
| Duration 30 s or less, measured with `ffprobe` | REQ-17, REQ-31 |
| Subtitles burned in, English, readable muted | REQ-16, REQ-31 |
| NASA resource named on screen with what we took from it | REQ-19 |
| Public link opens in a private window, no login | REQ-31 |
| No generated voice or image without the watermark and the disclosure | REQ-20 |
| No image, voice or likeness of a person under 18 | REQ-22 |

## Still open

- The NASA resource and what we took: Phys (REQ-19).
- Symptoms in the report: T-80, Eng 2. Until then the video does not mention them.
- `ffmpeg`, the cut and the final `ffprobe`: Juli's machine.
- Voices and faces for S0 and S10: the team, before the 9:00 block.
- "Baseline" (the team's word since Sat 17:45) or "usual range" (the interface's
  word): the video uses the interface's, because the judge reads it on screen. If
  Bio 2 prefers one word everywhere, the subtitles change with it.
- The demo astronaut's name: the video says "she", no name, so it holds even if
  the persona changes.
