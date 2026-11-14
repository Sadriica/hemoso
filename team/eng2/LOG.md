# Log · Eng 2 (Juli)

One entry per decision. Newest first.

| Time | What | Why | Source | AI used |
| --- | --- | --- | --- | --- |
| Sat 14 11:58 | Vercel project `hemoso` created and first deploy made with the Vercel CLI from `frontend/`: Node 24.x, Vercel Authentication off; install, lint, test and build passed; https://hemoso.vercel.app opens with no login | Public demo link (REQ-18) now, while the GitHub link waits for Eng 1 to install the Vercel GitHub app on the repository | https://vercel.com/docs/cli/deploy, https://vercel.com/docs/deployment-protection | Yes: Claude Code ran the CLI and the Vercel MCP and checked the build log; Juli approved |
| Sat 14 11:37 | Vercel builds the frontend with `frontend/vercel.json`: install from the lockfile, then lint, test and build; a failing step stops the deploy | Public demo link (REQ-18) that only goes out when tests pass | https://vercel.com/docs/project-configuration | Yes: Claude Code wrote the config; Juli reviewed |
| Sat 14 11:30 | jsdom pinned to 29.1.1 instead of 31.0.1 | jsdom 31 needs Node 22.15 or later; this machine has Node 22.13. 29.1.1 runs on 22.13 and on Node 24 | `pnpm test` crash in `undici` (`createZstdDecompress` missing) | Yes: opencode found and fixed it; checked by rerunning the tests |
| Sat 14 11:30 | Frontend skeleton: Vite 8.3.8, React 19.3.1, TypeScript 6.0.3, Vitest 5.1.0, pnpm 12.20.0, all pinned | Versions from `docs/STACK.md`; TypeScript 6 because typescript-eslint 8.72 does not support 7 | `docs/STACK.md`, npm registry | Yes: opencode (DeepSeek V4 Pro) wrote the files; Claude Code reviewed them and reran install, lint, test and build |
| Sat 14 11:10 | Playwright for Python 1.65.2 in `frontend/requirements-dev.txt`, in `frontend/.venv` | Needed by the `webapp-testing` skill for screenshots and the demo path | https://pypi.org/project/playwright/ | Yes: Claude Code installed and tested it |
