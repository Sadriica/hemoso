# HeMoSo · shared rules for every agent

HeMoSo is the product of team ReTardis for NASA Space Apps 2026 (Medellín,
November 14-15). We chose the challenge "Create Health Monitoring Software for
Astronauts on Space Missions" (`docs/CHALLENGE.md`). **The solution does not exist yet:** it is
designed and built from 9:00 on Saturday. Before that, this repository holds
only the team's work plan and tooling (Space Apps rules: teams may study the
challenges and prepare, but may not start working on them before the event).

## Rules for any health content
- Possible conditions are shown as probabilities with what they are based on,
  never as a certainty: no "you have X". The CMO or flight surgeon confirms.
- Never present the tool as a replacement for the flight surgeon (the physician
  on Earth) or the crew medical officer (CMO) on board.
- Every medical statement carries a source with a link, or is marked "Assumption".

## Repository map
- `docs/CHALLENGE.md`: what the challenge and the guides ask, read before the event.
- `docs/requirements.md` and `docs/board/requirements.csv`: general requirements
  from the statement and the guides (Eng 1 keeps them).
- `config/`: health content and data (biologists and Phys). Its files and formats are
  agreed on Saturday 9:00 to 10:00 in `FORMATS.md`.
- `backend/`, `frontend/`: code (engineers), written from Saturday 9:00.
- `docs/`: setup, board, stack, deploy, decisions, sources, NASA data, and
  `docs/findings/` (one file per finding, see `STANDARDS.md`).
- `team/`: one personal folder per person (status, log, notes).
- Team of five: Bio 1, Bio 2 (biologists), Phys (physics engineer, research),
  Eng 1 (Wambi) and Eng 2 (Juli).
- `submission/`: pitch script, slides, video and submission text.
- `scripts/`: team scripts (table below).
- `docs/DECISIONS.md`: decisions and rejected options, with the reason. Check it
  before proposing a tool, and add a row for each new decision.
- Anything we add or build must serve a requirement (REQ-xx) or a task (T-xx).
- Units, numbers, dates, citations, findings and status messages follow `STANDARDS.md`.

## Language
Everything in the repository is written in English: code, comments, file and
folder names, identifiers, config content, docs, commit messages, branch
names, tags and the CHANGELOG. You may talk with your person in Spanish in the
chat, but every file you write is in English.

## Rules
1. Write only in the paths you own (listed in your agent file). If something
   outside them needs to change, say so and do not change it.
2. One change at a time. Explain what you changed and why in 2 or 3 sentences.
3. Every medical statement carries a source with a link. If there is none,
   mark it "Assumption". Never invent a reference, an author or a number.
4. Open a link before citing it and confirm it says what you claim.
5. Language for the astronaut: short sentences, plain words, no jargon.
6. After a change in `config/` or the code, run the tests that exist (the
   commands are in `README.md`, "Run and test").
7. Record every decision in `team/<person>/LOG.md`: time, what, why, source.
8. Nothing we write may sound like AI or mention it (rule 9 and the
   `human-writing` skill). AI use is recorded only in each person's log,
   because the submission page requires an AI-use disclosure and Bio 2 writes
   it from those logs.
9. Human writing: direct sentences, no filler ("Certainly!", "In summary",
   "It's worth noting"), no emojis, no padded lists, no empty adjectives
   ("robust", "innovative", "seamless", "cutting-edge"), no signatures.

## Board
All work is a card on the GitHub Projects board (`docs/BOARD.md`), handled
with `python scripts/board.py` and the `kanban` skill.
- Each agent moves its person's cards: Todo → In progress → Review (or Blocked).
- Only Eng 1 (Wambi) moves task cards to Done, through the merge and
  `board.py sync`; only he writes the CHANGELOG.
- Only Eng 1 (Wambi) moves requirement cards.
- Every commit mentions its card (`(#12)`); the one that finishes it says `closes #12`.

## Personal folder: `team/<person>/`
Each person has `team/bio1/`, `team/bio2/`, `team/phys/`, `team/eng1/` and `team/eng2/` with:
- `README.md`: role, owned paths, **current status** and **blockers**.
  Updated before every checkpoint and at every shift change.
- `LOG.md`: one entry per decision: time, what, why, source, whether AI was
  used. Private to the team; it only feeds the mandatory submission disclosure.
- `notes/`: drafts and searches that are not part of the product yet.
The product does NOT live in `team/`: the app only reads `config/`,
`backend/` and `frontend/`.

## Git: branches, commits and push

### Branches
| Branch | Who | Purpose |
| --- | --- | --- |
| `main` | Only Eng 1 merges here | Always works; it is what we submit |
| `bio1`, `bio2`, `phys`, `eng1`, `eng2` | Each person on their own | Daily work |
| `fix/<person>-<topic>` | From Sunday 8:00 | Fixes only, branched from `main` |

Nobody commits directly to `main`. Nobody works on someone else's branch.

### Before any commit, the agent checks
1. `git branch --show-current` is the person's branch. If not, stop and say so.
2. `git status` only shows files inside the person's paths (listed in the
   agent file). If any other file is modified, stop and ask.

