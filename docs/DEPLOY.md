# Public links and the demo video

Delivery rules from the submission guide: public links to the demo and the
project with no login, and a demo of 30 s at most with English subtitles (or 7
slides at most). How the solution is published is recorded in
`docs/DECISIONS.md`; this file holds the steps.

## 1. Public project and demo
- The repository is public from Saturday 9:00 (it is the "final project" link).
- The frontend is published on Vercel from `frontend/` (Eng 2 owns it). Vercel
  connects to the repository, builds and serves the frontend under the team's
  domain (the architecture is in `docs/DECISIONS.md`).
- The backend runs on its own host; Railway is the candidate, not yet decided
  (`docs/DECISIONS.md`). The host builds `backend/Dockerfile` from the
  repository root (`docker build -f backend/Dockerfile -t hemoso-backend .`);
  the image copies `backend/` and `config/` and starts uvicorn on the port in
  `PORT`. Set `STORAGE=supabase` there: the container file system is not kept.
  It needs the variables below.
- Supabase stores the data. Create the `entries` table once per project by
  running `backend/supabase/schema.sql` in the Supabase SQL editor
  (Dashboard → SQL editor).
- Environment variables, from `backend/.env.example`:

  | Variable | What it is for |
  | --- | --- |
  | `STORAGE` | Which store the backend uses: `sqlite` (default) or `supabase` |
  | `SQLITE_PATH` | Where the SQLite file lives (default `backend/entries.db`) |
  | `CONFIG_DIR` | Folder with `data/`, `rules/` and `content/` (default the repository's `config/`) |
  | `SUPABASE_URL` | The Supabase project URL |
  | `SUPABASE_KEY` | The Supabase service role key |
  | `ALLOWED_ORIGINS` | Comma-separated origins the API accepts; it must list the Vercel URL |

  Values live only in host settings and local `.env` files, never in the
  repository (`docs/PRIVACY.md`).
- Anything published is public: only synthetic data, never real personal data
  (`docs/PRIVACY.md`).
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
