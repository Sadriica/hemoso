"""Storage for entries and pain reports: memory, sqlite and supabase (REQ-27)."""

from __future__ import annotations

import os
import sqlite3
import sys
import threading
from pathlib import Path
from typing import Protocol

import httpx

from .models import Account, Entry, PainReport, entry_key, pain_key

BACKEND_DIR = Path(__file__).resolve().parent.parent

_COLUMNS = ("person_id", "indicator_id", "value", "unit", "mission_day", "time", "context")
_ACCOUNT_COLUMNS = ("person_id", "salt", "pin_hash")
_PAIN_COLUMNS = ("person_id", "region_id", "intensity", "mission_day", "time", "note")


class EntryConflict(Exception):
    """The natural key already holds an entry with a different value or unit."""


class PainConflict(Exception):
    """The natural key already holds a pain report with another intensity or note."""


def _same_value(left: Entry, right: Entry) -> bool:
    return (
        left.value == right.value
        and left.unit == right.unit
        and left.context == right.context
    )


def _same_pain(left: PainReport, right: PainReport) -> bool:
    return left.intensity == right.intensity and left.note == right.note


class Storage(Protocol):
    def add(self, entry: Entry) -> tuple[Entry, bool]: ...

    def history(self, person_id: str, indicator_id: str) -> list[Entry]: ...

    def add_pain(self, report: PainReport) -> tuple[PainReport, bool]: ...

    def pain_reports(
        self, person_id: str, region_id: str | None = None
    ) -> list[PainReport]: ...

    def account(self, person_id: str) -> Account | None: ...

    def create_account(self, account: Account) -> bool: ...

    def has_person(self, person_id: str) -> bool: ...


def _ordered(entries: list[Entry]) -> list[Entry]:
    return sorted(entries, key=lambda entry: (entry.mission_day, entry.time))


def _ordered_pain(reports: list[PainReport]) -> list[PainReport]:
    return sorted(reports, key=lambda report: (report.mission_day, report.time))


class MemoryStorage:
    """Holds entries, pain reports and accounts in memory; used by tests."""

    def __init__(self) -> None:
        self._entries: list[Entry] = []
        self._pain: list[PainReport] = []
        self._accounts: dict[str, Account] = {}

    def add(self, entry: Entry) -> tuple[Entry, bool]:
        key = entry_key(entry)
        for existing in self._entries:
            if entry_key(existing) == key:
                if _same_value(existing, entry):
                    return existing, False
                raise EntryConflict
        self._entries.append(entry)
        return entry, True

    def history(self, person_id: str, indicator_id: str) -> list[Entry]:
        return _ordered(
            entry
            for entry in self._entries
            if entry.person_id == person_id and entry.indicator_id == indicator_id
        )

    def add_pain(self, report: PainReport) -> tuple[PainReport, bool]:
        key = pain_key(report)
        for existing in self._pain:
            if pain_key(existing) == key:
                if _same_pain(existing, report):
                    return existing, False
                raise PainConflict
        self._pain.append(report)
        return report, True

    def pain_reports(
        self, person_id: str, region_id: str | None = None
    ) -> list[PainReport]:
        return _ordered_pain(
            report
            for report in self._pain
            if report.person_id == person_id
            and (region_id is None or report.region_id == region_id)
        )

    def account(self, person_id: str) -> Account | None:
        return self._accounts.get(person_id)

    def create_account(self, account: Account) -> bool:
        if account.person_id in self._accounts:
            return False
        self._accounts[account.person_id] = account
        return True

    def has_person(self, person_id: str) -> bool:
        return any(entry.person_id == person_id for entry in self._entries)


