# backend/ · HeMoSo API

Stores each astronaut's entries (REQ-27) and returns history. FastAPI; SQLite by
default or Supabase, chosen by `STORAGE`.

Install: `uv sync --frozen` (Python 3.13).
Run: `uv run uvicorn app.main:app`.
Test: `uv run ruff check . && uv run pytest`.
