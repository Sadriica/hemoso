# Public links and the demo video

Delivery rules from the submission guide: public links to the demo and the
project with no login, and a demo of 30 s at most with English subtitles (or 7
slides at most). This file holds the tools; how the solution is published is
decided on Saturday and recorded in `docs/DECISIONS.md`.

## 1. Public project and demo
- The repository is public from Saturday 9:00 (it is the "final project" link).
- If the solution has a web frontend, GitHub Pages can publish it from `main`
  with the workflow in `docs/deploy/pages.yml` (copy it to
  `.github/workflows/pages.yml`, then Settings → Pages → Source: GitHub Actions).
  GitHub Pages serves static files only: it cannot run a Python backend
  (https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).
  Whatever is published there must work without a server, or be presented
  honestly as a recorded or replayed demo.
- Use `base: './'` in Vite and avoid path routes (Pages answers 404 to deep links).
- Anything published is public: only synthetic data, never real personal data.
- Check both links in a private window, not signed in, before the internal freeze.

## 2. The 30-second video with English subtitles
Record the demo path with Playwright (same resolution every take) or a screen
recorder, then burn the subtitles with ffmpeg:
```bash
ffmpeg -i demo.webm \
  -vf "subtitles=subs.srt:force_style='FontSize=24,BorderStyle=3'" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -an demo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 demo.mp4   # 30 or less
```
`subs.srt` uses the usual format (`1`, `00:00:00,000 --> 00:00:04,000`, the line).
Plan B: 7 slides exported to PDF. Neither may depend on the network during the presentation.
