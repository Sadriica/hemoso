"""Env var handling: empty values count as unset, and CORS origins."""

from __future__ import annotations

from app import indicators, main, storage


def test_empty_storage_env_defaults_to_sqlite(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "_storage", None)
    monkeypatch.setattr(storage, "_storage_kind", None)
    monkeypatch.setenv("STORAGE", "")
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "entries.db"))

    store = storage.get_storage()

    assert isinstance(store, storage.SqliteStorage)
    assert store.path == tmp_path / "entries.db"


def test_empty_sqlite_path_uses_default(tmp_path, monkeypatch):
    monkeypatch.setattr(storage, "BACKEND_DIR", tmp_path)
    monkeypatch.setattr(storage, "_storage", None)
    monkeypatch.setattr(storage, "_storage_kind", None)
    monkeypatch.setenv("STORAGE", "sqlite")
    monkeypatch.setenv("SQLITE_PATH", "")

    store = storage.get_storage()

    assert isinstance(store, storage.SqliteStorage)
    assert store.path == tmp_path / "entries.db"


def test_empty_config_dir_uses_repo_config(monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", "")

    assert indicators.config_dir() == indicators.REPO_ROOT / "config"


def test_allowed_origins_empty_defaults_to_localhost(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)

    assert main.allowed_origins() == ["http://localhost:5173"]


def test_allowed_origins_comma_separated(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example, https://b.example")

    assert main.allowed_origins() == ["https://a.example", "https://b.example"]
