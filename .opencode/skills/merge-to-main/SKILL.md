---
name: merge-to-main
description: "Eng 1's procedure to merge the team's branches into main at each checkpoint, test, tag and write the changelog."
---
# Merge to main

One branch at a time, showing each command and waiting for confirmation:
```bash
git switch main && git pull origin main
python scripts/board.py pr phys --checkpoint "Checkpoint 1"   # PR listing "closes #N" for phys's Review cards
git fetch origin phys && git merge --no-ff --no-commit origin/phys   # local trial merge
# tests: (cd backend && uv run pytest -q) and (cd frontend && pnpm build)
# content: python scripts/check_content.py (once it exists)
# if they fail: git merge --abort, comment on the PR and tell the owner
git merge --abort && gh pr merge phys --merge && git pull origin main
```
Order: `phys`, `bio1`, `bio2`, `eng2`, `eng1`.

Then:
```bash
git tag cp1            # cp2, cp3, submission
git push origin main --tags
python scripts/board.py sync     # cards closed by the PRs move to Done
```
- `CHANGELOG.md`: one section per checkpoint, one line per person.
- Conflict in files of a single person: that person's version wins.
- From Sunday 8:00, only `fix/...` branches.
- Post in the chat: "main updated, pull main".
