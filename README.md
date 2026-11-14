# HeMoSo · Space Apps 2026 team

NASA Space Apps Challenge 2026 · Medellín · Challenge: *Create Health Monitoring
Software for Astronauts on Space Missions*.

The solution is designed and built during the event, from Saturday 14 November
at 9:00. Until then this repository holds the team's work plan and tooling
only. What the challenge asks: `docs/CHALLENGE.md`.

_(Eng 1 replaces this paragraph with what we built and how to run it before submission.)_

---

## How we work

| Role | Name | Branch | Agent | Personal folder |
| --- | --- | --- | --- | --- |
| Bio 1 · Health content and pitch | _(fill in)_ | `bio1` | `bio1` | `team/bio1/` |
| Bio 2 · Rules, thresholds and submission | _(fill in)_ | `bio2` | `bio2` | `team/bio2/` |
| Phys · Data, NASA sources and measurement | _(fill in)_ | `phys` | `phys` | `team/phys/` |
| Eng 1 · Integrator, backend and requirements | Wambi | `eng1` (and merges into `main`) | `eng1` | `team/eng1/` |
| Eng 2 · Frontend and demo | Juli | `eng2` | `eng2` | `team/eng2/` |

Full rules: `AGENTS.md`. `config/` formats (from Saturday 10:00): `FORMATS.md`. Units, glossary,
findings and status messages: `STANDARDS.md`. Skills: `SKILLS.md`.
Saturday setup: `docs/SETUP.md`. Board: `docs/BOARD.md`.
Tools and versions: `docs/STACK.md`. Public links and video: `docs/DEPLOY.md`.
Decisions and rejected options: `docs/DECISIONS.md`.

### The usual way: ask your agent
- "save my progress" → checks the branch, proposes `git add` of your paths, commit and push.
- "pull main" → brings in the latest after a checkpoint.
- "@reviewer review my last change" → review without editing.
- "show my cards", "start #12", "send #12 to review" → the board (`kanban` skill).

### If the agent fails: five commands
```bash
git branch --show-current                 # 1. am I on my branch?
git status                                # 2. what did I change?
git add <my files>                        # 3. never "git add ."
git commit -m "type(area): what changed"  # 4. one sentence, in English
git push                                  # 5. upload
```
Pull `main`: `git fetch origin && git merge origin/main`.

### Checkpoints
Saturday 12:00 · Saturday 17:00 · Sunday 8:00 (feature freeze) · Sunday 13:00 (submission).
Internal freeze Sunday 13:30; official close Sunday 23:59 local.
15 minutes before: update `team/<person>/README.md`, commit, push and post
"ready". Eng 1 merges, tests and tags (`cp1`, `cp2`, `cp3`, `submission`).

### Never
`git push --force` · `git reset --hard` · `git rebase` · commit to `main` ·
commit `.env` or keys · touch someone else's files.
