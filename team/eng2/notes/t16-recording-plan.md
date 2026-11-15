# T-16 recording plan · prototype shots

Sun 15 Nov 06:55, Eng 2. For Bio 1 (owner of `submission/video.md`) and the
team. Card #52, REQ-31. Block Sun 9:00 to 12:00.

## What changed since the script (Sat 23:05)

`submission/video.md` was written for screens that no longer exist. The app on
`main` (3dd596b) has three phases (identify, report, status), four states
(no data yet, in your usual range, outside your usual range, needs review) and
an evidence board of possible conditions. It has no yellow, orange or green
levels, and the demo data ends on Flight Day 30, so days 41, 42 and 46 cannot
be shown as written.

The story still works with one staged reading: the demo astronaut logs Flight
Day 31 with a core temperature of 38.5 °C and a heart rate of 96 bpm. Checked on
a local build of `main`:

- Status: "1 reading needs review"; core temperature "Needs review · consult";
  heart rate "Outside your usual range"; the other seven "In your usual range".
- Possible conditions: Fever, "Evidence 0.75 of 1", label Review, "Ask your CMO
  or flight surgeon to check this", signals "Core temperature: above a set
  limit" and "Heart rate: above your usual", source ntrs.nasa.gov.

## Shot map (proposal for Bio 1)

| Shot | Time (s) | Planned screen | Screen on `main` today |
| --- | --- | --- | --- |
| S1 | 2–5 | Status, day 41, yellow | Status, list view, the "needs review" banner (`s6-status-list.png`) |
| S3 | 7–10 | Day 41, full view | Identify: "Who is on duty today?" with the demo astronaut (`s3-identify.png`) |
| S4 | 10–13 | Entry: pulse, temperature, symptoms | Report: values typed, temperature 38.5 °C last (`s4-entry.png`). Symptoms are not in the report yet (T-80) |
| S5 | 13–16 | Trend, seven days | Status, orbit view with each reading against its usual range (`s5-status-orbit.png`); each report row also shows "14 earlier readings" and a sparkline |
| S6 | 16–18.5 | Suggestion, probability and basis | Evidence board: Fever 0.75, Review, with its signals and source (`s7-fever-evidence.png`) |
| S7 | 18.5–20 | Day 42, fever, flight surgeon | Same board; the temperature row says who acts ("Tell the CMO") |
| S8 | 20–23 | Day 46, back to the baseline | Not possible without more demo days. Option: drop it and give S6 the time, or log a normal day 32 |

Voice line 4 says "symptoms": the report has no symptom field on `main` yet.
Either keep "pulse, temperature" (the script already allows cutting "symptoms")
or wait for T-80.

## How to record

```bash
pnpm --dir frontend build
pnpm --dir frontend preview --port 4399
frontend/.venv/Scripts/python team/eng2/notes/t16_record.py http://localhost:4399 t16-take
```

`t16_record.py` saves one WebM take at 1280 × 800 and one PNG per shot. The
take and the PNGs stay out of the repository (they are large and change with
every build).

## Still missing before the final cut

| What | Who |
| --- | --- |
| The shot map above accepted or changed | Bio 1 |
| `ffmpeg` on the recording machine (cut, subtitles, audio, `ffprobe` for 30 s) | Juli |
| The public link serving `main`: https://hemoso.vercel.app shows only the title and the synthetic notice (Sun 06:30) | Wambi (T-13) |
| The NASA resource line for the caption | Phys (REQ-19) |
| Voices and faces for S0 and S10 | The team |
