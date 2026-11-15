"""The stored models: one measurement (REQ-27), one pain report (B-3), one symptom
report (T-79) and accounts."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

_ID = re.compile(r"^[a-z][a-z0-9_]*$")
_TIME = re.compile(r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
_PIN = re.compile(r"^[0-9]{4,8}$")

# The four contexts an entry is measured in (FORMATS.md, demo_data.csv).
Context = Literal["rest", "after_exercise", "on_waking", "before_sleep"]
CONTEXTS: tuple[str, ...] = ("rest", "after_exercise", "on_waking", "before_sleep")

# The four states the astronaut reads (FORMATS.md section 3).
StateName = Literal["no_data", "in_range", "outside_range", "needs_review"]
# Who acts on an attention row, from least to most severe.
Notify = Literal["crew", "cmo", "flight_surgeon"]

# Which side of a person's range counts for a condition signal (FORMATS.md 3).
Side = Literal["above", "below"]
# What a signal of a condition is: a measured indicator or a reported symptom.
SignalKind = Literal["indicator", "symptom"]
# The three-step label of an evidence score, plus no_data (bio2-02).
ConditionLabel = Literal["no_data", "low", "possible", "review"]


def is_valid_id(value: str) -> bool:
    """True when `value` is lowercase snake_case (letters, digits, underscores)."""
    return _ID.fullmatch(value) is not None


def is_valid_time(value: str) -> bool:
    """True when `value` is a 24-hour clock time `HH:MM` (FORMATS.md section 3)."""
    return _TIME.fullmatch(value) is not None


def is_valid_pin(value: str) -> bool:
    """True when `value` is 4 to 8 digits (REQ-37)."""
    return _PIN.fullmatch(value) is not None


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
        if not is_valid_time(value):
            raise ValueError("time must be HH:MM (24-hour)")
        return value


def entry_key(entry: Entry) -> tuple[str, str, int, str]:
    """The natural key: one entry per person, indicator, day and time (REQ-13)."""
    return (entry.person_id, entry.indicator_id, entry.mission_day, entry.time)


PAIN_MIN = 0
PAIN_MAX = 10
NOTE_MAX = 280


class PainFields(BaseModel):
    """The fields of a pain report the astronaut chooses on the 3D body (B-3).

    `region_id` is a lowercase `snake_case` id of up to 64 characters from the
    frontend's region list; the API does not check it against a file because
    `config/content/body_regions.csv` does not exist yet. `intensity` is the
    0 to 10 the astronaut set, stored as it comes: the API does not read it as
    a sign of anything. `note` is free text the astronaut may add.
    """

    region_id: str = Field(max_length=64)
    intensity: int = Field(ge=PAIN_MIN, le=PAIN_MAX, strict=True)
    mission_day: int = Field(gt=0, le=100000, strict=True)
    time: str
    note: str | None = Field(default=None, max_length=NOTE_MAX)

    @field_validator("region_id")
    @classmethod
    def _check_region(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value

    @field_validator("time")
    @classmethod
    def _check_time(cls, value: str) -> str:
        if not is_valid_time(value):
            raise ValueError("time must be HH:MM (24-hour)")
        return value


class PainReportIn(PainFields):
    """The body of `POST /people/{person_id}/pain`: the person is in the path."""


class PainReport(PainFields):
    """One stored pain report: the fields above and whose report it is."""

    person_id: str = Field(max_length=64)

    @field_validator("person_id")
    @classmethod
    def _check_person(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value


def pain_key(report: PainReport) -> tuple[str, str, int, str]:
    """The natural key: one pain report per person, region, day and time."""
    return (report.person_id, report.region_id, report.mission_day, report.time)


# A symptom is reported as mild, moderate or severe (Bio 2's proposal, T-79).
SEVERITY_MIN = 1
SEVERITY_MAX = 3


class SymptomFields(BaseModel):
    """The fields of one symptom report the astronaut sends (T-79).

    `symptom_id` is a lowercase `snake_case` id; while
    `config/data/symptoms.csv` does not exist the API does not check it against
    a file. `severity` is 1 (mild), 2 (moderate) or 3 (severe), stored as the
    astronaut set it: the score reads only whether the symptom was reported.
    """

    symptom_id: str = Field(max_length=64)
    severity: int = Field(ge=SEVERITY_MIN, le=SEVERITY_MAX, strict=True)
    mission_day: int = Field(gt=0, le=100000, strict=True)
    time: str

    @field_validator("symptom_id")
    @classmethod
    def _check_symptom(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value

    @field_validator("time")
    @classmethod
    def _check_time(cls, value: str) -> str:
        if not is_valid_time(value):
            raise ValueError("time must be HH:MM (24-hour)")
        return value


class SymptomReportIn(SymptomFields):
    """The body of `POST /people/{person_id}/symptoms`: the person is in the path."""


class SymptomReport(SymptomFields):
    """One stored symptom report: the fields above and whose report it is."""

    person_id: str = Field(max_length=64)

    @field_validator("person_id")
    @classmethod
    def _check_person(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value


def symptom_key(report: SymptomReport) -> tuple[str, int, str, str]:
    """The natural key: one report per person, day, time and symptom."""
    return (report.person_id, report.mission_day, report.time, report.symptom_id)


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


class ConditionSignal(BaseModel):
    """One signal a condition rests on (bio2-02, T-79).

    `kind` is `indicator` for a measured signal and `symptom` for one the
    person reported; a symptom signal carries `symptom_id` and a point of its
    own, and the indicator fields stay empty. `side` is the side of the
    person's range that counts for the condition, or null when `based_on` left
    it out; `contribution` is the point the signal added, or null while it is
    not usable (no reading, no side, no baseline, or a symptom not reported);
    `value` is the newest reading, or null when there is none.

    The route leaves out the fields a signal does not set
    (`response_model_exclude_unset`), so an indicator signal keeps the four
    fields it had before the symptom layer and a symptom signal adds `kind` and
    `symptom_id`.
    """

    kind: SignalKind = "indicator"
    indicator_id: str | None = None
    symptom_id: str | None = None
    side: Side | None = None
    contribution: float | None = None
    value: float | None = None


class ConditionScore(BaseModel):
    """The evidence score of one possible condition (bio2-02, REQ-06, T-79).

    `score` is the mean of the signals' points, from 0 to 1, or null while
    fewer than two signals are usable; `label` is `no_data` with no score.
    `red_flag` appears as `true` only when the person reported a symptom that
    this condition lists and `config/data/symptoms.csv` marks as a red flag; it
    is not a diagnosis and adds no text. The score is evidence, not a
    probability: the CMO or the flight surgeon confirms, and the route never
    says the person has the condition.
    """

    condition_id: str
    name: str
    score: float | None
    label: ConditionLabel
    signals: list[ConditionSignal]
    source: str
    red_flag: bool = False


class Account(BaseModel):
    """A stored account (REQ-37): the person, the salt and the salted PIN hash.

    The PIN itself is never stored and never logged; `pin_hash` is the
    hex digest of `hashlib.scrypt` over the PIN and `salt`.
    """

    person_id: str
    salt: str
    pin_hash: str


class Credentials(BaseModel):
    """The body of `POST /accounts` and of `POST /sessions`.

    `person_id` follows the same lowercase `snake_case` rule as every id in the
    API; `pin` is 4 to 8 digits.
    """

    person_id: str = Field(max_length=64)
    pin: str = Field(max_length=8)

    @field_validator("person_id")
    @classmethod
    def _check_id(cls, value: str) -> str:
        if not is_valid_id(value):
            raise ValueError("must be lowercase snake_case")
        return value

    @field_validator("pin")
    @classmethod
    def _check_pin(cls, value: str) -> str:
        if not is_valid_pin(value):
            raise ValueError("pin must be 4 to 8 digits")
        return value


class AccountOut(BaseModel):
    """The body of `POST /accounts`: the person, nothing else."""

    person_id: str


class SessionOut(BaseModel):
    """The body of `POST /sessions`: the token and when it stops working.

    `expires_at` is ISO 8601 in UTC; the token is sent as
    `Authorization: Bearer <token>`.
    """

    token: str
    person_id: str
    expires_at: str
