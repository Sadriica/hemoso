"""API tests: health, store and read back, ordering, and indicator checks."""

from __future__ import annotations

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


def test_ordering(client):
    client.post("/entries", json={**ENTRY, "mission_day": 2, "time": "08:00"})
    client.post("/entries", json={**ENTRY, "mission_day": 1, "time": "20:00"})

    history = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/history"
    )
    assert [row["mission_day"] for row in history.json()] == [1, 2]
    assert [row["time"] for row in history.json()] == ["20:00", "08:00"]


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