class SqliteStorage:
    """Stores entries in a local SQLite file, so history survives a restart."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.path, check_same_thread=False)
        with self._lock:
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS entries ("
                "person_id TEXT NOT NULL,"
                "indicator_id TEXT NOT NULL,"
                "value REAL NOT NULL,"
                "unit TEXT NOT NULL,"
                "mission_day INTEGER NOT NULL,"
                "time TEXT NOT NULL,"
                "context TEXT NOT NULL DEFAULT 'rest')"
            )
            # A database written before the context column existed gets it added
            # with the default, so its rows read as measured at rest.
            columns = [row[1] for row in self._conn.execute("PRAGMA table_info(entries)")]
            if "context" not in columns:
                self._conn.execute(
                    "ALTER TABLE entries ADD COLUMN context TEXT NOT NULL DEFAULT 'rest'"
                )
            # A database written before REQ-13 can hold two rows for the same
            # natural key. Drop the duplicates (keep the oldest) before the
            # unique index is created, so startup does not crash.
            removed = self._conn.execute(
                "DELETE FROM entries WHERE rowid NOT IN ("
                "SELECT MIN(rowid) FROM entries"
                " GROUP BY person_id, indicator_id, mission_day, time)"
            ).rowcount
            if removed:
                print(
                    f"removed {removed} duplicate entries for the same person,"
                    " indicator, day and time",
                    file=sys.stderr,
                )
            # One row per natural key (REQ-13). IF NOT EXISTS also adds the
            # index to a database created before this constraint existed.
            self._conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS entries_natural_key_idx"
                " ON entries (person_id, indicator_id, mission_day, time)"
            )
            # Accounts (REQ-37): the PIN is stored only as a salted scrypt hash.
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS accounts ("
                "person_id TEXT PRIMARY KEY,"
                "salt TEXT NOT NULL,"
                "pin_hash TEXT NOT NULL,"
                "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
            )
            # Pain reports from the 3D body (B-3), one per person, region, day
            # and time so the frontend's outbox can re-send one.
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS pain_reports ("
                "person_id TEXT NOT NULL,"
                "region_id TEXT NOT NULL,"
                "intensity INTEGER NOT NULL,"
                "mission_day INTEGER NOT NULL,"
                "time TEXT NOT NULL,"
                "note TEXT,"
                "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"
            )
            self._conn.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS pain_reports_natural_key_idx"
                " ON pain_reports (person_id, region_id, mission_day, time)"
            )
            self._conn.commit()

    def add(self, entry: Entry) -> tuple[Entry, bool]:
        with self._lock:
            try:
                self._conn.execute(
                    "INSERT INTO entries (person_id, indicator_id, value, unit,"
                    " mission_day, time, context) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        entry.person_id,
                        entry.indicator_id,
                        entry.value,
                        entry.unit,
                        entry.mission_day,
                        entry.time,
                        entry.context,
                    ),
                )
                self._conn.commit()
            except sqlite3.IntegrityError:
                self._conn.rollback()
                existing = self._find(entry_key(entry))
                if existing is None:
                    raise
                if _same_value(existing, entry):
                    return existing, False
                raise EntryConflict from None
        return entry, True

    def _find(self, key: tuple[str, str, int, str]) -> Entry | None:
        """The stored entry for `key`, or None. Call under the lock."""
        rows = self._conn.execute(
            "SELECT person_id, indicator_id, value, unit, mission_day, time, context"
            " FROM entries WHERE person_id = ? AND indicator_id = ?"
            " AND mission_day = ? AND time = ?",
            key,
        ).fetchall()
        return Entry(**dict(zip(_COLUMNS, rows[0]))) if rows else None

    def history(self, person_id: str, indicator_id: str) -> list[Entry]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT person_id, indicator_id, value, unit, mission_day, time, context"
                " FROM entries WHERE person_id = ? AND indicator_id = ?"
                " ORDER BY mission_day, time",
                (person_id, indicator_id),
            ).fetchall()
        return [Entry(**dict(zip(_COLUMNS, row))) for row in rows]

    def account(self, person_id: str) -> Account | None:
        with self._lock:
            rows = self._conn.execute(
                "SELECT person_id, salt, pin_hash FROM accounts WHERE person_id = ?",
                (person_id,),
            ).fetchall()
        return Account(**dict(zip(_ACCOUNT_COLUMNS, rows[0]))) if rows else None

    def create_account(self, account: Account) -> bool:
        with self._lock:
            try:
                self._conn.execute(
                    "INSERT INTO accounts (person_id, salt, pin_hash)"
                    " VALUES (?, ?, ?)",
                    (account.person_id, account.salt, account.pin_hash),
                )
                self._conn.commit()
            except sqlite3.IntegrityError:
                self._conn.rollback()
                return False
        return True

    def has_person(self, person_id: str) -> bool:
        with self._lock:
            rows = self._conn.execute(
                "SELECT 1 FROM entries WHERE person_id = ? LIMIT 1",
                (person_id,),
            ).fetchall()
        return bool(rows)

    def add_pain(self, report: PainReport) -> tuple[PainReport, bool]:
        with self._lock:
            try:
                self._conn.execute(
                    "INSERT INTO pain_reports (person_id, region_id, intensity,"
                    " mission_day, time, note) VALUES (?, ?, ?, ?, ?, ?)",
                    (
                        report.person_id,
                        report.region_id,
                        report.intensity,
                        report.mission_day,
                        report.time,
                        report.note,
                    ),
                )
                self._conn.commit()
            except sqlite3.IntegrityError:
                self._conn.rollback()
                existing = self._find_pain(pain_key(report))
                if existing is None:
                    raise
                if _same_pain(existing, report):
                    return existing, False
                raise PainConflict from None
        return report, True

    def _find_pain(self, key: tuple[str, str, int, str]) -> PainReport | None:
        """The stored pain report for `key`, or None. Call under the lock."""
        rows = self._conn.execute(
            "SELECT person_id, region_id, intensity, mission_day, time, note"
            " FROM pain_reports WHERE person_id = ? AND region_id = ?"
            " AND mission_day = ? AND time = ?",
            key,
        ).fetchall()
        return PainReport(**dict(zip(_PAIN_COLUMNS, rows[0]))) if rows else None

    def pain_reports(
        self, person_id: str, region_id: str | None = None
    ) -> list[PainReport]:
        sql = (
            "SELECT person_id, region_id, intensity, mission_day, time, note"
            " FROM pain_reports WHERE person_id = ?"
        )
        params: tuple[str, ...] = (person_id,)
        if region_id is not None:
            sql += " AND region_id = ?"
            params += (region_id,)
        sql += " ORDER BY mission_day, time"
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
        return [PainReport(**dict(zip(_PAIN_COLUMNS, row))) for row in rows]


class SupabaseStorage:
    """Talks to Supabase's REST API with httpx; no client library."""

    def __init__(
        self, url: str, key: str, client: httpx.Client | None = None
    ) -> None:
        self.url = url.rstrip("/")
        self.key = key
        self._client = client or httpx.Client()

    def _headers(self) -> dict[str, str]:
        # Supabase: "Send publishable and secret keys on the `apikey` header,
        # not on `Authorization: Bearer`." Legacy JWT keys still need the Bearer
        # header, so send it only when the key is a JWT.
        headers = {
            "apikey": self.key,
            "Content-Type": "application/json",
        }
        if self.key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.key}"
        return headers

    def add(self, entry: Entry) -> tuple[Entry, bool]:
        # Read before write: the unique constraint in supabase/schema.sql is
        # the backstop, but a read first returns the exact stored value so the
        # API can answer 200 or 409, which PostgREST's ignore-duplicates does not.
        existing = self._find(entry)
        if existing is not None:
            if _same_value(existing, entry):
                return existing, False
            raise EntryConflict
        response = self._client.post(
            f"{self.url}/rest/v1/entries",
            json=entry.model_dump(),
            headers=self._headers(),
        )
        if response.status_code == 409:
            # A concurrent request inserted this key between our read and write.
            existing = self._find(entry)
            if existing is not None:
                if _same_value(existing, entry):
                    return existing, False
                raise EntryConflict
        response.raise_for_status()
        return entry, True

    def _find(self, entry: Entry) -> Entry | None:
        """The stored entry with the same natural key, or None."""
        response = self._client.get(
            f"{self.url}/rest/v1/entries",
            params={
                "person_id": f"eq.{entry.person_id}",
                "indicator_id": f"eq.{entry.indicator_id}",
                "mission_day": f"eq.{entry.mission_day}",
                "time": f"eq.{entry.time}",
            },
            headers=self._headers(),
        )
        response.raise_for_status()
        rows = response.json()
        return Entry(**rows[0]) if rows else None

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

    def account(self, person_id: str) -> Account | None:
        response = self._client.get(
            f"{self.url}/rest/v1/accounts",
            params={
                "person_id": f"eq.{person_id}",
                "select": "person_id,salt,pin_hash",
            },
            headers=self._headers(),
        )
        response.raise_for_status()
        rows = response.json()
        return Account(**rows[0]) if rows else None

    def create_account(self, account: Account) -> bool:
        headers = self._headers() | {"Prefer": "return=minimal"}
        response = self._client.post(
            f"{self.url}/rest/v1/accounts",
            json=account.model_dump(),
            headers=headers,
        )
        if response.status_code == 409:
            # The primary key already holds this person: the account exists.
            return False
        response.raise_for_status()
        return True

    def has_person(self, person_id: str) -> bool:
        response = self._client.get(
            f"{self.url}/rest/v1/entries",
            params={
                "person_id": f"eq.{person_id}",
                "select": "person_id",
                "limit": "1",
            },
            headers=self._headers(),
        )
        response.raise_for_status()
        return bool(response.json())

    def add_pain(self, report: PainReport) -> tuple[PainReport, bool]:
        # Read before write, as `add` does: the unique index in
        # supabase/schema.sql is the backstop, but a read first returns the
        # exact stored report so the API can answer 200 or 409.
        existing = self._find_pain(report)
        if existing is not None:
            if _same_pain(existing, report):
                return existing, False
            raise PainConflict
        response = self._client.post(
            f"{self.url}/rest/v1/pain_reports",
            json=report.model_dump(),
            headers=self._headers(),
        )
        if response.status_code == 409:
            # A concurrent request inserted this key between our read and write.
            existing = self._find_pain(report)
            if existing is not None:
                if _same_pain(existing, report):
                    return existing, False
                raise PainConflict
        response.raise_for_status()
        return report, True

    def _find_pain(self, report: PainReport) -> PainReport | None:
        """The stored report with the same natural key, or None."""
        response = self._client.get(
            f"{self.url}/rest/v1/pain_reports",
            params={
                "person_id": f"eq.{report.person_id}",
                "region_id": f"eq.{report.region_id}",
                "mission_day": f"eq.{report.mission_day}",
                "time": f"eq.{report.time}",
                "select": ",".join(_PAIN_COLUMNS),
            },
            headers=self._headers(),
        )
        response.raise_for_status()
        rows = response.json()
        return PainReport(**rows[0]) if rows else None

    def pain_reports(
        self, person_id: str, region_id: str | None = None
    ) -> list[PainReport]:
        params = {
            "person_id": f"eq.{person_id}",
            "order": "mission_day.asc,time.asc",
            "select": ",".join(_PAIN_COLUMNS),
        }
        if region_id is not None:
            params["region_id"] = f"eq.{region_id}"
        response = self._client.get(
            f"{self.url}/rest/v1/pain_reports",
            params=params,
            headers=self._headers(),
        )
        response.raise_for_status()
        return [PainReport(**row) for row in response.json()]


