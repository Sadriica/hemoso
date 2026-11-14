"""Indicator list from config/data/indicators.csv, for entry validation."""

from __future__ import annotations

import csv
import os
from pathlib import Path

from .models import Entry

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def config_dir() -> Path:
    value = os.environ.get("CONFIG_DIR", "")
    return Path(value) if value else REPO_ROOT / "config"


def load_indicators() -> dict[str, str]:
    """indicator_id -> unit; {} while the team has not written indicators.csv."""
    path = config_dir() / "data" / "indicators.csv"
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {row["id"]: row["unit"] for row in csv.DictReader(handle)}


def validate_against_indicators(entry: Entry) -> str | None:
    """Short message when the indicator is unknown or its unit differs, else None."""
    indicators = load_indicators()
    if not indicators:
        return None
    unit = indicators.get(entry.indicator_id)
    if unit is None:
        return "unknown indicator"
    if entry.unit != unit:
        return "unit mismatch"
    return None
