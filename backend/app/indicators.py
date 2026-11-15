"""The config rows the backend reads: indicators.csv and attention.csv.

`data/indicators.csv` answers "which indicators exist and what is each unit"
(entry validation) and "what is each noise floor" (the baseline in
`app.state`). `rules/attention.csv` answers "when does a value need attention
and who acts" (REQ-05). Both files are read as FORMATS.md defines them; a
missing file reads as no rows, as it does while the team fills `config/`.
"""

from __future__ import annotations

import csv
import os
from pathlib import Path

from .models import Entry

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def config_dir() -> Path:
    value = os.environ.get("CONFIG_DIR", "")
    return Path(value) if value else REPO_ROOT / "config"


def load_indicator_rows() -> dict[str, dict[str, str]]:
    """indicator_id -> the whole indicators.csv row; {} while the file is missing."""
    path = config_dir() / "data" / "indicators.csv"
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {
            row["id"].strip(): {
                key: (value or "").strip() for key, value in row.items()
            }
            for row in csv.DictReader(handle)
            if row["id"].strip()
        }


def load_indicators() -> dict[str, str]:
    """indicator_id -> unit; {} while the team has not written indicators.csv."""
    return {
        indicator_id: row["unit"]
        for indicator_id, row in load_indicator_rows().items()
    }


def load_attention_rows(indicator_id: str) -> list[dict]:
    """One indicator's rows of rules/attention.csv, in file order; [] when none."""
    path = config_dir() / "rules" / "attention.csv"
    if not path.exists():
        return []
    rows: list[dict] = []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            if row["indicator_id"].strip() != indicator_id:
                continue
            rows.append(
                {
                    "indicator_id": indicator_id,
                    "side": row["side"].strip(),
                    "threshold": float(row["threshold"]),
                    "attention_level": row["attention_level"].strip(),
                    "notify": row["notify"].strip(),
                    "source": row["source"].strip(),
                }
            )
    return rows


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
