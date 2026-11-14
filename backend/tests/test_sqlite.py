"""SQLite storage: history survives a new store instance."""

from __future__ import annotations

from app import storage
from app.models import Entry


def make_entry(day: int, time: str) -> Entry:
    return Entry(
        person_id="demo_astronaut_1",
        indicator_id="example_indicator",
        value=1.0,
        unit="example_unit",
        mission_day=day,
        time=time,
    )


def test_sqlite_survives_new_instance(tmp_path):
    path = tmp_path / "entries.db"
    storage.SqliteStorage(path).add(make_entry(1, "09:00"))

    reopened = storage.SqliteStorage(path)
    assert reopened.history("demo_astronaut_1", "example_indicator") == [
        make_entry(1, "09:00")
    ]
