---
name: hemoso-git
description: "HeMoSo team git procedure: save progress (add, commit, push on your own branch), pull main after a checkpoint, and what to do on a conflict."
---
# Git in HeMoSo

The full detail is in `AGENTS.md`, section "Git". This is the sequence.

## "Save my progress"
1. `git branch --show-current` must be the person's branch. If not, stop.
2. `git status`. If files outside their paths are modified, stop and ask.
3. If `config/` changed and `scripts/check_content.py` exists (written on Saturday), run it and fix errors.
4. Propose, showing each command and waiting for confirmation:
   ```bash
   git add <owned path 1> <owned path 2>
   git commit -m "<type>(<area>): <what changed> (#<card>)"
   git push
   ```
5. The commit that finishes a card adds a second line `-m "closes #<card>"`,
   then the card goes to Review (`kanban` skill).
6. Message: English, imperative mood, one sentence, 72 characters at most.
   Types: `card`, `data`, `config`, `docs`, `submission`, `feat`, `fix`, `test`, `chore`.

## Authorship
The author is the person (their `user.name` and `user.email`). Never add a
co-author, `Co-Authored-By`, `Generated with`, a signature, an emoji or any
mention of AI to the message, the branch or tags.

## "Pull main"
```bash
git fetch origin
git merge origin/main
```
Conflict in a file the person does not own:
`git checkout --theirs <file> && git add <file>`, then `git commit`.
Conflict in an owned file: stop and ask them to call Eng 1.

## Never
`git add .`, `git add -A`, `git push --force`, `git reset --hard`,
`git rebase`, committing to `main`, committing `.env` or keys.

## Script
Before every push run `python scripts/precheck.py` and push only when it says "OK to push". If it lists files outside the person's paths, undo them with `git restore <file>` (or `git restore --staged <file>`) and tell the person.
