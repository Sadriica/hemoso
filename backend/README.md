# backend/ · HeMoSo API

Stores each astronaut's entries (REQ-27) and returns history. FastAPI; SQLite by
default or Supabase, chosen by `STORAGE`.

Install: `uv sync --frozen` (Python 3.13).
Run: `uv run --env-file .env uvicorn app.main:app` (`--env-file` loads
`backend/.env`; uvicorn does not read it on its own).
Test: `uv run ruff check . && uv run pytest`.

## Supabase

The `supabase` storage talks to the Supabase REST API with the service role key.
The key comes from the host settings (`SUPABASE_URL`, `SUPABASE_KEY`), never from
the frontend and never committed. The service role key bypasses row level
security, so the `entries` table has RLS on with no policies and only the
backend can reach it. The API itself has no login; that is acceptable only
because every value is synthetic (REQ-14). Create the `entries` table by running
`supabase/schema.sql` in the Supabase SQL editor (Dashboard → SQL editor).

## Environment

Names in `backend/.env.example`, values only in host settings and a local
`backend/.env` (git-ignored; `docs/PRIVACY.md`):

| Variable | What it is for |
| --- | --- |
| `STORAGE` | Which store the backend uses: `sqlite` (default) or `supabase` |
| `SQLITE_PATH` | Where the SQLite file lives (default `backend/entries.db`) |
| `CONFIG_DIR` | Folder with `data/`, `rules/` and `content/` (default the repository's `config/`) |
| `SUPABASE_URL` | The Supabase project URL |
| `SUPABASE_KEY` | The Supabase service role key |
| `ALLOWED_ORIGINS` | Comma-separated origins the API accepts; it must list the Vercel URL |
