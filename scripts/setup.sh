#!/bin/sh
# Prepares each person's clone on Saturday at 9:00.
# Usage:  sh scripts/setup.sh <branch> "<Your name>" "<your GitHub email>"
#   <branch>: bio1, bio2, phys, eng1, eng2, or main (Eng 1 only, first commit)
set -e

branch="$1"; name="$2"; email="$3"
case "$branch" in
  bio1|bio2|phys|eng1|eng2|main) ;;
  *) echo "Invalid branch: '$branch'. Use bio1, bio2, phys, eng1, eng2 or main."; exit 1 ;;
esac
if [ -z "$name" ] || [ -z "$email" ]; then
  echo 'Usage: sh scripts/setup.sh <branch> "<Your name>" "<your GitHub email>"'; exit 1
fi

# 1. Authorship: commits belong to the person
git config user.name "$name"
git config user.email "$email"

# 2. Hook that strips automatic attribution from commit messages
chmod +x .githooks/commit-msg
git config core.hooksPath .githooks

# 3. Claude Code without attribution (in case someone uses it)
mkdir -p .claude
if [ ! -f .claude/settings.json ]; then
  printf '%s\n' '{ "attribution": { "commit": "", "pr": "" }, "includeCoAuthoredBy": false }' > .claude/settings.json
fi

# 4. Working branch
if [ "$branch" != "main" ]; then
  if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
    git switch "$branch"
  else
    git switch -c "$branch"
    git push -u origin "$branch"
  fi
fi

echo ""
echo "Done: $name on branch $(git branch --show-current)."
echo "Next: open opencode, press Tab until you see your agent ($branch) and ask it:"
echo "  \"Read AGENTS.md, FORMATS.md and your agent file, and tell me in 5 lines what I have to do until 12:00.\""