_storage: Storage | None = None
_storage_kind: str | None = None
_storage_lock = threading.Lock()


def _env(name: str, default: str) -> str:
    """The env var's value, or default when it is unset or empty."""
    value = os.environ.get(name, "")
    return value if value else default


def ensure_supabase_config() -> None:
    """Fail fast at startup when Supabase is selected but URL or key is empty.

    Without this the first request would raise ValueError inside get_storage().
    """
    if _env("STORAGE", "sqlite") != "supabase":
        return
    if not _env("SUPABASE_URL", "") or not _env("SUPABASE_KEY", ""):
        raise RuntimeError(
            "STORAGE=supabase requires SUPABASE_URL and SUPABASE_KEY to be set"
        )


def _build(kind: str) -> Storage:
    if kind == "memory":
        return MemoryStorage()
    if kind == "sqlite":
        return SqliteStorage(_env("SQLITE_PATH", str(BACKEND_DIR / "entries.db")))
    if kind == "supabase":
        url = _env("SUPABASE_URL", "")
        key = _env("SUPABASE_KEY", "")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY are required")
        return SupabaseStorage(url, key)
    raise ValueError(f"unknown STORAGE {kind!r}")


def get_storage() -> Storage:
    """The storage for the running app, from the STORAGE env var (sqlite default)."""
    global _storage, _storage_kind
    kind = _env("STORAGE", "sqlite")
    with _storage_lock:
        if _storage is not None and _storage_kind == kind:
            return _storage
        _storage = _build(kind)
        _storage_kind = kind
        return _storage


def add_entry(entry: Entry) -> tuple[Entry, bool]:
    return get_storage().add(entry)


def history(person_id: str, indicator_id: str) -> list[Entry]:
    """A person's earlier entries for an indicator, ordered by mission_day then time."""
    return get_storage().history(person_id, indicator_id)
