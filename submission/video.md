# Video · 30 seconds, English subtitles

Owner: Bio 1. Recorded by Eng 2 (REQ-31). Script v5, Sat 23:05: the opening is
one sentence, and the 0:10 beat covers the user, the prototype and the NASA data.

The submission guide sets the spine: who you are at 0:00, the challenge at 0:02,
the name at 0:05, the idea and the prototype at 0:10, the future from 0:20 to
0:30 (https://www.spaceappschallenge.org/resources/project-submission-guide/, as
quoted by the team on Sat 14 Nov; the 30 s limit and the English subtitles are
also in `docs/CHALLENGE.md`). The page did not open from this machine today, so
the instructions are the team's copy.

## How the team speaks

| Time | Who | Job |
| --- | --- | --- |
| 0:00–0:02 | All five, together | Team name |
| 0:02–0:05 | V1, Bio 1 | The challenge and the problem |
| 0:05–0:10 | V2, Phys | Project name and tagline |
| 0:10–0:20 | V1, Bio 1 | How it works, over the prototype |
| 0:20–0:26 | V2, Phys | The future |
| 0:26–0:30 | V2 alone, the team on camera | The closing line |

The team speaks together once, at the start, and is visible again at the end
while V2 closes. Five people saying the last line together would need four
seconds and a precision we do not have at 22:00 on a Saturday; one voice says
it and the five faces carry the rest.

Tone: calm and factual. No rising music, no slow motion, no "imagine". The facts
are strong enough; the voice does not push them. Look at the lens, speak at
conversation volume, and let the pauses at 0:05 and 0:26 do the work.

## Script

| Time (s) | Speaker | Line | Direction |
| --- | --- | --- | --- |
| 0.0–2.0 | Team | We're team ReTardis. | One voice, five faces, no gesture |
| 2.0–5.0 | V1 | Astronaut health monitoring, because Earth is far away. | One sentence, a small pause at the comma |
| 5.0–10.0 | V2 | Meet HeMoSo: your health, monitored against your own baseline. | A short stop after the name |
| 10.0–20.0 | V1 | She logs pulse, temperature, symptoms. HeMoSo compares them with her baseline, suggests possible causes, and alerts the CMO on board. Built from NASA's open data. | Even pace; the CMO clause one step louder |
| 20.0–26.0 | V2 | From lunar missions to Mars: the same daily check, so a change is seen in time. | Same volume, no dreamy tone |
| 26.0–30.0 | V2 | Because exploring further means taking better care of those who explore. | Slower than the rest, one idea per breath |

72 words, 2.4 per second. If a take runs past 29.5 s, cut "symptoms" from beat 4
and keep "pulse, temperature"; never shorten the closing.

Line notes:

- "Astronaut health monitoring" names the challenge. Without it a judge scores
  Relevance from memory, not from the video.
- "Because Earth is far away" keeps the beat to one sentence. Two sentences
  ("In space, medical care is limited.") read like a list; a comma and a reason
  read like someone thinking. The CSA page on long missions supports the point
  (less reliance on Earth for emergency medical help).
- Beat 4 answers the guide's three questions in order: a user's experience
  ("she logs"), how it works ("compares, suggests, alerts"), and the data
  ("built from NASA's open data"). The prototype is on screen the whole time.
- "Built from", not "using": the data informed the thresholds, the app does not
  query it at runtime.
- "suggests possible causes" and the card on screen show the probability and its
  basis, so the voice does not spell out a number it cannot defend.
- No "critical", no "early detection saves lives": a claim without a source has
  no place in 30 seconds.
- The closing is a fragment that continues the previous sentence: it works
  spoken, and the subtitle keeps it whole.

## Shots

Record at 1280 × 800, 30 frames per second, same window, same zoom, one take per
shot, plus one screenshot per shot for the slides.

| Shot | Time (s) | Screen | Must be visible |
| --- | --- | --- | --- |
| S0 | 0–2 | Five faces, one frame | Five people, the team name in the lower third with the five first names |
| S1 | 2–5 | Status, day 41, yellow | The level and the day |
| S2 | 5–7 | Title card | HeMoSo and the tagline, nothing else |
| S3 | 7–10 | Day 41, full view | The screen the astronaut uses every day |
| S4 | 10–13 | Entry: pulse, temperature, symptoms | Her hand or cursor entering a value; the fields filled |
| S5 | 13–16 | Trend, seven days | The baseline line and three days above it |
| S6 | 16–18.5 | Status card | The suggestion, its probability and its basis |
| S7 | 18.5–20 | Day 42, orange | Fever 38.5 °C, sore throat, flight surgeon |
| S8 | 20–23 | Day 46, green | Both indicators back in the baseline |
| S9 | 23–26 | Vision card | Moon, Mars, base: three words, no illustration |
| S10 | 26–30 | Five faces, one frame | The team, with the end card over the lower third |

