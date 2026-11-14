"""SQLite storage: history survives a new store instance, and threads."""

from __future__ import annotations

import threading

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


def test_sqlite_concurrent_writes(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    n = 20

    def write(value: int) -> None:
        store.add(
            Entry(
                person_id="demo_astronaut_1",
                indicator_id="example_indicator",
                value=float(value),
                unit="example_unit",
                mission_day=1,
                time="08:00",
            )
        )

    threads = [threading.Thread(target=write, args=(i,)) for i in range(n)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    rows = store.history("demo_astronaut_1", "example_indicator")
    assert len(rows) == n
    assert {row.value for row in rows} == {float(i) for i in range(n)}
