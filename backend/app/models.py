"""The Entry model: one stored measurement (REQ-27)."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_ID = re.compile(r"^[a-z][a-z0-9_]*$")
_TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")


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
    context: Literal["rest", "after_exercise", "on_waking", "before_sleep"] = "rest"

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
