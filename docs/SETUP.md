# Repository setup

A copy of this folder becomes the repository on Saturday at 9:00. It holds the
team's work plan, rules, agents, skills, scripts and templates. No solution
design or code: that starts at 9:00 on Saturday (Space Apps rules).

## What is here
| File | Purpose |
| --- | --- |
| `README.md` | Project front page and "How we work" with the command cheat sheet |
| `AGENTS.md` | Shared rules, language, personal folder, the whole git flow and tool settings |
| `CLAUDE.md` | For Claude Code users: loads `AGENTS.md` and `FORMATS.md` |
| `FORMATS.md` | Empty template: files, formats and owners, written Saturday 9:00 to 10:00 |
| `docs/CHALLENGE.md` | What the challenge and the guides ask, plus questions for the local lead |
| `STANDARDS.md` | Findings, status messages, units, dates, glossary, citations, file names |
| `SKILLS.md` | Which skills each person uses and how to install the recommended external ones |
| `opencode.json` | Global permissions: reads git freely; asks for everything else; blocks force push, reset --hard, rebase and `git add .` |
| `.opencode/agents/<person>.md` | Each person's agent: role, paths, work order, sources, formats, git and skills (biologists and Eng 2 cannot push to `main`) |
| `.opencode/agents/reviewer.md` | `@reviewer`: reviews without editing |
| `.opencode/skills/` | 11 team skills: 5 shared, `report-finding` for the biologists, plus each role's own |
| `.githooks/commit-msg` | Strips any automatic co-author or signature from commits |
| `docs/STACK.md`, `docs/DEPLOY.md`, `docs/DECISIONS.md` | Tools and versions, public links and video, decision record |
| `scripts/setup.sh` | Author, hook, `.claude/settings.json` without attribution, and each person's branch |
| `scripts/precheck.py`, `status.py`, `now.py` | Before every push; status line at checkpoints; where we are in the schedule |
| `scripts/new_finding.py`, `check_sources.py`, `requirements_report.py` | Biologists' helpers (see the table in `AGENTS.md`) |
| `docs/findings/` | One file per finding, from `TEMPLATE.md` |
| `team/<person>/` | README (status and blockers), LOG and notes for each person |
| `docs/BOARD.md`, `scripts/board.py`, `docs/board/seed-tasks.csv`, `docs/board/requirements.csv` | The board: design, tool, 15 plan-level cards and the general requirements |
| `team/eng1/notes/board-browser-setup.md` | Prompt that builds the board views and workflows in the browser |
| `docs/board/issue-templates/` | Task, requirement, bug, finding and question templates (`board.py init` copies them to `.github/ISSUE_TEMPLATE/`) |
| `CHANGELOG.md` | Written by Eng 1 at every merge into `main` |
| `.gitignore`, `LICENSE` | No secrets in the repository; MIT license (the submission requires a public link) |

## Saturday 9:00 · Eng 1 (10 minutes)
```bash
# 1. Create an EMPTY PUBLIC repository on GitHub (no README, no license)
git clone <url> hemoso && cd hemoso
cp -r ~/Code/hemoso-hackathon/. .
sh scripts/setup.sh main "<Your name>" "<your GitHub email>"
git add . && git commit -m "chore: set up repository"
git push -u origin main
sh scripts/setup.sh eng1 "<Your name>" "<your GitHub email>"
# 2. Create the board and load the cards: see docs/BOARD.md; views and workflows with team/eng1/notes/board-browser-setup.md (about 15 minutes)
# 3. Share the repository and board URLs in the team chat
```

## Saturday 9:10 · everyone else
```bash
git clone <url> hemoso && cd hemoso
sh scripts/setup.sh <your-branch> "<Your name>" "<your GitHub email>"
opencode                       # Tab until you see your agent
```
First message to the agent: "Read AGENTS.md, docs/CHALLENGE.md and your agent file,
and tell me in 5 lines what I have to do until 12:00."

## Notes
- Field names follow the current opencode docs (`permission`, `bash`). In
  version 2 they change (`permissions`, `shell`): check the installed version tonight.
- Commits without any AI trace: covered by the rule in `AGENTS.md`, the
  `.githooks/commit-msg` hook and `.claude/settings.json`. Check with
  `git log -1 --format=%B` before every push.
- Model API keys go in environment variables or `.env`, never in the repository.
