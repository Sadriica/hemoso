# frontend/ · Eng 2

Vite + React + TypeScript app, managed with pnpm 12. This is the HeMoSo
frontend shell. Tools and versions: `docs/STACK.md`; public link and video:
`docs/DEPLOY.md`.

## Setup (from `frontend/`)
```bash
pnpm install --frozen-lockfile
```

## Commands
```bash
pnpm dev       # start the dev server
pnpm build     # type-check (tsc -b), then build to dist/
pnpm preview   # serve the production build locally
pnpm lint      # ESLint
pnpm test      # Vitest, runs once
```

## Notes
- `base: './'` in `vite.config.ts` so the build works from any static host
  (GitHub Pages).
- The shell shows synthetic data only. The real indicators and their units come
  from `config/` once `FORMATS.md` is agreed.