The shots follow the voice clause by clause: logging, comparing, suggesting,
alerting. When the voice names an action, the screen shows it, not the screen
before it.

From 5 to 26 s the prototype carries a small corner label, `Prototype ·
synthetic data`. It is true, it costs no words, and it answers the judge who
wonders whether the fever belongs to a real person.

S10 carries three things in four seconds: the faces, the name and the URL, and
the rule. Keep it to two lines of text: `HeMoSo · {{DEMO_URL}}` and
`HeMoSo suggests. Your CMO decides.` If the URL is long, move it to the vision
card at 23–26 s and leave the faces alone for the last four seconds.

The path through the app is the four moments of
`team/bio1/notes/elena-demo-texts.md`: day 41, day 42, day 46. Day 22 is not
needed in 30 s. Eng 2's Playwright test walks the same path.

Record S0 and S10 in the same place, with the same light and the same order of
people, in one sitting: they are the same shot, 26 seconds apart.

## Name and tagline

1. **HeMoSo: your baseline, watched every day.** The spoken line is "your
   health, monitored against your own baseline", which says the same and fits the
   five seconds.
2. HeMoSo: see the change before the emergency. Stronger, and a claim that only
   the day 41 screen supports.
3. HeMoSo: health, followed from your own baseline. Longer, weaker verb.

## NASA data

The guide asks how NASA's free and open data and partner data made the solution
possible. The video answers with the voice ("built from NASA's open data") and
with a caption in two lines: the exact resource and what we took from it. The
name comes from Phys (`docs/nasa_data.md`, REQ-19). Until it is published the
caption reads:

```
{{NASA_RESOURCE}}
{{WHAT_WE_TOOK}}
```

It shows from 13 to 20 s, white on a dark strip, no logo, no mission patch. If
Phys also uses a partner agency resource, the second line adds it:
`{{PARTNER_RESOURCE}} — {{WHAT_WE_TOOK}}`. If not, the video does not mention
partner data; the guide asks for what we used, not for a longer list.

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
Your health, monitored
against your own baseline.

5
00:00:10,000 --> 00:00:13,500
She logs pulse, temperature, symptoms.

6
00:00:13,500 --> 00:00:16,500
We compare them with her baseline
and suggest possible causes.

7
00:00:16,500 --> 00:00:20,000
The CMO on board is alerted.
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

Rules: two lines at most, 42 characters per line, about 20 characters per second.
White text with a black outline, bottom centre, one eighth of the height free of
UI, never over the value it talks about. Subtitles are shorter than the voice on
purpose: they carry the meaning for a muted judge, not a transcript. Cue 10 is
the only one written exactly as spoken, because the closing line is the one the
judge should remember word for word.

## Recording and export

- Voice: the five team members, English, one microphone, three takes of the
  unison line. Small natural offsets are fine; a count-in is not, it gets cut.
- V2 closes on camera. No hand movement, no nod at "explore".
- Normalise to about −16 LUFS. A generated voice would need the visible watermark
  and the disclosure (REQ-20), so use real voices.
- Do not cut the audio track. The command in `docs/DEPLOY.md` §2 ends in `-an`,
  which removes it; with a voice the export needs `-c:a aac -b:a 128k` instead.
  That file is Eng 1's, so it has to change there before Sunday.
- Silent fallback: the same cut with subtitles only. They are written to work
  alone.
- Target 29.5 s. `ffprobe` rounds and the guide sets a maximum.
- H.264, `yuv420p`, 1280 × 800, no black frame at the start.
- Check it on a phone, muted, once.

## What stays off screen

- The full official challenge title: it takes six seconds to say. "Astronaut
  health monitoring" names it.
- The 3D body, the camera and the forecast models: each needs more than 4 s to be
  understood and the product has ten. They belong in the slides.
- Accuracy figures, "detects", "diagnoses". The app suggests with a probability
  and a basis, and the CMO confirms.
- Real faces, names or medical data of anyone outside the team, and any person
  under 18. The demo persona is synthetic.
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
| Watermark and disclosure if any generated image, voice or clip is used | REQ-20 |
| No image, voice or likeness of a person under 18 | REQ-22 |

## Still open

- The NASA resource and what we took: Phys (REQ-19). It is the one line the guide
  asks for and we cannot write ourselves.
- The probability and its basis on the day 41 card: Bio 2.
- Screens 3 to 7 and the public URL: Eng 2, Sunday B4.
- Who is V1 and who is V2: V1 knows the demo, V2 is the other voice and closes.
  Photos and names only of team members who agree to appear.
