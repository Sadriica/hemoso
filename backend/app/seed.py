"""Load the synthetic demo data (REQ-29) into the entry store (REQ-27).

config/data/demo_data.csv holds one measurement per row, in the same columns the
app stores for a real entry. This module reads it, keeps only the valid rows,
and adds each once. Run it with `uv run python -m app.seed`.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from pydantic import ValidationError

from . import storage
from .indicators import config_dir, validate_against_indicators
from .models import Entry

_DEMO_FILE = "demo_data.csv"


def _validation_reason(error: ValidationError) -> str:
    """A short reason for one invalid Entry, naming the first offending field."""
    errors = error.errors()
    if not errors:
        return "invalid row"
    loc = errors[0].get("loc", ())
    field = str(loc[0]) if loc else "row"
    return f"invalid {field}"


def _key(entry: Entry) -> tuple[str, str, int, str]:
    return (entry.person_id, entry.indicator_id, entry.mission_day, entry.time)


def load_demo_data(store: storage.Storage, path: Path) -> tuple[int, int, list[str]]:
    """Add the valid rows of `path` to `store`; return (added, skipped, reasons).

    Each row must pass the Entry model and match its indicator in
    data/indicators.csv. A row whose (person_id, indicator_id, mission_day,
    time) is already in the store's history is skipped, so the same file never
    adds a measurement twice.
    """
    added = 0
    skipped = 0
    reasons: list[str] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for line_no, row in enumerate(csv.DictReader(handle), start=2):
            try:
                entry = Entry(**row)
            except ValidationError as error:
                skipped += 1
                reasons.append(f"line {line_no}: {_validation_reason(error)}")
                continue
            error = validate_against_indicators(entry)
            if error is not None:
                skipped += 1
                reasons.append(f"line {line_no}: {error}")
                continue
            existing = store.history(entry.person_id, entry.indicator_id)
            if any(_key(prior) == _key(entry) for prior in existing):
                skipped += 1
                reasons.append(f"line {line_no}: duplicate")
                continue
            store.add(entry)
            added += 1
    return added, skipped, reasons


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="app.seed",
        description="Load config/data/demo_data.csv into the entry store.",
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=None,
        help=f"path to demo_data.csv (default: CONFIG_DIR/data/{_DEMO_FILE})",
    )
    args = parser.parse_args(argv)
    path = args.path if args.path is not None else config_dir() / "data" / _DEMO_FILE
    if not path.exists():
        print(f"demo data file not found at {path}")
        return 0
    store = storage.get_storage()
    added, skipped, reasons = load_demo_data(store, path)
    print(f"added {added}, skipped {skipped}")
    for reason in reasons:
        print(f"  {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
