# T-16 · Cut the 30 s video in a product-launch style (for Juli)

Sun 15 Nov 09:10, Wambi. Card #52, REQ-31. Style reference: a SaaS launch video
the team liked (slow zooms into the real screens, short cross-dissolves, clean
title cards). Everything on screen stays a real screenshot of `main`.

## 1. Sharper stills (one line in `t16_record.py`)

The zooms go up to 1.45×, so record at 2× pixels:

```python
context = browser.new_context(
    viewport={"width": 1280, "height": 800},
    device_scale_factor=2,          # add this line
    ...
)
```

Then run the take as in `t16-recording-plan.md` (local build, never the public site).

## 2. What you need before the cut

| File | What | Who |
| --- | --- | --- |
| `t16-take/*.png` | the five stills of `t16_record.py` | Juli |
| `faces_open.mp4`, `faces_close.mp4` | S0 and S10, the five faces, same place and light (≥ 2 s and ≥ 4 s) | the team |
| `voice.m4a` | the six lines of `submission/video.md`, one take, 30 s or less | V1 and V2 |
| `subs.srt` | the same six lines with the times of the script table | Bio 1 or Juli |
| a `.ttf` font | Barlow Condensed Bold (SIL OFL); drawtext cannot read the `.woff2` in `frontend/public/fonts` | Juli |

Font: `pip install fonttools brotli` then
`python -c "from fontTools.ttLib import TTFont; f=TTFont('frontend/public/fonts/barlow-condensed-latin-700.woff2'); f.flavor=None; f.save('BarlowCondensed-700.ttf')"`.

## 3. The cut

```bash
python team/eng1/notes/t16_edit.py --take t16-take \
  --faces-open faces_open.mp4 --faces-close faces_close.mp4 \
  --voice voice.m4a --subs subs.srt --font BarlowCondensed-700.ttf --out demo.mp4
```

It prints the length (must be 30.00 s or less). Without the face clips the two
face shots become title cards; without `--voice` the video is silent. Tested on
ffmpeg 6.1 (about 20 s to render).

The shot table is `SHOTS` at the top of the script, the same times as
`submission/video.md`. To move a zoom, change its focus (0..1 of the screenshot)
and its end zoom; to change a card, change its text (`big line|small line`).

## 4. Before you publish (REQ-16, REQ-20, REQ-22, REQ-31)

- 30 s or less (`ffprobe` in the script output), English subtitles burned in.
- Only real screens of the app; no NASA logo or NASA insignia anywhere.
- No one under 18 in the face shots.
- If any image or voice in the video is made by an AI tool, it carries a visible
  watermark and the page says so (SI disclosure). The script itself only edits
  real footage.
- Public link with no login (YouTube unlisted or public, or Vimeo), pasted into
  `submission/submission.md` by Bio 2.
