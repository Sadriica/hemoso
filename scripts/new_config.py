"""Create empty config files with the exact structure from FORMATS.md.

Run from the repository root:

  python scripts/new_config.py phys                       # data files
  python scripts/new_config.py bio2                       # rules files
  python scripts/new_config.py bio1 heart_rate sleep      # content files

Each CSV file is written with its header line only, and each content file with
its fixed headings and nothing under them. No medical content, values,
thresholds or sources are written. Existing files are left as is.

The headers, the headings and the id pattern come from check_content.py, so
the two can never drift.
"""

from __future__ import annotations

import csv
import io
import sys
from pathlib import Path

import check_content

# The files each person creates, with the header borrowed from check_content.py.
PERSON_FILES = {
    "phys": [
        ("config/data/indicators.csv", check_content.INDICATORS_HEADER),
        ("config/data/demo_ranges.csv", check_content.DEMO_RANGES_HEADER),
        ("config/data/demo_data.csv", check_content.DEMO_DATA_HEADER),
    ],
    "bio2": [
        ("config/rules/attention.csv", check_content.ATTENTION_HEADER),
        ("config/rules/conditions.csv", check_content.CONDITIONS_HEADER),
    ],
}

CONTENT_DIR = "config/content"

USAGE = (
    "usage: python scripts/new_config.py phys\n"
    "       python scripts/new_config.py bio2\n"
    "       python scripts/new_config.py bio1 <indicator_id> [<indicator_id> ...]\n"
)


def csv_header_line(header: list[str]) -> str:
    """The header as one CSV line ending in a newline, never translated."""
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerow(header)
    return buf.getvalue()


def content_text(indicator_id: str) -> str:
    """The headings of one content file: the name placeholder plus the H2s."""
    lines = [f"# {indicator_id}"]
    for heading in check_content.EXPECTED_H2:
        lines.extend(["", f"## {heading}"])
        if heading == "Status and next steps":
            for state in check_content.BASELINE_STATES_REQUIRED:
                lines.extend(["", f"### {state}"])
    return "\n".join(lines) + "\n"


def create_file(root: Path, rel: str, text: str) -> None:
    """Write ``text`` to ``root/rel`` as UTF-8, no BOM, LF only, unless it exists."""
    path = root / rel
    if path.exists():
        print(f"exists, left as is: {rel}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    print(f"created: {rel}")


def create_person_files(root: Path, person: str) -> None:
    for rel, header in PERSON_FILES[person]:
        create_file(root, rel, csv_header_line(header))


def create_content_files(root: Path, ids: list[str]) -> bool:
    """Create one content file per id; return False if any id was invalid."""
    ok = True
    for iid in ids:
        if not check_content.ID_RE.match(iid):
            print(
                f"error: invalid indicator id '{iid}', must be lowercase snake_case",
                file=sys.stderr,
            )
            ok = False
            continue
        create_file(root, f"{CONTENT_DIR}/{iid}.md", content_text(iid))
    return ok


def print_bio1_note() -> None:
    print("Note: replace the '# <id>' heading with the indicator name, write the")
    print("'### in_range' and '### outside_range' texts, and add one '### <level>'")
    print("heading under '## Status and next steps' for each attention_level of")
    print("that indicator in config/rules/attention.csv.")


def print_next_steps() -> None:
    print("Next: fill the rows as in FORMATS.md section 3, run")
    print("  python scripts/check_content.py")
    print("then save the files with your agent.")
    print("Before a checkpoint run python scripts/check_content.py --strict.")


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    root = Path(".")
    if args and args[0] == "--root":
        if len(args) < 2:
            sys.stderr.write(USAGE)
            return 2
        root = Path(args[1])
        args = args[2:]

    if not args:
        sys.stderr.write(USAGE)
        return 2

    person = args[0]
    if person in PERSON_FILES:
        if len(args) != 1:
            sys.stderr.write(USAGE)
            return 2
        create_person_files(root, person)
        print_next_steps()
        return 0

    if person == "bio1":
        ids = args[1:]
        if not ids:
            sys.stderr.write(USAGE)
            return 2
        if not create_content_files(root, ids):
            return 2
        print_bio1_note()
        print_next_steps()
        return 0

    sys.stderr.write(USAGE)
    return 2


if __name__ == "__main__":
    sys.exit(main())
