"""Load the synthetic demo data (REQ-29) into the store (REQ-27).

config/data/demo_data.csv holds one measurement per row, in the same columns the
app stores for a real entry. config/data/symptom_log.csv holds one symptom
report per row, in the same columns the app stores for a real report (FORMATS.md
section 3). This module reads both, keeps only the valid rows, and adds each
once. Run it with `uv run python -m app.seed`.
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from pydantic import ValidationError

from . import storage
from .indicators import (
    config_dir,
    validate_against_indicators,
    validate_against_symptoms,
)
from .models import Entry, SymptomReport, entry_key, symptom_key

_DEMO_FILE = "demo_data.csv"
_EXPECTED_COLUMNS = (
    "person_id",
    "indicator_id",
    "value",
    "unit",
    "mission_day",
    "time",
    "context",
)
# The header Phys wrote before the context column existed is still accepted;
# its rows load with context "rest".
_LEGACY_COLUMNS = _EXPECTED_COLUMNS[:-1]
_HEADER = ",".join(_EXPECTED_COLUMNS)
_LEGACY_HEADER = ",".join(_LEGACY_COLUMNS)

_SYMPTOM_FILE = "symptom_log.csv"
_SYMPTOM_COLUMNS = ("person_id", "mission_day", "time", "symptom_id", "severity")
_SYMPTOM_HEADER = ",".join(_SYMPTOM_COLUMNS)


def _validation_reason(error: ValidationError) -> str:
    """A short reason for one invalid row, naming the first offending field."""
    errors = error.errors()
    if not errors:
        return "invalid row"
    loc = errors[0].get("loc", ())
    field = str(loc[0]) if loc else "row"
    return f"invalid {field}"


def _read_header(reader, expected: tuple[str, ...], message: str) -> None:
    """Raise ValueError unless the reader's first row is `expected`."""
    try:
        header = next(reader)
    except StopIteration:
        header = []
    if header != list(expected):
        raise ValueError(message)


def load_demo_data(store: storage.Storage, path: Path) -> tuple[int, int, list[str]]:
    """Add the valid rows of `path` to `store`; return (added, skipped, reasons).

    The header is the seven expected columns, or the older six-column header
    without `context` (its rows load with context "rest"). Each row must have
    the same number of cells, pass the Entry model and match its indicator in
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
        if header == list(_EXPECTED_COLUMNS):
            columns = _EXPECTED_COLUMNS
        elif header == list(_LEGACY_COLUMNS):
            columns = _LEGACY_COLUMNS
        else:
            raise ValueError(
                f"demo data header must be: {_HEADER} (or the older {_LEGACY_HEADER})"
            )
        for row in reader:
            line_no = reader.line_num
            stripped = [cell.strip() for cell in row]
            if not any(stripped):
                continue  # blank row: skip silently
            if len(stripped) != len(columns):
                skipped += 1
                reasons.append(f"line {line_no}: wrong number of columns")
                continue
            record = dict(zip(columns, stripped))
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
                    context=record.get("context", "rest"),
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


def load_symptom_log(
    store: storage.Storage, path: Path
) -> tuple[int, int, list[str]]:
    """Add the valid rows of `path` to `store`; return (added, skipped, reasons).

    The five columns of `config/data/symptom_log.csv` (FORMATS.md section 3,
    T-78). Each row must have the same number of cells, pass the SymptomReport
    model and name a symptom of data/symptoms.csv when that file defines any.
    A row whose (person_id, mission_day, time, symptom_id) is already stored is
    skipped, so the same file never adds a report twice.
    """
    added = 0
    skipped = 0
    reasons: list[str] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        _read_header(
            reader,
            _SYMPTOM_COLUMNS,
            f"symptom log header must be: {_SYMPTOM_HEADER}",
        )
        for row in reader:
            line_no = reader.line_num
            stripped = [cell.strip() for cell in row]
            if not any(stripped):
                continue  # blank row: skip silently
            if len(stripped) != len(_SYMPTOM_COLUMNS):
                skipped += 1
                reasons.append(f"line {line_no}: wrong number of columns")
                continue
            record = dict(zip(_SYMPTOM_COLUMNS, stripped))
            try:
                mission_day = int(record["mission_day"])
                severity = int(record["severity"])
            except ValueError:
                skipped += 1
                reasons.append(f"line {line_no}: invalid mission_day or severity")
                continue
            try:
                report = SymptomReport(
                    person_id=record["person_id"],
                    mission_day=mission_day,
                    time=record["time"],
                    symptom_id=record["symptom_id"],
                    severity=severity,
                )
            except ValidationError as error:
                skipped += 1
                reasons.append(f"line {line_no}: {_validation_reason(error)}")
                continue
            error = validate_against_symptoms(report.symptom_id)
            if error is not None:
                skipped += 1
                reasons.append(f"line {line_no}: {error}")
                continue
            existing = store.symptom_reports(report.person_id)
            if any(symptom_key(prior) == symptom_key(report) for prior in existing):
                skipped += 1
                reasons.append(f"line {line_no}: duplicate")
                continue
            store.add_symptom(report)
            added += 1
    return added, skipped, reasons


def _report(name: str, added: int, skipped: int, reasons: list[str]) -> None:
    """One block on stdout for one file."""
    print(f"{name}: added {added}, skipped {skipped}")
    for reason in reasons:
        print(f"  {reason}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="app.seed",
        description=(
            "Load config/data/demo_data.csv and config/data/symptom_log.csv "
            "into the store."
        ),
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=None,
        help=f"path to demo_data.csv (default: CONFIG_DIR/data/{_DEMO_FILE})",
    )
    parser.add_argument(
        "--symptoms",
        type=Path,
        default=None,
        help=f"path to symptom_log.csv (default: CONFIG_DIR/data/{_SYMPTOM_FILE})",
    )
    args = parser.parse_args(argv)
    data_dir = config_dir() / "data"
    demo_path = args.path if args.path is not None else data_dir / _DEMO_FILE
    symptom_path = (
        args.symptoms if args.symptoms is not None else data_dir / _SYMPTOM_FILE
    )
    if not demo_path.exists():
        print(f"demo data file not found at {demo_path}")
    if not symptom_path.exists():
        print(f"symptom log file not found at {symptom_path}")
    if not demo_path.exists() and not symptom_path.exists():
        return 0
    store = storage.get_storage()
    if demo_path.exists():
        try:
            _report("demo data", *load_demo_data(store, demo_path))
        except ValueError as error:
            print(error)
            return 1
    if symptom_path.exists():
        try:
            _report("symptom log", *load_symptom_log(store, symptom_path))
        except ValueError as error:
            print(error)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
