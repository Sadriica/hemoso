# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f backend/Dockerfile -t hemoso-backend .
# Run locally:
#   docker run -e PORT=8080 -e STORAGE=memory -p 8080:8080 hemoso-backend
# On the host, set STORAGE=supabase (plus SUPABASE_URL and SUPABASE_KEY): the
# container file system is not kept, so the default sqlite store is lost when
# the container is recreated.

FROM python:3.13.18-slim

# uv is copied from its official distroless image at a pinned version.
COPY --from=ghcr.io/astral-sh/uv:0.11.2 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    CONFIG_DIR=/config

WORKDIR /app

# Install dependencies first so this layer stays cached while the code changes.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ /app
COPY config/ /config

# Run as a non-root user; own /app so the default sqlite store can write.
RUN useradd --create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app
USER appuser

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

# Railway sets PORT; default 8000 locally.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
