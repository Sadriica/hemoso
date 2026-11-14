"""Supabase adapter request shape, with httpx.MockTransport (no network)."""

from __future__ import annotations

import httpx

from app import storage
from app.models import Entry

URL = "https://example.supabase.co"
NEW_KEY = "sb_secret_abcdef123456"
LEGACY_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature"


def make_entry() -> Entry:
    return Entry(
        person_id="demo_astronaut_1",
        indicator_id="example_indicator",
        value=1.5,
        unit="example_unit",
        mission_day=1,
        time="13:30",
    )


def test_supabase_add_request_shape():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        captured["body"] = request.content.decode()
        return httpx.Response(201)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)
    store.add(make_entry())

    assert captured["method"] == "POST"
    assert captured["url"] == f"{URL}/rest/v1/entries"
    assert captured["headers"]["apikey"] == NEW_KEY
    assert "Authorization" not in captured["headers"]
    assert '"person_id":"demo_astronaut_1"' in captured["body"]


def test_supabase_history_request_shape():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["headers"] = request.headers
        captured["params"] = dict(request.url.params)
        return httpx.Response(200, json=[make_entry().model_dump()])

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)
    result = store.history("demo_astronaut_1", "example_indicator")

    assert captured["method"] == "GET"
    assert captured["url"].startswith(f"{URL}/rest/v1/entries")
    assert captured["headers"]["apikey"] == NEW_KEY
    assert "Authorization" not in captured["headers"]
    assert captured["params"]["person_id"] == "eq.demo_astronaut_1"
    assert captured["params"]["indicator_id"] == "eq.example_indicator"
    assert captured["params"]["order"] == "mission_day.asc,time.asc"
    assert result == [make_entry()]


def test_supabase_legacy_jwt_key_sends_bearer():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["headers"] = request.headers
        return httpx.Response(201)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, LEGACY_KEY, client=client)
    store.add(make_entry())

    assert captured["headers"]["apikey"] == LEGACY_KEY
    assert captured["headers"]["Authorization"] == f"Bearer {LEGACY_KEY}"
