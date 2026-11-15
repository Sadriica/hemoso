# Video cards (Bio 1)

Three PNGs at 1280 × 800 for the 30-second video, made with the app's own design
tokens (`frontend/DESIGN.md`): Barlow Condensed 700 for the headline, JetBrains
Mono for labels, bone white `#F2F1E9` on `#070B10`, accent `#8EC5FF`.

| File | Shot | Used at |
| --- | --- | --- |
| `s2-title.png` | S2, title card | 5–7 s, with subtitle cue 3 and 4 |
| `s9-vision.png` | S9, vision card | 23–26 s, with subtitle cue 9 |
| `s10-end-overlay.png` | S10, end overlay | 26–30 s, over the five faces |

`s10-end-overlay.png` has a transparent background: the top band darkens the
faces enough for the name, the URL and the rule to read, and the bottom stays
free.

## Rules these follow

- Nothing in the bottom 160 px: that is where the burned subtitles sit.
- No NASA logo, flag or mission identifier; no illustration, no astronaut photo.
- They are our own mockups, not generated images, so no watermark and no
  disclosure are needed (REQ-20).
- `hemoso.space` is the public demo link (`docs/DEPLOY.md`).

## How they were made

HTML and CSS rendered by headless Chrome, same trick for all three:

```bash
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1280,800 --screenshot=s2-title.png s2-title.html
```

Add `--default-background-color=00000000` for the transparent overlay.
