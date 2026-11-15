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
from app.state import (
    attention_for,
    baseline,
    cited_rows,
    is_cited,
    state_for,
    window,
    worse_state,
)

FIXTURES = (
    Path(__file__).resolve().parents[2] / "scripts" / "fixtures" / "format_rules"
)
BASELINE = json.loads((FIXTURES / "baseline.json").read_text(encoding="utf-8"))
ATTENTION = json.loads((FIXTURES / "attention.json").read_text(encoding="utf-8"))

# A source with a link: only these rows can raise needs_review (phys-02).
CITED = "https://example.org/limit"

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "example_indicator,Example indicator,example_unit,both,example measurement,"
    "isolation_and_confinement,4,B,neuro_behavioural,Assumption\n"
)

ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    f"example_indicator,above,84,example_level_high,crew,{CITED}\n"
    f"example_indicator,below,56,example_level_low,cmo,{CITED}\n"
)

# The same two rows with no link: they never raise needs_review (phys-02).
ASSUMPTION_ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    "example_indicator,above,84,example_level_high,crew,Assumption\n"
    "example_indicator,below,56,example_level_low,cmo,Assumption\n"
)

BLOOD_PRESSURE_INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "bp_sys_mmhg,Systolic blood pressure,mmHg,both,arm cuff,gravity_fields,"
    "5,A,cardiovascular,Assumption\n"
    "bp_dia_mmhg,Diastolic blood pressure,mmHg,both,arm cuff,gravity_fields,"
    "4,A,cardiovascular,Assumption\n"
)

# The rows of config/rules/attention.csv for the two blood pressure indicators.
BLOOD_PRESSURE_ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    f"bp_sys_mmhg,above,140,consult,cmo,{CITED}\n"
    f"bp_sys_mmhg,above,180,urgent,flight_surgeon,{CITED}\n"
    f"bp_dia_mmhg,above,90,consult,cmo,{CITED}\n"
    f"bp_dia_mmhg,above,120,urgent,flight_surgeon,{CITED}\n"
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
        "source": CITED,
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


def temperature_row(source: str) -> dict:
    """The limit of phys-02's new vectors: core temperature above 39.0."""
    return {
        "indicator_id": "temp_core_c",
        "side": "above",
        "threshold": 39.0,
        "attention_level": "example_level",
        "notify": "cmo",
        "source": source,
    }


@pytest.mark.parametrize(
    ("value", "source", "expected"),
    [
        (39.5, CITED, "needs_review"),
        (39.5, "Assumption", "no_data"),
        (37.0, CITED, "no_data"),
    ],
    ids=[
        "no baseline, cited limit crossed",
        "no baseline, Assumption limit crossed",
        "no baseline, below any limit",
    ],
)
def test_safety_order_vectors(value, source, expected):
    rows = cited_rows([temperature_row(source)])

    got = state_for(value, None, None, attention_for(rows, value))

    assert got == expected


def test_an_assumption_row_never_raises_needs_review_on_its_own():
    row = temperature_row("Assumption")

    assert state_for(39.5, None, None, row) == "no_data"
    assert state_for(39.5, 37.0, 0.2, row) == "outside_range"


@pytest.mark.parametrize(
    ("source", "expected"),
    [
        (CITED, True),
        (f"{CITED} https://example.org/other", True),
        ("Assumption", False),
        (f"{CITED} Assumption", False),
        ("", False),
        ("example.org", False),
    ],
)
def test_is_cited(source, expected):
    assert is_cited({"source": source}) is expected


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


def test_state_route_cited_limit_without_baseline_needs_review(client, tmp_path):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=90"
    )

    assert response.json()["state"] == "needs_review"
    assert response.json()["median"] is None
    assert response.json()["n"] == 0
    assert response.json()["attention"] == {
        "attention_level": "example_level_high",
        "notify": "crew",
        "source": CITED,
    }


def test_state_route_assumption_limit_without_baseline_is_no_data(client, tmp_path):
    write_config(tmp_path, ASSUMPTION_ATTENTION_CSV)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=90"
    )

    assert response.json()["state"] == "no_data"
    assert response.json()["attention"] is None


def test_state_route_assumption_limit_with_baseline_is_not_needs_review(
    client, tmp_path
):
    write_config(tmp_path, ASSUMPTION_ATTENTION_CSV)
    post_entries(client, [70.0, 70.0, 70.0])

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=90"
    )

    assert response.json()["state"] == "outside_range"
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
        "source": CITED,
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


# The worse of two states (FORMATS.md section 3, F-bio2-01).


