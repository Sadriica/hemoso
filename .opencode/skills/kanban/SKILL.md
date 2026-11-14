---
name: kanban
description: "How to read and move cards on the team's GitHub Projects board with scripts/board.py: list your cards, start one, send it to review, block it, or create a new one."
---
# Board

Rules, statuses and fields are in `docs/BOARD.md`. Run everything from the repository root.

## Your cards
```bash
python scripts/board.py list --person <branch>
python scripts/board.py list --status Review
```

## The flow for the person you work with
1. Starting work: pick a Todo card of theirs and move it:
   `python scripts/board.py move <N> "In progress"`. At most 2 in progress.
2. Every commit mentions the card: `docs(requirements): add the submission rules (#<N>)`.
3. The commit that finishes the card adds `closes #<N>` on its second line,
   then: `python scripts/board.py move <N> Review`, and tell the reviewer.
4. Stuck: `python scripts/board.py move <N> Blocked`, add a one-line comment
   with `gh issue comment <N> --body "Blocked: <reason>"` and update the
   Blockers section of `team/<branch>/README.md`.
5. New work that is not on the board:
   `python scripts/board.py new "<title>" --person <branch> --work <Research|Content|Data|Backend|Frontend|Testing|Requirements|Pitch|Submission|Ops> --block <B1..B4> --priority <P0|P1|P2> --done-when "<one checkable sentence>"`.

## Never
- Move a card to Done (only Wambi, when it is merged into `main`).
- Move requirement cards (`type:requirement`): only Eng 1 (Wambi) does.
- Move or edit someone else's cards.
- Write anything on the board that mentions AI or carries a signature.

Show every command and wait for confirmation, as with git.
