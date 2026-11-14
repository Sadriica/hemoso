"""Checks before every push. Run it from the repository root:

  python scripts/precheck.py

It checks that:
  1. you are on your own branch (bio1, bio2, phys, eng1, eng2, or fix/<you>-<topic>), not main;
  2. every changed, staged or unpushed file is inside the paths you own;
  3. unpushed commit messages have no co-authors, signatures or AI mentions,
     a first line of 72 characters at most; a missing card number (#N) is
     reported as a note, not a block;
  4. if anything in config/ changed and the team's content check exists, it passes;
  5. none of the changed or unpushed files is a .env file (other than
     .env.example) or holds a secret: a private key header, a GitHub token, a
     JWT-shaped string (Supabase keys look like this) or a non-empty Supabase key.
Exits with code 1 when something must be fixed before pushing.
"""

from __future__ import annotations

import fnmatch
import os
import re
import subprocess
import sys
from pathlib import Path

OWNED = {
    # Paths match the agent files. If FORMATS.md moves the config folders on
    # Saturday, update both the same hour.
    "bio1": ["config/content/*", "submission/script.md", "submission/slides.md", "submission/video.md",
             "submission/slides/*", "team/bio1/*", "docs/findings/bio1-*.md"],
    "bio2": ["config/rules/*", "submission/submission.md", "submission/README.md", "team/bio2/*",
             "docs/findings/bio2-*.md"],
    "phys": ["config/data/*", "docs/sources.md", "docs/nasa_data.md", "team/phys/*", "docs/findings/phys-*.md"],
    "eng1": ["docs/CHALLENGE.md", "docs/requirements.md", "docs/board/requirements.csv", "backend/*", "scripts/*", "FORMATS.md", "README.md", "CHANGELOG.md", "config/README.md", "SI-USE.md",
             ".github/*", "team/eng1/*", "docs/BOARD.md", "docs/SETUP.md", "docs/STACK.md", "docs/DEPLOY.md",
             "docs/PRIVACY.md", "docs/DECISIONS.md", "docs/README.md", "docs/CONTRACTS.md", "docs/API.md", "docs/openapi.json", "docs/deploy/*",
             "docs/board/seed-tasks.csv", "docs/board/issue-templates/*", "docs/findings/TEMPLATE.md",
             # Shared team files: only the integrator edits them.
             "AGENTS.md", "CLAUDE.md", "STANDARDS.md", "SKILLS.md", "opencode.json", ".opencode/*",
             ".claude/*", ".githooks/*", ".gitignore", "LICENSE"],
    "eng2": ["frontend/*", "team/eng2/*"],
}
FORBIDDEN = re.compile(
    r"co-authored-by|generated (with|by)|assisted-by|asistido-por|(?<!\.)claude(?!\.md)|chatgpt|openai|copilot|"
    r"gemini|anthropic|deepseek|\bgpt\b|\bllm\b|(?-i:\bAI\b)|artificial intelligence|🤖|signed-off-by",
    re.I)  # "AI" only in capitals, so words such as "said" or "detail" never match

# Secrets that must never reach the repository. The rules name the file and the
# kind of secret, never the value, so the report can be pasted into the chat.
MAX_SECRET_FILE_BYTES = 1_000_000  # skip files larger than 1 MB
_PRIVATE_KEY_RE = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")
_GITHUB_TOKEN_RE = re.compile(r"(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]{8,}")
_SB_SECRET_RE = re.compile(r"\bsb_secret_[A-Za-z0-9_-]{10,}")
_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_.-]{98,}")  # longer than 100 characters
_SUPABASE_KEY_RE = re.compile(
    r"^\s*(?:export\s+)?(?:SUPABASE_KEY|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*)$")


def run(*cmd: str) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return p.stdout.rstrip() if p.returncode == 0 else ""


def owns(person: str, path: str) -> bool:
    return any(fnmatch.fnmatch(path, pat) for pat in OWNED.get(person, []))


def scan_text(text: str) -> str | None:
    """The first secret rule the text breaks, or None if it is clean."""
    if _PRIVATE_KEY_RE.search(text):
        return "private key header"
    if _GITHUB_TOKEN_RE.search(text):
        return "GitHub token"
    if _SB_SECRET_RE.search(text):
        return "Supabase secret key (sb_secret_)"
    for line in text.splitlines():
        m = _SUPABASE_KEY_RE.match(line)
        if m:
            value = m.group(1).strip()
            if value.strip('"\'') == "":
                continue
            return "Supabase key set to a non-empty value"
    if _JWT_RE.search(text):
        return "JWT-shaped secret (Supabase key)"
    return None


def secret_rule(path: str) -> str | None:
    """The first secret rule a file breaks, or None if it is clean.

    Skips binary files and files over MAX_SECRET_FILE_BYTES. Reports the rule,
    never the secret itself.
    """
    name = Path(path).name
    if name == ".env" or (name.startswith(".env.") and name != ".env.example"):
        return "env file (only .env.example may be committed)"
    try:
        if Path(path).stat().st_size > MAX_SECRET_FILE_BYTES:
            return None
        data = Path(path).read_bytes()
    except OSError:
        return None  # deleted or unreadable; nothing will be pushed from it
    if b"\x00" in data[:8192]:
        return None  # binary
    return scan_text(data.decode("utf-8", errors="replace"))


