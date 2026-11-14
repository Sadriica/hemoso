"""Regenerate the SI table in SI-USE.md from team/eng1/notes/si-use-log.md.

Run from the repository root:

  python scripts/si_use.py           # write the table into SI-USE.md
  python scripts/si_use.py --check   # exit 1 if SI-USE.md is out of date

Only the markdown table between the two marker comments in SI-USE.md is
replaced; the rest of the file is left untouched. The table is copied from the
log so nobody copies rows by hand.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOG = ROOT / "team" / "eng1" / "notes" / "si-use-log.md"
TARGET = ROOT / "SI-USE.md"

START = "<!-- SI-USE-TABLE:START -->"
END = "<!-- SI-USE-TABLE:END -->"


def log_table() -> str:
    """Return the log's SI table: header, separator and data rows."""
    lines = LOG.read_text(encoding="utf-8").splitlines()
    table = [line for line in lines if line.strip().startswith("|")]
    if not table:
        sys.exit(f"error: no table rows found in {LOG}")
    return "\n".join(table)


def render(text: str) -> str:
    """Replace the text between the markers in SI-USE.md with the log's table."""
    start = text.index(START)
    end = text.index(END, start) + len(END)
    block = f"{START}\n{log_table()}\n{END}"
    return text[:start] + block + text[end:]


def main(argv: list[str]) -> int:
    check = "--check" in argv
    try:
        current = TARGET.read_text(encoding="utf-8")
        wanted = render(current)
    except ValueError:
        print(f"error: {TARGET} is missing the markers {START!r} and {END!r}")
        return 1
    if current == wanted:
        print("SI-USE.md is up to date.")
        return 0
    if check:
        print("SI-USE.md is out of date; run: python scripts/si_use.py")
        return 1
    TARGET.write_text(wanted, encoding="utf-8")
    print("Wrote the SI table into SI-USE.md from team/eng1/notes/si-use-log.md")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
