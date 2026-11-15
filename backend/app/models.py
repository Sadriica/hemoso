"""The Entry model: one stored measurement (REQ-27)."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_ID = re.compile(r"^[a-z][a-z0-9_]*$")
_TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")

# The four contexts an entry is measured in (FORMATS.md, demo_data.csv).
Context = Literal["rest", "after_exercise", "on_waking", "before_sleep"]
CONTEXTS: tuple[str, ...] = ("rest", "after_exercise", "on_waking", "before_sleep")

# The four states the astronaut reads (FORMATS.md section 3).
StateName = Literal["no_data", "in_range", "outside_range", "needs_review"]
# Who acts on an attention row, from least to most severe.
Notify = Literal["crew", "cmo", "flight_surgeon"]


def is_valid_id(value: str) -> bool:
    """True when `value` is lowercase snake_case (letters, digits, underscores)."""
    return _ID.fullmatch(value) is not None


class Entry(BaseModel):
    """One row of config/data/demo_data.csv: person, indicator, value, unit, day, time, context."""

    person_id: str = Field(max_length=64)
    indicator_id: str = Field(max_length=64)
    value: float = Field(allow_inf_nan=False, strict=True)
    unit: str = Field(max_length=64)
    mission_day: int = Field(gt=0, le=100000, strict=True)
    time: str
    context: Context = "rest"

    @field_validator("person_id", "indicator_id")
    @classmethod
    def _check_id(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value

    @field_validator("time")
    @classmethod
    def _check_time(cls, value: str) -> str:
        if not _TIME.fullmatch(value):
            raise ValueError("time must be HH:MM (24-hour)")
        return value


def entry_key(entry: Entry) -> tuple[str, str, int, str]:
    """The natural key: one entry per person, indicator, day and time (REQ-13)."""
    return (entry.person_id, entry.indicator_id, entry.mission_day, entry.time)


class AttentionRow(BaseModel):
    """The attention.csv row a value crosses (REQ-05).

    `attention_level` is the state name Bio 2 writes, which is also the
    sub-heading in `config/content/<indicator_id>.md`; `notify` is who acts;
    `source` is the link or `Assumption` of the row.
    """

    attention_level: str
    notify: Notify
    source: str


class IndicatorState(BaseModel):
    """One value against the person's own baseline (FORMATS.md section 3).

    `median` and `spread` are null and `n` counts fewer than 3 entries while
    the state is `no_data`; `attention` is the row that made the state
    `needs_review`, and null otherwise.
    """

    state: StateName
    median: float | None
    spread: float | None
    n: int
    attention: AttentionRow | None


class BloodPressureState(BaseModel):
    """One blood pressure reading: the worse of its systolic and diastolic state.

    `systolic` and `diastolic` are the same body the single-indicator state
    route returns, one against `bp_sys_mmhg`'s history and one against
    `bp_dia_mmhg`'s; `state` is the worse of the two states
    (`docs/findings/bio2-01-pressure-state-rule.md`).
    """

    state: StateName
    systolic: IndicatorState
    diastolic: IndicatorState
