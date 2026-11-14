---
name: checkpoint
description: "What to do 15 minutes before each checkpoint (Sat 12:00 and 17:00, Sun 8:00 and 13:00): update the personal README, save progress and post ready."
---
# Checkpoint

1. `python scripts/status.py --write`: builds the status line from the board
   and writes "Current status" and "Blockers" in `team/<person>/README.md`.
   Read it with the person and fix anything the board does not know.
2. Add any missing decisions to `team/<person>/LOG.md`.
3. Check the board: your cards show the right status
   (`python scripts/board.py list --person <branch>`).
4. If `config/` changed: `python scripts/check_content.py` (once it exists), zero errors.
5. Save progress with the `hemoso-git` skill (add owned paths, commit,
   `python scripts/precheck.py`, push).
6. Remind the person to post the status line (printed by `status.py`) in the team chat:
   `[branch] ready · done: … · next: … · blocked: …` (`STANDARDS.md`, section 2).
7. When Eng 1 announces that `main` was merged: "pull main" (`hemoso-git` skill).

If something is not finished in time, do not push it half-done: write the
status in the README and continue in the next block.
