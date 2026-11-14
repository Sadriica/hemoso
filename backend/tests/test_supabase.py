"""Supabase adapter request shape, with httpx.MockTransport (no network)."""

from __future__ import annotations

import httpx
import pytest

from app import storage
from app.models import Entry

URL = "https://example.supabase.co"
NEW_KEY = "sb_secret_x"
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


def key_params(entry: Entry) -> dict[str, str]:
    return {
        "person_id": f"eq.{entry.person_id}",
        "indicator_id": f"eq.{entry.indicator_id}",
        "mission_day": f"eq.{entry.mission_day}",
        "time": f"eq.{entry.time}",
    }


def test_supabase_add_new_entry():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(201, json=make_entry().model_dump())

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)
    stored, created = store.add(make_entry())

    assert created is True
    assert stored == make_entry()
    assert [r.method for r in requests] == ["GET", "POST"]
    post = requests[1]
    assert str(post.url) == f"{URL}/rest/v1/entries"
    assert post.headers["apikey"] == NEW_KEY
    assert "Authorization" not in post.headers
    assert '"person_id":"demo_astronaut_1"' in post.content.decode()


def test_supabase_add_reads_by_natural_key():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            captured["params"] = dict(request.url.params)
            return httpx.Response(200, json=[])
        return httpx.Response(201)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)
    store.add(make_entry())

    assert captured["params"] == key_params(make_entry())


def test_supabase_add_existing_same_value_skips_write():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=[make_entry().model_dump()])

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)
    stored, created = store.add(make_entry())

    assert created is False
    assert stored == make_entry()
    assert [r.method for r in requests] == ["GET"]


def test_supabase_add_conflicting_value_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json=[{**make_entry().model_dump(), "value": 2.5}]
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)

    with pytest.raises(storage.EntryConflict):
        store.add(make_entry())


def test_supabase_add_conflicting_context_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json=[{**make_entry().model_dump(), "context": "after_exercise"}]
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, NEW_KEY, client=client)

    with pytest.raises(storage.EntryConflict):
        store.add(make_entry())


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
        if request.method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(201)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage(URL, LEGACY_KEY, client=client)
    store.add(make_entry())

    assert captured["headers"]["apikey"] == LEGACY_KEY
    assert captured["headers"]["Authorization"] == f"Bearer {LEGACY_KEY}"
