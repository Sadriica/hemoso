"""Builds your status line for the team chat from the board, and can write it
into team/<you>/README.md.

  python scripts/status.py               # person taken from your branch
  python scripts/status.py bio1          # any person
  python scripts/status.py --write       # also update "Current status" and "Blockers" in your README

Line format (STANDARDS.md): [bio1] ready · done: … · next: … · blocked: …
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import board  # noqa: E402

ORDER = {s[0]: i for i, s in enumerate(board.STATUS)}


def ref(title: str) -> str:
    m = re.match(r"\[([^\]]+)\]\s*(.*)", title)
    return m.group(1) if m else title[:40]


def short(title: str) -> str:
    m = re.match(r"\[[^\]]+\]\s*(.*)", title)
    return (m.group(1) if m else title)[:60]


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("person", nargs="?")
    p.add_argument("--write", action="store_true")
    a = p.parse_args()
    person = a.person
    if not person:
        branch = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
        m = re.match(r"^(?:fix/)?(bio[12]|phys|eng[12])", branch)
        if not m:
            sys.exit("Say who: python scripts/status.py bio1")
        person = m.group(1)

    conf = board.load_conf()
    mine = {d["number"] for d in board.gh("issue", "list", "-R", conf["repo"], "--label", person, "--state", "all",
                                          "--json", "number", "-L", "500", as_json=True)}
    groups: dict[str, list] = {s[0]: [] for s in board.STATUS}
    for it in board.items(conf):
        c = it.get("content") or {}
        if c.get("number") not in mine:
            continue
        st = str(board.field_value(it, "Status") or "Todo")
        groups.setdefault(st, []).append((str(board.field_value(it, "Block") or ""), c.get("number"), c.get("title", "")))
    for g in groups.values():
        g.sort()

    done = groups.get("Review", []) + groups.get("Done", [])
    doing = groups.get("In progress", [])
    nxt = doing + groups.get("Todo", [])[:2]
    blocked = groups.get("Blocked", [])
    j = lambda rows: ", ".join(ref(t) for _, _, t in rows) or "none"  # noqa: E731
    line = (f"[{person}] ready · done: {len(done)} ({j(done[-5:])}) · next: {j(nxt)} · blocked: {j(blocked)}")
    print(line)

    if a.write:
        readme = Path(f"team/{person}/README.md")
        text = readme.read_text(encoding="utf-8")
        now = datetime.now().strftime("%a %H:%M")
        lst = lambda rows: "; ".join(f"#{n} {short(t)}" for _, n, t in rows) or "none"  # noqa: E731
        status = (f"## Current status\n_Update before every checkpoint and at every shift change._\n\n"
                  f"- **Time:** {now}\n- **Done:** {lst(done)}\n- **In progress:** {lst(doing)}\n"
                  f"- **Next:** {lst(groups.get('Todo', [])[:3])}\n- **Chat line:** `{line}`\n\n")
        blockers = "## Blockers\n" + ("".join(f"- #{n} {short(t)}: see the card comment\n" for _, n, t in blocked)
                                      or "- None\n") + "\n"
        text = re.sub(r"## Current status\n.*?(?=## Blockers)", status, text, flags=re.S)
        text = re.sub(r"## Blockers\n.*?(?=## |\Z)", blockers, text, flags=re.S)
        readme.write_text(text, encoding="utf-8")
        print(f"Updated {readme}. Commit it with: git add {readme} && git commit -m \"docs({person}): update status\"")


if __name__ == "__main__":
    main()
