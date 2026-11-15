# Public links and the demo video

Delivery rules from the submission guide: public links to the demo and the
project with no login, and a demo of 30 s at most with English subtitles (or 7
slides at most). How the solution is published is recorded in
`docs/DECISIONS.md`; this file holds the steps.

## 1. Public project and demo
- The repository is public from Saturday 9:00 (it is the "final project" link).
- The frontend is published on Vercel from `frontend/` (Eng 1 owns it). Vercel
  connects to the repository, builds `frontend/` and serves it under the team's
  domain (the architecture is in `docs/DECISIONS.md`). The build reads `config/`
  from the repository root (`frontend/src/content/load.ts` globs
  `../../../config/**`), so the Vercel project setting "Include files outside
  the root directory in the Build Step" must stay on. The frontend reads
  `VITE_API_BASE_URL` (the backend URL) from the Vercel environment variables.
- The backend runs on Railway at https://hemoso-production.up.railway.app
  (`docs/DECISIONS.md`). Railway builds
  `backend/Dockerfile` from the repository root with
  `DOCKER_BUILDKIT=1 docker build -f backend/Dockerfile -t hemoso-backend .`.
  BuildKit reads `backend/Dockerfile.dockerignore`, which the legacy builder
  ignores and would otherwise copy the host `.venv` and secrets into the image.
  The image copies `backend/` and `config/` and starts uvicorn on the port in
  `PORT`. Set `STORAGE=supabase` there: the container file system is not kept.
  It needs the variables below. `backend/railway.json` holds the build and
  deploy settings the host needs; section 3 lists them.
- Supabase stores the data. Create the tables once per project by
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
| `RATE_LIMIT_PER_MINUTE` | Requests per minute per address (default 120). Production uses `600`: one Status load makes about 25 requests and a venue network shares one address. `0` turns the limit off |

  Values live only in host settings and local `.env` files, never in the
  repository (`docs/PRIVACY.md`). Run the backend locally from `backend/` with
  `uv run --env-file .env uvicorn app.main:app`; `--env-file` loads the local
  `.env`, which uvicorn does not read on its own.
- Anything published is public: only synthetic data, never real personal data
  (`docs/PRIVACY.md`).
- Check both links in a private window, not signed in, before the internal freeze.

## 2. The 30-second video with English subtitles
Record the demo path with Playwright (same resolution every take) or a screen
recorder, then burn the subtitles with ffmpeg:
```bash
# Voice recorded with the screen (demo.webm has audio):
ffmpeg -i demo.webm \
  -vf "subtitles=subs.srt:force_style='FontSize=24,BorderStyle=3'" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k demo.mp4
# Voice recorded apart (voice.m4a), Playwright video has no audio:
ffmpeg -i demo.webm -i voice.m4a -map 0:v -map 1:a \
  -vf "subtitles=subs.srt:force_style='FontSize=24,BorderStyle=3'" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -shortest demo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 demo.mp4   # 30 or less
```
`subs.srt` uses the usual format (`1`, `00:00:00,000 --> 00:00:04,000`, the line).
Plan B: 7 slides exported to PDF. Neither may depend on the network during the presentation.

## 3. Deploy checklist (Sunday)

The host, the Supabase project and the keys are not chosen yet
(`docs/DECISIONS.md`). These are the steps once they exist. The order matters:
the CORS list and the frontend URL point at each other.

1. **Supabase project.** Create it, open Dashboard → SQL editor → New query,
   paste `backend/supabase/schema.sql` and run it. Copy the project URL and the
   service role key for step 4; they stay in the host settings and nowhere else
   (`docs/PRIVACY.md`).
2. **Backend service.** Railway: New Project → Deploy from a GitHub repo → this
   repository, branch `main`. Leave the root directory empty: that is the
   repository root. Then set the service's config file path to
   `/backend/railway.json`. Without that setting Railway looks for
   `railway.json` at the root and does not see the one in `backend/`.
3. **Domain.** Generate a public domain for the service, then open
   `<url>/health`: it must answer `{"status":"ok"}`. The healthcheck watches the
   same path, so a deploy that never turns healthy points at startup, not at the
   route.
4. **Backend variables.** Add every name of `backend/.env.example`:
   `STORAGE=supabase`, `SUPABASE_URL` and `SUPABASE_KEY` from step 1, and
   `ALLOWED_ORIGINS`, which step 6 fills. Leave `SQLITE_PATH` empty: the
   container file system is not kept. `CONFIG_DIR=/config` is already in the
   image.
5. **Frontend.** In Vercel set `VITE_API_BASE_URL` to the step 3 URL, with no
   trailing slash, and redeploy `frontend/`.
6. **Back to the backend.** Set `ALLOWED_ORIGINS` to the Vercel URL, exactly and
   with no trailing slash, then redeploy. A browser at any other origin is
   refused, and so is the demo.
7. **Smoke test the public URLs.** From the repository root:
   `python scripts/smoke.py <backend url> --origin <vercel url>`. Every line
   must start with `OK` and the exit code must be 0. Each `FAIL` line names the
   cause: the URL does not answer, an entry disagrees with an earlier one, or
   the CORS preflight does not echo the frontend URL.
8. **Private window.** Open both links, not signed in, on desktop and phone.
   Everything on screen is synthetic (REQ-14). This closes T-13 and REQ-32.

### What `backend/railway.json` sets

Railway reads a service's settings from a config file in the repository. The
keys here are the ones in
[Config as Code](https://docs.railway.com/reference/config-as-code):
`build.builder` `DOCKERFILE`, `build.dockerfilePath` `backend/Dockerfile`,
`deploy.healthcheckPath` `/health`, `deploy.healthcheckTimeout` 300,
`deploy.restartPolicyType` `ON_FAILURE` and `restartPolicyMaxRetries` 10.

The build context is the repository root, which is why the root directory in
step 2 stays empty: `backend/Dockerfile` copies `backend/` and `config/` from
the root of that context.

The same page marks Config as Code deprecated: files keep working for services
that use them until 2026-12-01, and new services cannot opt in. If the deploy
ignores the file, set the same values in the dashboard: builder `Dockerfile`,
Dockerfile path `backend/Dockerfile`, healthcheck path `/health`, restart policy
`On failure`. The deploy works either way; the file only saves the typing.

