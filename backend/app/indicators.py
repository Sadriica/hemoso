"""The config rows the backend reads: indicators, attention, conditions, symptoms.

`data/indicators.csv` answers "which indicators exist and what is each unit"
(entry validation) and "what is each noise floor" (the baseline in
`app.state`). `rules/attention.csv` answers "when does a value need attention
and who acts" (REQ-05). `rules/conditions.csv` answers "what may the astronaut
have and which signals does it rest on" (REQ-06), scored by `app.conditions`;
its optional fifth column, `symptoms`, adds the reported symptoms a condition
lists (T-78), and a row that still has four cells keeps working (T-79).
`data/symptoms.csv` answers "which symptoms can be reported, which
of them are red flags and which weigh less because more than one condition
lists them" (T-78). Every file is read as FORMATS.md defines
it; a missing file reads as no rows, as it does while the team fills `config/`.
"""

from __future__ import annotations

import csv
import os
from collections.abc import Sequence
from pathlib import Path

from .models import Entry

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# The columns of rules/conditions.csv, in file order (FORMATS.md section 3).
# `symptoms` is the optional fifth one; a four-cell row has no cell for it.
CONDITION_COLUMNS = ("condition_id", "name", "based_on", "symptoms", "source")


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


def load_demo_people() -> set[str]:
    """The `person_id` values of data/demo_data.csv; empty while the file is missing."""
    path = config_dir() / "data" / "demo_data.csv"
    if not path.exists():
        return set()
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {
            row["person_id"].strip()
            for row in csv.DictReader(handle)
            if (row.get("person_id") or "").strip()
        }


def load_condition_rows() -> list[dict[str, str]]:
    """rules/conditions.csv in file order; [] while the file is missing.

    The header names the cells, so the reader does not depend on how wide the
    file is. A row with four cells is the row the file had before `symptoms`: its
    fourth cell is `source` and it lists no symptom (T-79). A file whose header
    still has four columns reads the same way, and a five-cell row under it takes
    its fourth cell as `symptoms` and its last as `source`. `based_on` keeps its
    column text; `app.conditions` splits it into `indicator_id:side` pairs.
    """
    path = config_dir() / "rules" / "conditions.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.reader(handle)
        header = next(reader, [])
        rows = [condition_row(header, cells) for cells in reader]
    return [row for row in rows if row["condition_id"]]


def condition_row(header: Sequence[str], cells: Sequence[str]) -> dict[str, str]:
    """One line of conditions.csv keyed by the header's column names.

    The count of cells decides whether the row carries `symptoms`: four cells
    have none, five have one. The header names the rest, so a row that still has
    four cells keeps its fourth cell as `source` even under the five-column
    header, and the other way round while the header is the old four-column one.
    """
    names = [name.strip() for name in header]
    values = [cell.strip() for cell in cells]
    if len(values) == len(names) - 1 and "symptoms" in names:
        names = [name for name in names if name != "symptoms"]
    elif len(values) == len(names) + 1 and "symptoms" not in names:
        names = [*names[:-1], "symptoms", names[-1]]
    row = dict(zip(names, values))
    return {column: row.get(column, "") for column in CONDITION_COLUMNS}


def load_symptom_rows() -> dict[str, dict[str, str]]:
    """symptom_id -> the whole symptoms.csv row; {} while the file is missing.

    The columns are `symptom_id`, `name`, `red_flag`, `shared` and `source`
    (FORMATS.md section 3, T-78). `shared` is what decides a symptom's weight in
    the condition score and `red_flag` what makes a condition `urgent`.
    The key is lowercased because an id the API accepts is always lowercase: a
    `Shaky` row in the file still answers for a stored `shaky`, instead of
    silently losing the red flag. A row like that is why the checker has to read
    this file: `scripts/check_content.py` does not read it yet (T-78 opens it).
    """
    path = config_dir() / "data" / "symptoms.csv"
    if not path.exists():
        return {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return {
            row["symptom_id"].strip().lower(): {
                key: (value or "").strip() for key, value in row.items()
            }
            for row in csv.DictReader(handle)
            if (row.get("symptom_id") or "").strip()
        }


def validate_against_symptoms(symptom_id: str) -> str | None:
    """Short message when symptoms.csv exists and lacks the id, else None."""
    rows = load_symptom_rows()
    if not rows:
        return None
    if symptom_id not in rows:
        return "unknown symptom"
    return None


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