@pytest.mark.parametrize(
    "first, second, expected",
    [
        ("in_range", "in_range", "in_range"),
        ("no_data", "in_range", "in_range"),
        ("in_range", "outside_range", "outside_range"),
        ("outside_range", "needs_review", "needs_review"),
        ("needs_review", "no_data", "needs_review"),
    ],
)
def test_worse_state_follows_the_state_order(first, second, expected):
    assert worse_state(first, second) == expected
    assert worse_state(second, first) == expected


def bp_entry(indicator_id: str, day: int, value: float) -> dict:
    return {
        "person_id": "demo_astronaut_1",
        "indicator_id": indicator_id,
        "value": value,
        "unit": "mmHg",
        "mission_day": day,
        "time": "08:00",
        "context": "rest",
    }


def write_blood_pressure_config(tmp_path: Path) -> None:
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "indicators.csv").write_text(BLOOD_PRESSURE_INDICATORS_CSV)
    (tmp_path / "rules").mkdir()
    (tmp_path / "rules" / "attention.csv").write_text(BLOOD_PRESSURE_ATTENTION_CSV)


def post_blood_pressure_history(client, systolic: float = 115.0, diastolic: float = 75.0):
    """Three earlier readings on each side, so both windows hold a baseline."""
    for day in (1, 2, 3):
        for indicator_id, value in (
            ("bp_sys_mmhg", systolic),
            ("bp_dia_mmhg", diastolic),
        ):
            response = client.post("/entries", json=bp_entry(indicator_id, day, value))
            assert response.status_code == 201


PRESSURE_VECTORS = [
    # systolic, diastolic, worse state, side carrying the attention row,
    # attention level, notify (F-bio2-01, "Test vectors").
    (118, 75, "in_range", None, None, None),
    (120, 95, "needs_review", "diastolic", "consult", "cmo"),
    (150, 70, "needs_review", "systolic", "consult", "cmo"),
    (145, 118, "needs_review", "systolic", "consult", "cmo"),
    (185, 100, "needs_review", "systolic", "urgent", "flight_surgeon"),
    (120, 125, "needs_review", "diastolic", "urgent", "flight_surgeon"),
]


@pytest.mark.parametrize(
    "systolic, diastolic, expected, side, level, notify",
    PRESSURE_VECTORS,
    ids=lambda value: str(value),
)
def test_blood_pressure_vectors(
    client, tmp_path, systolic, diastolic, expected, side, level, notify
):
    write_blood_pressure_config(tmp_path)
    post_blood_pressure_history(client)

    response = client.get(
        "/people/demo_astronaut_1/blood_pressure/state"
        f"?systolic={systolic}&diastolic={diastolic}"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["state"] == expected
    if side is None:
        assert body["systolic"]["attention"] is None
        assert body["diastolic"]["attention"] is None
    else:
        assert body[side]["attention"]["attention_level"] == level
        assert body[side]["attention"]["notify"] == notify


def test_blood_pressure_first_reading_past_cited_limits_needs_review(
    client, tmp_path
):
    """phys-02 safety order: 185/125 on the first day is not "no data yet"."""
    write_blood_pressure_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/blood_pressure/state?systolic=185&diastolic=125"
    )

    body = response.json()
    assert body["state"] == "needs_review"
    assert body["systolic"]["state"] == "needs_review"
    assert body["systolic"]["median"] is None
    assert body["systolic"]["attention"]["notify"] == "flight_surgeon"
    assert body["diastolic"]["state"] == "needs_review"
    assert body["diastolic"]["attention"]["attention_level"] == "urgent"


def test_blood_pressure_without_history_is_no_data(client, tmp_path):
    write_blood_pressure_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/blood_pressure/state?systolic=120&diastolic=80"
    )

    assert response.json() == {
        "state": "no_data",
        "systolic": {
            "state": "no_data",
            "median": None,
            "spread": None,
            "n": 0,
            "attention": None,
        },
        "diastolic": {
            "state": "no_data",
            "median": None,
            "spread": None,
            "n": 0,
            "attention": None,
        },
    }


def test_blood_pressure_uses_each_indicators_own_window(client, tmp_path):
    write_blood_pressure_config(tmp_path)
    post_blood_pressure_history(client)
    for day in (4, 5, 6):
        response = client.post("/entries", json=bp_entry("bp_sys_mmhg", day, 120.0))
        assert response.status_code == 201

    response = client.get(
        "/people/demo_astronaut_1/blood_pressure/state?systolic=120&diastolic=75"
    )

    assert response.json()["systolic"]["median"] == 117.5
    assert response.json()["systolic"]["n"] == 6
    assert response.json()["diastolic"]["n"] == 3


def test_blood_pressure_unknown_indicator_is_404(client, tmp_path):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/blood_pressure/state?systolic=120&diastolic=75"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "unknown indicator"


