"""Storage for entries: memory, sqlite and supabase, chosen by STORAGE (REQ-27)."""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Protocol

import httpx

from .models import Entry

BACKEND_DIR = Path(__file__).resolve().parent.parent

_COLUMNS = ("person_id", "indicator_id", "value", "unit", "mission_day", "time")


class Storage(Protocol):
    def add(self, entry: Entry) -> Entry: ...

    def history(self, person_id: str, indicator_id: str) -> list[Entry]: ...


def _ordered(entries: list[Entry]) -> list[Entry]:
    return sorted(entries, key=lambda entry: (entry.mission_day, entry.time))


class MemoryStorage:
    """Holds entries in a list; used by tests."""

    def __init__(self) -> None:
        self._entries: list[Entry] = []

    def add(self, entry: Entry) -> Entry:
        self._entries.append(entry)
        return entry

    def history(self, person_id: str, indicator_id: str) -> list[Entry]:
        return _ordered(
            entry
            for entry in self._entries
            if entry.person_id == person_id and entry.indicator_id == indicator_id
        )


class SqliteStorage:
    """Stores entries in a local SQLite file, so history survives a restart."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.path)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS entries ("
            "person_id TEXT NOT NULL,"
            "indicator_id TEXT NOT NULL,"
            "value REAL NOT NULL,"
            "unit TEXT NOT NULL,"
            "mission_day INTEGER NOT NULL,"
            "time TEXT NOT NULL)"
        )
        self._conn.commit()

    def add(self, entry: Entry) -> Entry:
        self._conn.execute(
            "INSERT INTO entries (person_id, indicator_id, value, unit, mission_day, time)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                entry.person_id,
                entry.indicator_id,
                entry.value,
                entry.unit,
                entry.mission_day,
                entry.time,
            ),
        )
        self._conn.commit()
        return entry

    def history(self, person_id: str, indicator_id: str) -> list[Entry]:
        rows = self._conn.execute(
            "SELECT person_id, indicator_id, value, unit, mission_day, time"
            " FROM entries WHERE person_id = ? AND indicator_id = ?"
            " ORDER BY mission_day, time",
            (person_id, indicator_id),
        ).fetchall()
        return [Entry(**dict(zip(_COLUMNS, row))) for row in rows]


class SupabaseStorage:
    """Talks to Supabase's REST API with httpx; no client library."""

    def __init__(
        self, url: str, key: str, client: httpx.Client | None = None
    ) -> None:
        self.url = url.rstrip("/")
        self.key = key
        self._client = client or httpx.Client()

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def add(self, entry: Entry) -> Entry:
        response = self._client.post(
            f"{self.url}/rest/v1/entries",
            json=entry.model_dump(),
            headers=self._headers(),
        )
        response.raise_for_status()
        return entry

    def history(self, person_id: str, indicator_id: str) -> list[Entry]:
        response = self._client.get(
            f"{self.url}/rest/v1/entries",
            params={
                "person_id": f"eq.{person_id}",
                "indicator_id": f"eq.{indicator_id}",
                "order": "mission_day.asc,time.asc",
            },
            headers=self._headers(),
        )
        response.raise_for_status()
        return [Entry(**row) for row in response.json()]


_storage: Storage | None = None
_storage_kind: str | None = None


def _build(kind: str) -> Storage:
    if kind == "memory":
        return MemoryStorage()
    if kind == "sqlite":
        return SqliteStorage(os.environ.get("SQLITE_PATH", BACKEND_DIR / "entries.db"))
    if kind == "supabase":
        return SupabaseStorage(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    raise ValueError(f"unknown STORAGE {kind!r}")


def get_storage() -> Storage:
    """The storage for the running app, from the STORAGE env var (sqlite default)."""
    global _storage, _storage_kind
    kind = os.environ.get("STORAGE", "sqlite")
    if _storage is not None and _storage_kind == kind:
        return _storage
    _storage = _build(kind)
    _storage_kind = kind
    return _storage


def add_entry(entry: Entry) -> Entry:
    return get_storage().add(entry)


def history(person_id: str, indicator_id: str) -> list[Entry]:
    """A person's earlier entries for an indicator, ordered by mission_day then time."""
    return get_storage().history(person_id, indicator_id)
