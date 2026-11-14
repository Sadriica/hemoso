"""The plain history function in the storage layer (REQ-27 asks for a function)."""

from __future__ import annotations

from app import storage
from app.models import Entry


def entry(day: int, time: str, value: float) -> Entry:
    return Entry(
        person_id="demo_astronaut_1",
        indicator_id="example_indicator",
        value=value,
        unit="example_unit",
        mission_day=day,
        time=time,
    )


def test_history_plain_function(monkeypatch):
    mem = storage.MemoryStorage()
    mem.add(entry(2, "08:00", 1.0))
    mem.add(entry(1, "20:00", 2.0))
    monkeypatch.setattr(storage, "get_storage", lambda: mem)

    result = storage.history("demo_astronaut_1", "example_indicator")

    assert [row.mission_day for row in result] == [1, 2]
    assert [row.value for row in result] == [2.0, 1.0]
