"""API tests: health, store and read back, ordering, and indicator checks."""

from __future__ import annotations

import httpx
import pytest

from app import storage
from app.main import app

ENTRY = {
    "person_id": "demo_astronaut_1",
    "indicator_id": "example_indicator",
    "value": 1.5,
    "unit": "example_unit",
    "mission_day": 1,
    "time": "13:30",
}

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,source\n"
    "example_indicator,Example indicator,example_unit,higher,"
    "example measurement method,isolation_and_confinement,Assumption\n"
)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_store_and_read_back(client):
    created = client.post("/entries", json=ENTRY)
    assert created.status_code == 201
    assert created.json()["value"] == 1.5

    history = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/history"
    )
    assert history.status_code == 200
    assert history.json() == [ENTRY]


def test_resend_same_entry_returns_200_and_one_row(client):
    first = client.post("/entries", json=ENTRY)
    assert first.status_code == 201

    second = client.post("/entries", json=ENTRY)
    assert second.status_code == 200
    assert second.json() == ENTRY

    history = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/history"
    )
    assert len(history.json()) == 1


def test_resend_different_value_returns_409(client):
    client.post("/entries", json=ENTRY)

    conflict = client.post("/entries", json={**ENTRY, "value": 2.0})
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == (
        "an entry for this person, indicator, day and time already exists"
        " with a different value"
    )


def test_resend_different_unit_returns_409(client):
    client.post("/entries", json=ENTRY)

    conflict = client.post("/entries", json={**ENTRY, "unit": "other_unit"})
    assert conflict.status_code == 409


def test_ordering(client):
    client.post("/entries", json={**ENTRY, "mission_day": 2, "time": "08:00"})
    client.post("/entries", json={**ENTRY, "mission_day": 1, "time": "20:00"})

    history = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/history"
    )
    assert [row["mission_day"] for row in history.json()] == [1, 2]
    assert [row["time"] for row in history.json()] == ["20:00", "08:00"]


@pytest.mark.parametrize("bad_value", ["NaN", "Infinity", "-Infinity"])
def test_non_finite_value_rejected(client, bad_value):
    response = client.post("/entries", json={**ENTRY, "value": bad_value})
    assert response.status_code == 422


def test_unit_mismatch(client, tmp_path, monkeypatch):
    data = tmp_path / "data"
    data.mkdir()
    (data / "indicators.csv").write_text(INDICATORS_CSV)
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))

    response = client.post("/entries", json={**ENTRY, "unit": "wrong_unit"})
    assert response.status_code == 422
    assert response.json()["detail"] == "unit mismatch"


def test_unknown_indicator(client, tmp_path, monkeypatch):
    data = tmp_path / "data"
    data.mkdir()
    (data / "indicators.csv").write_text(INDICATORS_CSV)
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))

    response = client.post("/entries", json={**ENTRY, "indicator_id": "unknown_ind"})
    assert response.status_code == 422
    assert response.json()["detail"] == "unknown indicator"


def test_missing_indicators_file_accepts_any(client, tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    response = client.post("/entries", json={**ENTRY, "indicator_id": "anything_goes"})
    assert response.status_code == 201


def test_indicators_csv_with_bom(client, tmp_path, monkeypatch):
    data = tmp_path / "data"
    data.mkdir()
    (data / "indicators.csv").write_text("\ufeff" + INDICATORS_CSV, encoding="utf-8")
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))

    response = client.post("/entries", json=ENTRY)
    assert response.status_code == 201


def test_cors_preflight(client):
    response = client.options(
        "/entries",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "content-type" in response.headers["access-control-allow-headers"].lower()


@pytest.mark.parametrize(
    "field, bad",
    [
        ("person_id", "a" * 65),
        ("indicator_id", "a" * 65),
        ("unit", "a" * 65),
    ],
)
def test_string_fields_max_length(client, field, bad):
    response = client.post("/entries", json={**ENTRY, field: bad})
    assert response.status_code == 422


def test_mission_day_upper_bound(client):
    response = client.post("/entries", json={**ENTRY, "mission_day": 100001})
    assert response.status_code == 422


def test_mission_day_at_bound(client):
    response = client.post("/entries", json={**ENTRY, "mission_day": 100000})
    assert response.status_code == 201


@pytest.mark.parametrize(
    "field, bad",
    [
        ("value", True),
        ("value", "1_000"),
        ("mission_day", True),
        ("mission_day", "3"),
    ],
)
def test_strict_value_and_mission_day(client, field, bad):
    response = client.post("/entries", json={**ENTRY, field: bad})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "person_id, indicator_id",
    [
        ("Bad-id", "example_indicator"),
        ("demo_astronaut_1", "9bad"),
    ],
)
def test_history_invalid_path_id(client, person_id, indicator_id):
    response = client.get(f"/people/{person_id}/indicators/{indicator_id}/history")
    assert response.status_code == 422


def test_history_upstream_error_becomes_502(client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    failing = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    app.dependency_overrides[storage.get_storage] = lambda: failing
    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/history"
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"


def test_create_entry_upstream_error_becomes_502(client):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    failing = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    app.dependency_overrides[storage.get_storage] = lambda: failing
    response = client.post("/entries", json=ENTRY)
    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"
