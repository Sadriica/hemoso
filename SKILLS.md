# Team skills

Skills are instructions an agent loads when it needs them. Each agent only sees
its own (the `skill` permission in its agent file).

## Team skills (included in `.opencode/skills/`)

| Skill | Purpose | bio1 | bio2 | phys | eng1 | eng2 | reviewer |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `hemoso-git` | Save progress, pull main, conflicts, authorship | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `verify-sources` | Find, open, verify and cite; when to mark an Assumption | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `human-writing` | Everything reads as written by a person | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `checkpoint` | What to do 15 minutes before each checkpoint | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `kanban` | Read and move cards on the board with `scripts/board.py` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `report-finding` | One-page finding: claim, evidence, confidence, what it changes | ✓ | ✓ | ✓ | | | ✓ |
| `nasa-data` | Document the NASA data we use (global award requirement) | | | ✓ | | | |
| `challenge-requirements` | Statement and guides → requirements with IDs and classes | | | | ✓ | |  |
| `pitch-and-submission` | Script, 7 slides, 30 s video, submission page | ✓ | ✓ | | | |  |
| `merge-to-main` | Merge, test, tag and changelog | | | | ✓ | |  |
| `demo-and-screenshots` | Demo path, end-to-end and accessibility tests, screenshots, public link | | | | | ✓ | |

Skills specific to the solution (formats check, content writing) are added on
Saturday once `FORMATS.md` exists.

## Recommended external skills (install tonight, after reading them)

Skills can ship scripts that run. Before installing one, open its `SKILL.md`
and its scripts and confirm they do what they claim.

| Skill | Repository | For |
| --- | --- | --- |
| `pdf` | https://github.com/anthropics/skills (folder `skills/pdf`) | Reading PDF papers: bio1, bio2, phys |
| `pptx` | https://github.com/anthropics/skills (folder `skills/pptx`) | Slides if they are built in PowerPoint: bio1 |
| `webapp-testing` | https://github.com/anthropics/skills (folder `skills/webapp-testing`) | Testing the app with Playwright: eng2 |
| `frontend-design` | https://github.com/anthropics/skills (folder `skills/frontend-design`) | A carefully designed interface: eng2 |
| `test-driven-development` | https://github.com/obra/superpowers | Tests first in the backend: eng1 |
| `systematic-debugging` | https://github.com/obra/superpowers | Methodical debugging: eng1, eng2 |
| `verification-before-completion` | https://github.com/obra/superpowers | Confirming something is really fixed: eng1 |
| `literature-review` | https://github.com/K-Dense-AI/claude-scientific-skills | Literature search and review: bio1, bio2, phys |

Global install (available in every project of that person):
```bash
mkdir -p ~/.config/opencode/skills
git clone --depth 1 https://github.com/anthropics/skills /tmp/sk-anthropic
git clone --depth 1 https://github.com/obra/superpowers /tmp/sk-superpowers
git clone --depth 1 https://github.com/K-Dense-AI/claude-scientific-skills /tmp/sk-kdense
# read each SKILL.md before copying; copy only the ones for your role, e.g.:
cp -r /tmp/sk-anthropic/skills/pdf ~/.config/opencode/skills/
cp -r /tmp/sk-superpowers/skills/systematic-debugging ~/.config/opencode/skills/
```
If a skill's folder has a different name in its repository, use the value of
its `name:` field. The agents already allow these skills: if they are not
installed, they simply do not show up.

Careful: if an external skill suggests adding signatures or co-author lines to
commits, the team rule in `AGENTS.md` wins, and the hook strips them anyway.