def committed_secrets(log_args: list[str]) -> list[tuple[str, str]]:
    """(file, rule) pairs for secrets in the added lines of the person's own commits.

    Binary diffs have no ``+++ b/`` header or added ``+`` lines, so they are
    skipped naturally. Reports the file and the rule, never the value.
    """
    diff = run("git", "log", "-p", "--no-merges", "--format=", *log_args)
    if not diff:
        return []
    found: list[tuple[str, str]] = []
    current = ""
    for line in diff.splitlines():
        if line.startswith("+++ b/"):
            current = line[len("+++ b/"):]
        elif line.startswith("+") and not line.startswith("+++") and current:
            rule = scan_text(line[1:])
            if rule:
                found.append((current, rule))
    return found


def main() -> int:
    top = run("git", "rev-parse", "--show-toplevel")
    if top:
        os.chdir(top)

    problems, notes = [], []
    branch = run("git", "branch", "--show-current")
    m = re.match(r"^(?:fix/)?(bio[12]|phys|eng[12])(?:-.*)?$", branch)
    if not m:
        print(f"FAIL  branch '{branch}' is not a personal branch (bio1, bio2, phys, eng1, eng2 or fix/<you>-<topic>).")
        print("      Switch to yours: git switch <your-branch>")
        return 1
    person = m.group(1)
    print(f"Branch {branch} · person {person}")

    changed = set(run("git", "status", "--porcelain").splitlines())
    files = {line[3:].split(" -> ")[-1].strip('"') for line in changed if line.strip()}
    working_files = set(files)  # staged and unstaged changes only
    upstream = run("git", "rev-parse", "--abbrev-ref", "@{u}")
    base = upstream or run("git", "merge-base", "HEAD", "origin/main") or run("git", "merge-base", "HEAD", "main") or ""
    origin_main = run("git", "rev-parse", "--verify", "origin/main") or ""
    # The person's own commits: <base>..HEAD minus everything reachable from
    # origin/main. Merge commits are never the person's own work either.
    own_range = [f"{base}..HEAD"] if base else ["-5"]
    if origin_main:
        own_range.append("^origin/main")
    # Commits that came in by merging another person's branch (for example
    # origin/eng1 before it reaches main) are theirs, not yours.
    for other in ("bio1", "bio2", "phys", "eng1", "eng2"):
        if other != person and run("git", "rev-parse", "--verify", "--quiet", f"origin/{other}"):
            own_range.append(f"^origin/{other}")
    if base:
        if origin_main:
            files |= {f for f in run("git", "log", "--no-merges", "--format=", "--name-only", *own_range).splitlines() if f}
        else:
            files |= set(run("git", "diff", "--name-only", f"{base}..HEAD").splitlines())
    foreign = sorted(f for f in files if f and not owns(person, f))
    if foreign:
        problems.append("files outside your paths:\n        " + "\n        ".join(foreign)
                        + "\n      Undo them (git restore <file>) or ask their owner.")
    print(f"Files changed or not pushed: {len(files)}")

    for f in sorted(working_files):
        rule = secret_rule(f)
        if rule:
            problems.append(f"secret in '{f}': {rule}")
    for f, rule in committed_secrets(own_range):
        problems.append(f"secret in '{f}': {rule}")

    log_args = ["--format=%H%x00%B%x01"]
    if origin_main:
        log_args.append("--no-merges")
    log_args += own_range
    messages = run("git", "log", *log_args).split("\x01")
    for raw in messages:
        if "\x00" not in raw:
            continue
        sha, body = raw.strip().split("\x00", 1)
        first = body.strip().splitlines()[0] if body.strip() else ""
        if FORBIDDEN.search(body):
            problems.append(f"commit {sha[:7]} mentions a co-author, signature or AI: '{first}'")
        if len(first) > 72:
            problems.append(f"commit {sha[:7]} first line has {len(first)} characters (72 max)")
        if not re.search(r"#\d+", body) and not first.lower().startswith("merge"):
            notes.append(f"commit {sha[:7]} does not mention its card (#N): '{first}'")

    # The content check is written on Saturday with FORMATS.md (scripts/check_content.py).
    checker = Path("scripts/check_content.py")
    if any(f.startswith("config/") for f in files) and checker.exists():
        p = subprocess.run([sys.executable, str(checker)], capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        if p.returncode != 0:
            problems.append("check_content fails:\n" + p.stdout.strip())
        else:
            print("check_content: OK")

    for n in notes:
        print(f"WARN  {n}")
    for pr in problems:
        print(f"FAIL  {pr}")
    if problems:
        print("\nFix the FAIL lines before pushing.")
        return 1
    print("\nOK to push.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
