# Vercel setup for the public demo

Goal: a public demo link with no login (REQ-18, T-13) that only goes out when
lint and tests pass. Eng 2 (Juli) prepared it; part of it needs Eng 1 (Wambi),
because the repository `Sadriica/hemoso` is under his personal GitHub account.

## Current state (Sat 14)
- Vercel project `hemoso` in Juli's account (`julian-mejias-projects`).
- Public link: https://hemoso.vercel.app (no login, checked in a private window).
- Node.js 24.x, Vercel Authentication off.
- Deploys are manual from Juli's machine. The project is not linked to GitHub.
- On every deploy Vercel runs, from `frontend/vercel.json`:
  `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test` → `pnpm build`.
  If one step fails, nothing is published and the last good deploy stays online.

## Why Juli cannot link the repository
- The Vercel GitHub App is installed on Wambi's account, and Vercel only lets
  the owner of that account use the installation. Write access as a
  collaborator is not enough.
- A personal repository has no admin role for collaborators; that role only
  exists in organization repositories:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository

## Option 1 (recommended): Wambi imports the repository in his Vercel account
Every push then deploys on its own, and each commit on GitHub shows whether the
build passed. About 3 minutes.

1. Sign in at https://vercel.com with the GitHub account `Sadriica`.
2. Open https://vercel.com/new → Import Git Repository → `Sadriica/hemoso`.
   If it is not listed: Adjust GitHub App Permissions → Only select
   repositories → `hemoso` → Save.
3. On the configure screen:
   - Root Directory: `frontend` (Edit → choose the folder).
   - Framework Preset: Vite. Leave Install, Build and Output empty; they come
     from `frontend/vercel.json`.
   - No environment variables. No tokens.
4. Click Deploy. If `main` has no `frontend/` yet, this first build fails. That
   is expected.
5. Settings → Build and Deployment → Node.js Version: `24.x` → Save.
6. Settings → Git → Production Branch: `eng2` for now → Save.
   Change it to `main` before the internal freeze (Sun 13:30), because `main`
   is what we submit.
7. Settings → Deployment Protection → Vercel Authentication: Disabled → Save.
   Without this the link asks for a Vercel login and fails REQ-18.
8. Deployments → Create Deployment → branch `eng2` → Create. Or push any
   commit to `eng2`.
9. Send Juli the production link and invite her as a viewer if the plan allows
   it, so she can read the build logs.

The name `hemoso.vercel.app` is taken by Juli's project, so Wambi's project gets
another link. To keep the short link, Juli deletes her project first (Settings
→ Advanced → Delete Project) and Wambi names his `hemoso`.

## Option 2: keep manual deploys from Juli's account
Works today and depends on nobody. From `frontend/`:

```bash
npx vercel@65.16.0 deploy          # preview link
npx vercel@65.16.0 deploy --prod   # updates https://hemoso.vercel.app
```

First time on a machine: `npx vercel@65.16.0 login`. The CLI creates
`frontend/.vercel/` and `frontend/.env.local`; both are in `frontend/.gitignore`
and must never be committed. Lint, test and build still run on Vercel before
anything is published. What is lost: automatic deploys on push and the build
status on GitHub commits.

## Option 3 (not recommended during the event): move the repository to an organization
Wambi creates a GitHub organization, transfers `hemoso` to it and makes Juli an
admin. Then Juli can install the Vercel app and link it herself. Cost: the
repository URL changes, everyone updates their remote, and the "final project"
link in the submission changes.

## How to check a deploy
1. The build log in Vercel shows `eslint .`, `vitest run` with all tests
   passed, and `tsc -b && vite build`.
2. The commit status on GitHub (only with Option 1):
   `curl https://api.github.com/repos/Sadriica/hemoso/commits/<sha>/status`
3. Open the link in a private window, not signed in. It must load with no login.

## Pending for Eng 1
- Choose Option 1 or 2 and tell Juli.
- Add a row to `docs/DECISIONS.md`: Vercel for the public demo instead of GitHub
  Pages. Both serve static files only; Vercel blocks a deploy when lint or
  tests fail.

## Sources
- Vercel project configuration: https://vercel.com/docs/project-configuration
- Vercel CLI deploy: https://vercel.com/docs/cli/deploy
- Vercel deployment protection: https://vercel.com/docs/deployment-protection
- Vercel Git integration: https://vercel.com/docs/git
- GitHub permission levels for a personal account repository: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository
