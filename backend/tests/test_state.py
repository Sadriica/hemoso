"""The baseline state rule: the team's shared vectors and the state route.

`scripts/fixtures/format_rules/baseline.json` and `attention.json` are the same
cases `scripts/format_rules.py` and the frontend are checked against, so the
backend answers the decision exactly as the rest of the team does.
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from app import storage
from app.main import app
from app.models import Entry
from app.state import attention_for, baseline, state_for, window

FIXTURES = (
    Path(__file__).resolve().parents[2] / "scripts" / "fixtures" / "format_rules"
)
BASELINE = json.loads((FIXTURES / "baseline.json").read_text(encoding="utf-8"))
ATTENTION = json.loads((FIXTURES / "attention.json").read_text(encoding="utf-8"))

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "example_indicator,Example indicator,example_unit,both,example measurement,"
    "isolation_and_confinement,4,B,neuro_behavioural,Assumption\n"
)

ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    "example_indicator,above,84,example_level_high,crew,Assumption\n"
    "example_indicator,below,56,example_level_low,cmo,Assumption\n"
)

ENTRY = {
    "person_id": "demo_astronaut_1",
    "indicator_id": "example_indicator",
    "value": 70.0,
    "unit": "example_unit",
    "mission_day": 1,
    "time": "08:00",
    "context": "rest",
}


def write_config(tmp_path: Path, attention: str = ATTENTION_CSV) -> None:
    """The two config rows the state route reads, in the test's CONFIG_DIR."""
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "indicators.csv").write_text(INDICATORS_CSV)
    (tmp_path / "rules").mkdir()
    (tmp_path / "rules" / "attention.csv").write_text(attention)


def post_entries(
    client, values: list[float], context: str = "rest", first_day: int = 1
) -> None:
    for day, value in enumerate(values, start=first_day):
        response = client.post(
            "/entries",
            json={**ENTRY, "value": value, "mission_day": day, "context": context},
        )
        assert response.status_code == 201


def entry(day: int, value: float, context: str = "rest") -> Entry:
    return Entry(**{**ENTRY, "value": value, "mission_day": day, "context": context})


def attention_row(boundary: float, median: float) -> dict:
    """The baseline vector's boundary as one attention row, from its side."""
    return {
        "indicator_id": "example_indicator",
        "side": "above" if boundary >= median else "below",
        "threshold": boundary,
        "attention_level": "example_level",
        "notify": "crew",
        "source": "Assumption",
    }


@pytest.mark.parametrize("case", BASELINE["cases"], ids=lambda case: case["name"])
def test_baseline_vectors(case):
    given = case["input"]
    attention = None
    if given["boundary"] is not None:
        row = attention_row(given["boundary"], given["median"])
        attention = attention_for([row], given["value"])

    got = state_for(given["value"], given["median"], given["spread"], attention)

    assert got == case["expected"]


@pytest.mark.parametrize("case", ATTENTION["cases"], ids=lambda case: case["name"])
def test_attention_vectors(case):
    row = attention_for(case["input"]["rows"], case["input"]["value"])
    got = (
        None
        if row is None
        else {"attention_level": row["attention_level"], "notify": row["notify"]}
    )

    assert got == case["expected"]


def test_two_entries_give_no_baseline():
    assert baseline([70.0, 71.0], 4) == (None, None)


def test_flat_history_uses_the_noise_floor():
    assert baseline([70.0, 70.0, 70.0], 4) == (70.0, 4.0)


def test_mad_above_the_floor_sets_the_spread():
    median, spread = baseline([60.0, 70.0, 80.0], 4)

    assert median == 70.0
    assert spread == pytest.approx(1.4826 * 10)


def test_window_keeps_the_last_fourteen_in_the_same_context():
    entries = [entry(day, float(day)) for day in range(1, 21)]
    entries.insert(10, entry(5, 99.0, context="after_exercise"))

    kept = window(entries, "rest")

    assert [row.value for row in kept] == [float(day) for day in range(7, 21)]


def test_state_route_no_data_with_two_entries(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 71.0])

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72"
    )

    assert response.status_code == 200
    assert response.json() == {
        "state": "no_data",
        "median": None,
        "spread": None,
        "n": 2,
        "attention": None,
    }


def test_state_route_no_data_stops_before_attention(client, tmp_path):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=90"
    )

    assert response.json()["state"] == "no_data"
    assert response.json()["attention"] is None


def test_state_route_compares_with_the_stored_history(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 70.0, 70.0])

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72"
    )

    assert response.json() == {
        "state": "in_range",
        "median": 70.0,
        "spread": 4.0,
        "n": 3,
        "attention": None,
    }


def test_state_route_uses_only_the_requested_context(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 70.0, 70.0])
    post_entries(client, [40.0, 40.0, 40.0], context="after_exercise", first_day=10)

    rest = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72"
    )
    exercised = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state"
        "?value=72&context=after_exercise"
    )

    assert rest.json()["state"] == "in_range"
    assert rest.json()["n"] == 3
    assert exercised.json()["state"] == "outside_range"
    assert exercised.json()["median"] == 40.0


def test_state_route_returns_the_attention_row_that_matched(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 70.0, 70.0])

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=90"
    )

    assert response.json()["state"] == "needs_review"
    assert response.json()["attention"] == {
        "attention_level": "example_level_high",
        "notify": "crew",
        "source": "Assumption",
    }


def test_state_route_most_severe_attention_row_wins(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 70.0, 70.0])

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=50"
    )

    assert response.json()["state"] == "needs_review"
    assert response.json()["attention"]["notify"] == "cmo"
    assert response.json()["attention"]["attention_level"] == "example_level_low"


def test_state_route_unknown_indicator_is_404(client, tmp_path):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/other_indicator/state?value=72"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "unknown indicator"


def test_state_route_missing_indicators_file_is_404(client, tmp_path):
    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72"
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    "person_id, indicator_id",
    [
        ("Bad-id", "example_indicator"),
        ("demo_astronaut_1", "9bad"),
    ],
)
def test_state_route_invalid_path_id_is_422(client, person_id, indicator_id):
    response = client.get(f"/people/{person_id}/indicators/{indicator_id}/state?value=72")

    assert response.status_code == 422


@pytest.mark.parametrize("query", ["", "?value=abc", "?value=NaN"])
def test_state_route_invalid_value_is_422(client, tmp_path, query):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state" + query
    )

    assert response.status_code == 422


def test_state_route_invalid_context_is_422(client, tmp_path):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state"
        "?value=72&context=running"
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "context must be rest, after_exercise, on_waking or before_sleep"
    )


def test_state_route_upstream_error_becomes_502(client, tmp_path):
    write_config(tmp_path)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    failing = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    app.dependency_overrides[storage.get_storage] = lambda: failing

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72"
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"
