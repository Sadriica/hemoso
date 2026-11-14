# backend/ · HeMoSo API

Stores each astronaut's entries (REQ-27) and returns history. FastAPI; SQLite by
default or Supabase, chosen by `STORAGE`.

Install: `uv sync --frozen` (Python 3.13).
Run: `uv run uvicorn app.main:app`.
Test: `uv run ruff check . && uv run pytest`.

## Supabase

The `supabase` storage talks to the Supabase REST API with the service role key.
The key comes from the host settings (`SUPABASE_URL`, `SUPABASE_KEY`), never from
the frontend and never committed. Create the `entries` table by running
`supabase/schema.sql` in the Supabase SQL editor (Dashboard → SQL editor).
