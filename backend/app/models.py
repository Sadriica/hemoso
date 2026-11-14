"""The Entry model: one stored measurement (REQ-27)."""

from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

_ID = re.compile(r"^[a-z][a-z0-9_]*$")
_TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")


class Entry(BaseModel):
    """One row of config/data/demo_data.csv: person, indicator, value, unit, day, time."""

    person_id: str
    indicator_id: str
    value: float = Field(allow_inf_nan=False)
    unit: str
    mission_day: int = Field(gt=0)
    time: str

    @field_validator("person_id", "indicator_id")
    @classmethod
    def _check_id(cls, value: str) -> str:
        if not _ID.fullmatch(value):
            raise ValueError("must be lowercase snake_case")
        return value

    @field_validator("time")
    @classmethod
    def _check_time(cls, value: str) -> str:
        if not _TIME.fullmatch(value):
            raise ValueError("time must be HH:MM (24-hour)")
        return value