@pytest.mark.parametrize(
    "query",
    [
        "?diastolic=75",
        "?systolic=120",
        "?systolic=NaN&diastolic=75",
        "?systolic=120&diastolic=75&context=running",
        "?systolic=120&diastolic=75&mission_day=2",
        "?systolic=120&diastolic=75&time=09:00",
        "?systolic=120&diastolic=75&mission_day=0&time=09:00",
        "?systolic=120&diastolic=75&mission_day=abc&time=09:00",
        "?systolic=120&diastolic=75&mission_day=2&time=9:5",
    ],
)
def test_blood_pressure_bad_query_is_422(client, tmp_path, query):
    write_blood_pressure_config(tmp_path)

    response = client.get("/people/demo_astronaut_1/blood_pressure/state" + query)

    assert response.status_code == 422


def test_blood_pressure_invalid_person_id_is_422(client, tmp_path):
    write_blood_pressure_config(tmp_path)

    response = client.get(
        "/people/Bad-id/blood_pressure/state?systolic=120&diastolic=75"
    )

    assert response.status_code == 422


# The tested reading is not in its own window (T-68).


def test_window_drops_the_entry_at_the_given_day_and_time():
    entries = [entry(day, 70.0) for day in (1, 2, 3)] + [entry(4, 90.0)]

    kept = window(entries, "rest", (4, "08:00"))

    assert [row.value for row in kept] == [70.0, 70.0, 70.0]


def test_window_drops_entries_from_the_same_day_after_the_time():
    entries = [
        Entry(**{**ENTRY, "value": 70.0, "time": "08:00"}),
        Entry(**{**ENTRY, "value": 80.0, "time": "09:00"}),
        Entry(**{**ENTRY, "value": 90.0, "time": "10:00"}),
    ]

    kept = window(entries, "rest", (1, "10:00"))

    assert [row.value for row in kept] == [70.0, 80.0]


def test_state_route_leaves_out_the_stored_reading_being_tested(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 71.0], first_day=1)
    stored = client.post("/entries", json={**ENTRY, "value": 80.0, "mission_day": 3})
    assert stored.status_code == 201

    tested = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state"
        "?value=80&mission_day=3&time=08:00"
    )
    plain = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=80"
    )

    assert tested.json()["state"] == "no_data"
    assert tested.json()["n"] == 2
    assert plain.json()["state"] == "in_range"
    assert plain.json()["n"] == 3


def test_state_route_keeps_earlier_entries_and_drops_later_ones(client, tmp_path):
    write_config(tmp_path)
    post_entries(client, [70.0, 70.0, 70.0], first_day=1)
    later = client.post("/entries", json={**ENTRY, "value": 200.0, "mission_day": 5})
    assert later.status_code == 201

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state"
        "?value=72&mission_day=4&time=08:00"
    )

    assert response.json() == {
        "state": "in_range",
        "median": 70.0,
        "spread": 4.0,
        "n": 3,
        "attention": None,
    }


def test_blood_pressure_leaves_out_the_stored_reading_being_tested(client, tmp_path):
    write_blood_pressure_config(tmp_path)
    post_blood_pressure_history(client)
    for indicator_id, value in (("bp_sys_mmhg", 185.0), ("bp_dia_mmhg", 125.0)):
        response = client.post("/entries", json=bp_entry(indicator_id, 4, value))
        assert response.status_code == 201

    tested = client.get(
        "/people/demo_astronaut_1/blood_pressure/state"
        "?systolic=185&diastolic=125&mission_day=4&time=08:00"
    )
    plain = client.get(
        "/people/demo_astronaut_1/blood_pressure/state?systolic=185&diastolic=125"
    )

    assert tested.json()["systolic"]["n"] == 3
    assert tested.json()["diastolic"]["n"] == 3
    assert plain.json()["systolic"]["n"] == 4
    assert plain.json()["diastolic"]["n"] == 4
    assert tested.json()["systolic"]["median"] == 115.0


@pytest.mark.parametrize("query", ["&mission_day=2", "&time=09:00"])
def test_state_route_one_cutoff_parameter_is_422(client, tmp_path, query):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72" + query
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "mission_day and time must be given together"


@pytest.mark.parametrize(
    "query, detail",
    [
        ("&mission_day=0&time=09:00", "mission_day must be a positive integer"),
        ("&mission_day=2&time=9:5", "time must be HH:MM (24-hour)"),
    ],
)
def test_state_route_bad_cutoff_is_422(client, tmp_path, query, detail):
    write_config(tmp_path)

    response = client.get(
        "/people/demo_astronaut_1/indicators/example_indicator/state?value=72" + query
    )

    assert response.status_code == 422
    assert response.json()["detail"] == detail
