# Tools and versions (team preparation)

The tools the engineers know and have installed, so Saturday starts without
setup problems. What the solution uses beyond this is decided on Saturday and
recorded in `docs/DECISIONS.md`. Checked against the package registries on
Fri 13 Nov 2026.

| Part | Tool | Version | Why it is here |
| --- | --- | --- | --- |
| Backend | Python | 3.13 | Installed and tested on our machines; current wheels for common packages |
| | uv | 0.13 | Environments and lockfiles (`uv lock`, `uv sync --frozen`) |
| | FastAPI, Pydantic | 0.162, 2.14 | The engineers' usual API stack, if the solution needs a backend |
| | uvicorn | 0.54 | Serves the FastAPI app; the backend host runs it |
| | pytest, ruff, httpx | 9.2, 0.17, 0.28 | Tests and lint before every merge |
| Frontend | Node | 24 LTS (22.12 minimum) | Required by Vite 8 |
| | pnpm | 12 | Installs from a lockfile (`pnpm install --frozen-lockfile`) |
| | React, TypeScript, Vite | 19.3, 7.0, 8.3 | The engineers' usual frontend stack (TypeScript 6.0 if a tool breaks with 7) |
| | Vitest, Playwright | 5.1, exact version pinned on Saturday | Unit and end-to-end tests, screenshots, video recording |
| | @axe-core/playwright | pinned on Saturday | Accessibility check of every screen |
| Delivery | Vercel, Supabase, backend host, ffmpeg | — | Frontend, stored data, backend API, and subtitles for the video (`docs/DEPLOY.md`) |

## Rules for the weekend
1. **Lockfiles, not ranges.** On Saturday the first commit of `backend/` and
   `frontend/` includes `uv.lock` and `pnpm-lock.yaml`; everyone installs with
   `uv sync --frozen` and `pnpm install --frozen-lockfile`. No upgrades during the event.
2. **Every library serves a requirement or a task** and gets a row in
   `docs/DECISIONS.md` with its license and the reason.
3. **Licenses.** MIT, BSD, Apache-2.0, ISC, Unlicense and CC0 code may be used or
   copied with its notice (copied code goes in a `vendor/` folder with a header
   naming source, author and license, and a row in `docs/sources.md`). GPL and
   AGPL code is not copied: implement from the paper or specification, never by
   translating their code. LGPL is avoided this weekend to skip compliance work
   (it does not relicense our repository, but brings obligations about the library).
4. **No external AI services inside the solution** (no LLM APIs, no cloud vision
   or OCR): everything it computes runs on the machine.
5. **Offline-friendly:** no scripts, fonts or models loaded from a CDN at runtime.
   The app needs a network connection (`docs/DECISIONS.md`); REQ-13 and REQ-28,
   about working with delayed or no contact with Earth, are open there.

## Friday night (engineers, on your own machine)
```bash
uv python install 3.13
node --version            # 24.x, or at least 22.12
npm install -g pnpm@12
uv --version && pnpm --version
```
Fill the package caches on Saturday right after the first `uv lock` and
`pnpm install`, before the Wi-Fi gets busy.
