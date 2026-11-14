"""Shared fixtures: a test client backed by a fresh in-memory store."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app import storage
from app.main import app


@pytest.fixture(autouse=True)
def _isolated_config(tmp_path, monkeypatch):
    """Point CONFIG_DIR at an empty temp dir so repo config/ never leaks into tests."""
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))


@pytest.fixture
def client():
    store = storage.MemoryStorage()
    app.dependency_overrides[storage.get_storage] = lambda: store
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
