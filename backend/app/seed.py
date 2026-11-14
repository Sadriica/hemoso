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
from .models import Entry, entry_key

_DEMO_FILE = "demo_data.csv"
_EXPECTED_COLUMNS = (
    "person_id",
    "indicator_id",
    "value",
    "unit",
    "mission_day",
    "time",
)
_HEADER = ",".join(_EXPECTED_COLUMNS)


def _validation_reason(error: ValidationError) -> str:
    """A short reason for one invalid Entry, naming the first offending field."""
    errors = error.errors()
    if not errors:
        return "invalid row"
    loc = errors[0].get("loc", ())
    field = str(loc[0]) if loc else "row"
    return f"invalid {field}"


def load_demo_data(store: storage.Storage, path: Path) -> tuple[int, int, list[str]]:
    """Add the valid rows of `path` to `store`; return (added, skipped, reasons).

    The header must be exactly the six expected columns. Each row must have the
    same number of cells, pass the Entry model and match its indicator in
    data/indicators.csv. A row whose (person_id, indicator_id, mission_day,
    time) is already in the store's history is skipped, so the same file never
    adds a measurement twice.
    """
    added = 0
    skipped = 0
    reasons: list[str] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            header = []
        if header != list(_EXPECTED_COLUMNS):
            raise ValueError(f"demo data header must be: {_HEADER}")
        for row in reader:
            line_no = reader.line_num
            stripped = [cell.strip() for cell in row]
            if not any(stripped):
                continue  # blank row: skip silently
            if len(stripped) != len(_EXPECTED_COLUMNS):
                skipped += 1
                reasons.append(f"line {line_no}: wrong number of columns")
                continue
            record = dict(zip(_EXPECTED_COLUMNS, stripped))
            try:
                value = float(record["value"])
            except ValueError:
                skipped += 1
                reasons.append(f"line {line_no}: invalid value")
                continue
            try:
                mission_day = int(record["mission_day"])
            except ValueError:
                skipped += 1
                reasons.append(f"line {line_no}: invalid mission_day")
                continue
            try:
                entry = Entry(
                    person_id=record["person_id"],
                    indicator_id=record["indicator_id"],
                    value=value,
                    unit=record["unit"],
                    mission_day=mission_day,
                    time=record["time"],
                )
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
            if any(entry_key(prior) == entry_key(entry) for prior in existing):
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
    try:
        added, skipped, reasons = load_demo_data(store, path)
    except ValueError as error:
        print(error)
        return 1
    print(f"added {added}, skipped {skipped}")
    for reason in reasons:
        print(f"  {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
