"""Env var handling: empty values count as unset, and CORS origins."""

from __future__ import annotations

import pytest

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


def test_supabase_missing_url_or_key_fails_fast(monkeypatch):
    monkeypatch.setenv("STORAGE", "supabase")
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)

    with pytest.raises(RuntimeError, match="SUPABASE_URL and SUPABASE_KEY"):
        storage.ensure_supabase_config()


def test_supabase_config_ok_when_set(monkeypatch):
    monkeypatch.setenv("STORAGE", "supabase")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "sb_secret_x")

    storage.ensure_supabase_config()