### How to save (every 30 to 45 minutes, or when something is done)
```bash
git add <owned paths, one by one>      # never "git add ." or "git add -A"
git commit -m "<type>(<area>): <what changed, in one sentence>"
git push
```
- Types: `content`, `data`, `config`, `docs`, `submission`, `feat`, `fix`, `test`, `chore`.
- Examples: `docs(requirements): add REQ-03 from the judging guide (#5)`,
  `content(sleep): add measurement steps with sources (#14)`,
  `feat(api): add health check route (#9)`.
- The commit author is always the person: their git `user.name` and
  `user.email`. The agent NEVER adds itself as author, co-author or
  collaborator: no `Co-Authored-By`, `Generated with`, `Assisted-by`,
  signatures, emojis or mentions of AI in commits, branches, tags, code
  comments, READMEs or product text.
- Message in English, imperative mood, first line at most 72 characters.
- The agent shows each command and waits for confirmation before running it.

### First time (Saturday 9:00, each person)
```bash
git clone <repository url> hemoso && cd hemoso
sh scripts/setup.sh <your-branch> "<Your name>" "<your GitHub email>"
```
The script sets your name and email as author, enables the hook that cleans
commit messages, creates `.claude/settings.json` without attribution, and
creates and pushes your branch (`bio1`, `bio2`, `phys`, `eng1` or `eng2`).

### Pull the latest main (after each checkpoint)
```bash
git fetch origin
git merge origin/main
```
On a conflict:
- In files you do NOT own: keep the `main` version
  (`git checkout --theirs <file> && git add <file>`), then `git commit`.
- In files you own: stop and call Eng 1. The agent does not resolve
  conflicts on its own.

### Checkpoints (Sat 12:00, Sat 17:00, Sun 8:00 and Sun 13:00)
Internal freeze: Sunday 13:30. Official close: Sunday 23:59 local time
(https://www.spaceappschallenge.org/2026/); any earlier local cut is confirmed
with the Medellín lead.
- 15 minutes before, each person updates `team/<person>/README.md`, commits,
  pushes and posts "ready" in the team chat.
- Eng 1 merges in this order: `phys`, `bio1`, `bio2`, `eng2`, `eng1`.
  After each merge, run the tests; if they fail, undo that merge and tell the
  owner. Then write `CHANGELOG.md`, tag (`cp1`, `cp2`, `cp3`, `submission`) and
  push `main` with its tags.
- Then everyone pulls `main` into their branch.

### Tool settings (any agent)
If your tool adds attribution on its own, turn it off before working. In
Claude Code it lives in `.claude/settings.json` (created by `scripts/setup.sh`):
```json
{ "attribution": { "commit": "", "pr": "" }, "includeCoAuthoredBy": false }
```
In opencode or any other tool, find the equivalent option and turn it off. If
there is none, the `.githooks/commit-msg` hook cleans the message anyway.

### Before every push
`python scripts/precheck.py` must say "OK to push". It checks your branch, that
every changed file is inside your paths, and that commit messages have no
co-authors, signatures or AI mentions.

### Forbidden
- `git push --force`, `git reset --hard`, `git rebase` on shared branches.
- Committing `.env`, API keys, passwords or real personal data.
- Committing someone else's files, `node_modules/` or `.venv/`.
- Deleting branches or tags.

## Team scripts (run from the repository root)
| Script | Who | What it does |
| --- | --- | --- |
| `scripts/precheck.py` | Everyone, before every push | Branch, owned paths, clean commit messages, secrets |
| `scripts/si_use.py [--check]` | Eng 1 | SI-USE.md from the SI log; `--check` verifies it is up to date |
| `scripts/status.py [--write]` | Everyone, before every checkpoint | Status line for the chat from the board; `--write` puts it in `team/<you>/README.md` |
| `scripts/now.py [--at "Sat 15:20"]` | Timekeeper, anyone | Current block, next checkpoint and event, open P0 cards of the block |
| `scripts/board.py` | Everyone | The board (`docs/BOARD.md`); `export` makes a CSV backup |
| `scripts/new_finding.py <bio1, bio2 or phys> "<topic>" [--board]` | Bio 1, Bio 2, Phys | Next finding file from the template, and its card |
| `scripts/new_config.py <phys, bio2, or bio1 <indicator_id>...>` | Bio 1, Bio 2, Phys | Your empty `config/` files with the exact columns and headings of `FORMATS.md`; never overwrites |
| `scripts/check_sources.py [--offline] [--add]` | Phys, anyone | Broken links in `config/` and `docs/findings/`, and links missing from `docs/sources.md` |
| `scripts/check_content.py [--strict]` | Everyone, before every merge | The config files against `FORMATS.md` |
| `scripts/requirements_report.py [--write]` | Eng 1 | Requirement status from the board (P0 done, by type) into `docs/requirements.md` |

## Reference sources for everyone
- 2026 challenges: https://www.spaceappschallenge.org/2026/challenges/
- NASA human spaceflight risks (HRP): https://www.nasa.gov/hrp/risks
- Human Research Roadmap: https://humanresearchroadmap.nasa.gov/
- NASA Technical Reports Server: https://ntrs.nasa.gov/
- NASA Open Science Data Repository: https://osdr.nasa.gov/
- Submission guide: https://www.spaceappschallenge.org/resources/project-submission-guide/
- Judging guide: https://www.spaceappschallenge.org/resources/judging-awards-guide
