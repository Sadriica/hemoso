"""SQLite storage: history survives a new store instance, and threads."""

from __future__ import annotations

import sqlite3
import threading

import pytest

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
                mission_day=value + 1,
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


def test_sqlite_resend_returns_existing_row(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    entry = make_entry(1, "09:00")

    first_stored, first_created = store.add(entry)
    second_stored, second_created = store.add(entry)

    assert first_created is True
    assert second_created is False
    assert first_stored == second_stored == entry
    assert len(store.history("demo_astronaut_1", "example_indicator")) == 1


def test_sqlite_conflicting_value_raises(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    store.add(make_entry(1, "09:00"))

    conflicting = Entry(
        person_id="demo_astronaut_1",
        indicator_id="example_indicator",
        value=2.0,
        unit="example_unit",
        mission_day=1,
        time="09:00",
    )
    with pytest.raises(storage.EntryConflict):
        store.add(conflicting)


def test_sqlite_concurrent_resend_leaves_one_row(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    entry = make_entry(1, "09:00")
    results: list[tuple[Entry, bool]] = []

    def send() -> None:
        results.append(store.add(entry))

    threads = [threading.Thread(target=send) for _ in range(10)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert len(store.history("demo_astronaut_1", "example_indicator")) == 1
    assert sum(1 for _, created in results if created) == 1


def test_sqlite_dedup_existing_duplicates(tmp_path, capsys):
    path = tmp_path / "entries.db"
    # A database written before REQ-13 has no unique index and can hold two
    # identical rows for the same natural key.
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE entries ("
        "person_id TEXT NOT NULL, indicator_id TEXT NOT NULL,"
        "value REAL NOT NULL, unit TEXT NOT NULL,"
        "mission_day INTEGER NOT NULL, time TEXT NOT NULL)"
    )
    conn.executemany(
        "INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?)",
        [
            ("demo_astronaut_1", "example_indicator", 1.0, "example_unit", 1, "09:00"),
            ("demo_astronaut_1", "example_indicator", 1.0, "example_unit", 1, "09:00"),
        ],
    )
    conn.commit()
    conn.close()

    store = storage.SqliteStorage(path)

    assert "removed 1" in capsys.readouterr().err
    assert store.history("demo_astronaut_1", "example_indicator") == [
        make_entry(1, "09:00")
    ]
