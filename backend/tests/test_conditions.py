"""The evidence score rule: the finding's vectors and the conditions route.

`docs/findings/bio2-02-evidence-score.md` fixes the rule and its vectors. The
vectors are checked on the pure functions with the baseline each cell of the
table names (a median and a noise floor per indicator), and the route is checked
on a stored history, so the window and the context rule come from real entries.
"""

from __future__ import annotations

from pathlib import Path

import httpx
import pytest

from app import storage
from app.conditions import (
    LatestValue,
    SignalScore,
    condition_result,
    label_for,
    latest_value,
    parse_signals,
    score_for,
    signal_point,
)
from app.main import app
from app.models import Entry

REPO_CONFIG = Path(__file__).resolve().parents[2] / "config"

# A source with a link: only these rows count as a crossed limit (phys-02).
CITED = "https://example.org/limit"

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "hr_bpm,Heart rate,bpm,both,example measurement,,4,A,cardiovascular,Assumption\n"
    "bp_sys_mmhg,Systolic blood pressure,mmHg,both,example measurement,,5,A,"
    "cardiovascular,Assumption\n"
    "bp_dia_mmhg,Diastolic blood pressure,mmHg,both,example measurement,,4,A,"
    "cardiovascular,Assumption\n"
    "glucose_mgdl,Blood glucose,mg/dL,both,example measurement,,8,A,metabolic,"
    "Assumption\n"
)

ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    f"hr_bpm,above,100,consult,cmo,{CITED}\n"
    f"hr_bpm,below,50,consult,cmo,{CITED}\n"
    f"bp_sys_mmhg,above,140,consult,cmo,{CITED}\n"
    f"bp_sys_mmhg,above,180,urgent,flight_surgeon,{CITED}\n"
    f"bp_dia_mmhg,above,90,consult,cmo,{CITED}\n"
    f"bp_dia_mmhg,above,120,urgent,flight_surgeon,{CITED}\n"
)

CONDITIONS_CSV = (
    "condition_id,name,based_on,source\n"
    "orthostatic_intolerance,Orthostatic intolerance,"
    "hr_bpm:above bp_sys_mmhg:below bp_dia_mmhg:below,Assumption\n"
    "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,Assumption\n"
)

ENTRY = {
    "person_id": "demo_astronaut_1",
    "indicator_id": "hr_bpm",
    "value": 70.0,
    "unit": "bpm",
    "mission_day": 1,
    "time": "07:00",
    "context": "rest",
}

UNITS = {"hr_bpm": "bpm", "bp_sys_mmhg": "mmHg", "bp_dia_mmhg": "mmHg"}


def write_config(tmp_path: Path, conditions: str = CONDITIONS_CSV) -> None:
    """The three config rows the conditions route reads, in the CONFIG_DIR."""
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "indicators.csv").write_text(INDICATORS_CSV)
    (tmp_path / "rules").mkdir(exist_ok=True)
    (tmp_path / "rules" / "attention.csv").write_text(ATTENTION_CSV)
    (tmp_path / "rules" / "conditions.csv").write_text(conditions)


def post_history(
    client,
    indicator_id: str,
    values: list[float],
    time: str,
    context: str = "rest",
    first_day: int = 1,
) -> None:
    for day, value in enumerate(values, start=first_day):
        response = client.post(
            "/entries",
            json={
                **ENTRY,
                "indicator_id": indicator_id,
                "unit": UNITS[indicator_id],
                "value": value,
                "mission_day": day,
                "time": time,
                "context": context,
            },
        )
        assert response.status_code == 201, response.text


def entry(day: int, value: float, context: str = "rest") -> Entry:
    return Entry(**{**ENTRY, "value": value, "mission_day": day, "context": context})


def attention_row(
    indicator_id: str,
    side: str,
    threshold: float,
    notify: str = "cmo",
    source: str = CITED,
) -> dict:
    return {
        "indicator_id": indicator_id,
        "side": side,
        "threshold": float(threshold),
        "attention_level": f"example_{side}",
        "notify": notify,
        "source": source,
    }


HR_ROWS = (attention_row("hr_bpm", "above", 100), attention_row("hr_bpm", "below", 50))
SYS_ROWS = (
    attention_row("bp_sys_mmhg", "above", 140),
    attention_row("bp_sys_mmhg", "above", 180, "flight_surgeon"),
)
DIA_ROWS = (
    attention_row("bp_dia_mmhg", "above", 90),
    attention_row("bp_dia_mmhg", "above", 120, "flight_surgeon"),
)

# Median, noise floor and attention rows behind each column of the vectors, so
# the "in baseline" and "outside baseline" cells of the table hold.
BASELINES: dict[str, tuple[float, float, tuple[dict, ...]]] = {
    "hr_bpm": (70.0, 4.0, HR_ROWS),
    "bp_sys_mmhg": (118.0, 5.0, SYS_ROWS),
    "bp_dia_mmhg": (74.0, 4.0, DIA_ROWS),
}

SIGNALS = (
    ("hr_bpm", "above"),
    ("bp_sys_mmhg", "below"),
    ("bp_dia_mmhg", "below"),
)

# The finding's test vectors, without the fourth, which is below.
VECTORS = (
    ("all_in_baseline", 68.0, 118.0, 75.0, (0.0, 0.0, 0.0), 0.0, "low"),
    ("one_outside", 88.0, 110.0, 75.0, (0.5, 0.0, 0.0), 0.167, "low"),
    ("attention_and_outside", 112.0, 95.0, 62.0, (1.0, 0.5, 0.0), 0.5, "possible"),
)


def latest_readings(hr: float, sys_mmhg: float, dia: float) -> dict[str, LatestValue]:
    """One reading per signal, on the baseline its vector column names."""
    values = {"hr_bpm": hr, "bp_sys_mmhg": sys_mmhg, "bp_dia_mmhg": dia}
    return {
        indicator_id: LatestValue(
            value, "rest", *BASELINES[indicator_id][:2], BASELINES[indicator_id][2]
        )
        for indicator_id, value in values.items()
    }


def orthostatic_row() -> dict[str, str]:
    return {
        "condition_id": "orthostatic_intolerance",
        "name": "Orthostatic intolerance",
        "based_on": "hr_bpm:above bp_sys_mmhg:below bp_dia_mmhg:below",
        "source": "Assumption",
    }


@pytest.mark.parametrize("case", VECTORS, ids=lambda case: case[0])
def test_finding_vector(case):
    _, hr, sys_mmhg, dia, expected_points, expected_score, expected_label = case
    latest = latest_readings(hr, sys_mmhg, dia)

    result = condition_result(orthostatic_row(), latest)

    assert tuple(signal.contribution for signal in result.signals) == expected_points
    assert result.score == pytest.approx(expected_score, abs=1e-9)
    assert result.label == expected_label


def test_finding_vector_four_reads_the_diastolic_on_its_own_side():
    """The fourth vector keeps one point per signal but loses the diastolic one.

    The finding's table reads 1 + 0.5 + 0.5 and 0.667 "review", and names
    `based_on` as the three ids without sides. With the side, a diastolic of 120
    is above the baseline of a `below` signal, so it adds 0: the finding's own
    rule "a value on the wrong side of the condition adds 0, whatever its
    distance from the baseline", FORMATS.md point 3 and the route all say so,
    and the condition scores 0.5 "possible" instead.
    """
    latest = latest_readings(130.0, 88.0, 120.0)

    result = condition_result(orthostatic_row(), latest)

    assert tuple(signal.contribution for signal in result.signals) == (1.0, 0.5, 0.0)
    assert result.score == 0.5
    assert result.label == "possible"


def test_finding_vector_with_one_signal_is_no_data():
    """A row without symptoms keeps the score it had before T-79.

    HR 112 crossed the cited row above 100, but it is the only usable signal of
    a four-cell row: `no_data`, as the finding's last vector and the T-78
    vector "four-cell row after the change: same score as before" say. The
    single-boundary exception of T-78 rule 3 applies only to rows that list
    symptoms (`test_one_crossed_boundary_scores_alone_in_a_row_with_symptoms`).
    """
    latest = {
        "hr_bpm": LatestValue(112.0, "rest", 70.0, 4.0, HR_ROWS),
        "bp_sys_mmhg": LatestValue(95.0, "rest", None, None, ()),
        "bp_dia_mmhg": None,
    }

    result = condition_result(orthostatic_row(), latest)

    assert tuple(signal.contribution for signal in result.signals) == (1.0, None, None)
    assert tuple(signal.value for signal in result.signals) == (112.0, 95.0, None)
    assert result.score is None
    assert result.label == "no_data"


def test_one_crossed_boundary_scores_alone_in_a_row_with_symptoms():
    """T-78 rule 3: in a row that lists symptoms, one crossed boundary scores."""
    latest = {
        "hr_bpm": LatestValue(112.0, "rest", 70.0, 4.0, HR_ROWS),
        "bp_sys_mmhg": LatestValue(95.0, "rest", None, None, ()),
        "bp_dia_mmhg": None,
    }
    row = {**orthostatic_row(), "symptoms": "dizziness"}

    result = condition_result(row, latest)

    assert result.score == 1.0
    assert result.label == "review"


def test_one_usable_signal_without_a_boundary_is_no_data():
    """One reading, no boundary crossed, nothing else: `no_data`, never a score."""
    latest = {
        "hr_bpm": LatestValue(88.0, "rest", 70.0, 4.0, HR_ROWS),
        "bp_sys_mmhg": None,
        "bp_dia_mmhg": None,
    }

    result = condition_result(orthostatic_row(), latest)

    assert result.score is None
    assert result.label == "no_data"


def test_no_usable_signal_is_no_data():
    result = condition_result(orthostatic_row(), {indicator: None for indicator, _ in SIGNALS})

    assert result.score is None
    assert result.label == "no_data"


def test_high_glucose_adds_nothing_to_a_low_glucose_condition():
    latest = LatestValue(180.0, "rest", 100.0, 8.0, ())

    assert signal_point(latest, "below") == 0.0
    assert signal_point(latest, "above") == 0.5


def test_low_glucose_adds_nothing_to_a_high_glucose_condition():
    latest = LatestValue(60.0, "rest", 100.0, 8.0, ())

    assert signal_point(latest, "above") == 0.0
    assert signal_point(latest, "below") == 0.5


def test_a_row_on_the_other_side_does_not_count():
    rows = (attention_row("glucose_mgdl", "above", 126),)
    latest = LatestValue(180.0, "rest", 100.0, 8.0, rows)

    assert signal_point(latest, "below") == 0.0
    assert signal_point(latest, "above") == 1.0


def test_a_value_on_the_threshold_crosses_the_row():
    """Q4: the threshold counts, so 100 bpm on a cited "above 100" row adds 1."""
    latest = LatestValue(100.0, "rest", 70.0, 4.0, HR_ROWS)

    assert signal_point(latest, "above") == 1.0


def test_a_cited_limit_counts_without_a_baseline():
    latest = LatestValue(112.0, "rest", None, None, HR_ROWS)

    assert signal_point(latest, "above") == 1.0
    assert signal_point(latest, "below") is None


def test_no_baseline_and_no_limit_crossed_is_not_usable():
    latest = LatestValue(80.0, "rest", None, None, HR_ROWS)

    assert signal_point(latest, "above") is None


def test_latest_value_drops_assumption_rows():
    rows = (
        attention_row("hr_bpm", "above", 100, source="Assumption"),
        attention_row("hr_bpm", "below", 50),
    )

    latest = latest_value([entry(1, 70.0)], 4.0, rows)

    assert latest is not None
    assert latest.attention == (rows[1],)


def test_an_assumption_limit_adds_only_the_baseline_point():
    rows = (attention_row("hr_bpm", "above", 100, source="Assumption"),)
    entries = [entry(day, 70.0) for day in range(1, 15)] + [entry(15, 112.0)]

    latest = latest_value(entries, 4.0, rows)

    assert signal_point(latest, "above") == 0.5


@pytest.mark.parametrize(
    ("score", "label"),
    [
        (None, "no_data"),
        (0.0, "low"),
        (0.167, "low"),
        (0.3, "possible"),
        (0.5, "possible"),
        (0.6, "review"),
        (0.667, "review"),
        (1.0, "review"),
    ],
)
def test_labels(score, label):
    assert label_for(score) == label


def test_one_crossed_boundary_scores_alone_with_single_boundary():
    assert score_for([SignalScore(1.0, 1.0)], single_boundary=True) == 1.0
    assert score_for([SignalScore(1.0, 0.5)], single_boundary=True) is None


@pytest.mark.parametrize(
    ("signals", "expected"),
    [
        ([], None),
        ([SignalScore(1.0, 0.5)], None),
        ([SignalScore(1.0, 0.0)], None),
        ([SignalScore(1.0, None), SignalScore(1.0, None)], None),
        # One crossed boundary alone: no_data unless the row lists symptoms.
        ([SignalScore(1.0, 1.0)], None),
        ([SignalScore(1.0, 0.0), SignalScore(1.0, 1.0)], 0.5),
        ([SignalScore(1.0, 0.0), SignalScore(1.0, 1.0), SignalScore(1.0, 0.5)], 0.5),
        ([SignalScore(1.0, 0.0), SignalScore(1.0, 0.0), SignalScore(1.0, 0.0)], 0.0),
        # The weighted mean: 0 * 1 + 1 * 0.5 over 1.5.
        ([SignalScore(1.0, 0.0), SignalScore(0.5, 1.0, "symptom")], 1 / 3),
        # A symptom-only score stops at the cap.
        (
            [
                SignalScore(0.5, 1.0, "symptom"),
                SignalScore(0.5, 1.0, "symptom"),
            ],
            0.5,
        ),
        # One symptom alone is no_data, capped or not.
        ([SignalScore(0.5, 1.0, "symptom")], None),
    ],
)
def test_score_is_the_weighted_mean_of_the_usable_signals(signals, expected):
    assert score_for(signals) == expected


def test_parse_signals_keeps_the_side_and_flags_a_missing_one():
    assert parse_signals("hr_bpm:above bp_sys_mmhg:below") == [
        ("hr_bpm", "above"),
        ("bp_sys_mmhg", "below"),
    ]
    assert parse_signals("glucose_mgdl no_side:sideways") == [
        ("glucose_mgdl", None),
        ("no_side", None),
    ]


def test_no_entries_has_no_latest_value():
    assert latest_value([], 4.0, HR_ROWS) is None


def test_latest_value_uses_the_last_fourteen_days_before_the_reading():
    entries = [entry(day, float(day)) for day in range(1, 21)]

    latest = latest_value(entries, 4.0, HR_ROWS)

    assert latest is not None
    assert latest.value == 20.0
    # The reading is not part of its own window: days 6 to 19 are 14 days.
    assert latest.median == pytest.approx(12.5)
    assert latest.spread == pytest.approx(1.4826 * 3.5)


def test_latest_value_averages_each_day():
    entries = (
        [entry(1, 60.0)]
        + [entry(1, 120.0)] * 9
        + [entry(2, 61.0), entry(3, 62.0), entry(4, 70.0)]
    )

    latest = latest_value(entries, 4.0, HR_ROWS)

    assert latest is not None
    # Day 1 is 114, day 2 is 61 and day 3 is 62: the median of the days is 62,
    # while the median of the twelve readings would be 120.
    assert latest.median == 62.0
    assert latest.spread == 4.0


def test_latest_value_is_not_part_of_its_own_window():
    entries = [entry(1, 70.0), entry(2, 72.0), entry(3, 400.0)]

    latest = latest_value(entries, 4.0, HR_ROWS)

    assert latest is not None
    assert latest.value == 400.0
    assert latest.median is None
    # The cited rows stay: a crossed limit does not need a baseline (bio2-02).
    assert latest.attention == HR_ROWS


def test_latest_value_without_a_noise_floor_has_no_baseline():
    entries = [entry(day, 70.0) for day in range(1, 5)]

    latest = latest_value(entries, None, HR_ROWS)

    assert latest is not None
    assert latest.value == 70.0
    assert latest.median is None
    assert latest.attention == ()


def test_conditions_route_scores_the_stored_history(client, tmp_path):
    write_config(tmp_path)
    post_history(client, "hr_bpm", [70.0] * 14 + [112.0], "07:00")
    post_history(client, "bp_sys_mmhg", [118.0] * 14 + [95.0], "07:10")
    post_history(client, "bp_dia_mmhg", [74.0] * 15, "07:10")

    response = client.get("/people/demo_astronaut_1/conditions")

    assert response.status_code == 200
    condition = response.json()[0]
    assert condition["condition_id"] == "orthostatic_intolerance"
    assert condition["score"] == 0.5
    assert condition["label"] == "possible"
    assert condition["signals"] == [
        {"indicator_id": "hr_bpm", "side": "above", "contribution": 1.0, "value": 112.0},
        {
            "indicator_id": "bp_sys_mmhg",
            "side": "below",
            "contribution": 0.5,
            "value": 95.0,
        },
        {
            "indicator_id": "bp_dia_mmhg",
            "side": "below",
            "contribution": 0.0,
            "value": 74.0,
        },
    ]


def test_conditions_route_compares_each_signal_in_its_own_context(client, tmp_path):
    write_config(tmp_path)
    post_history(client, "hr_bpm", [70.0] * 14, "07:00")
    post_history(client, "hr_bpm", [95.0], "18:00", context="after_exercise", first_day=15)
    post_history(client, "bp_sys_mmhg", [118.0] * 15, "07:10")
    post_history(client, "bp_dia_mmhg", [74.0] * 15, "07:10")

    response = client.get("/people/demo_astronaut_1/conditions")

    condition = response.json()[0]
    # The newest heart rate is after exercise, and one such reading has no
    # baseline and crosses no limit: it is shown and left out of the score.
    assert condition["signals"][0] == {
        "indicator_id": "hr_bpm",
        "side": "above",
        "contribution": None,
        "value": 95.0,
    }
    assert condition["score"] == 0.0
    assert condition["label"] == "low"


def test_conditions_route_single_signal_condition_is_no_data(client, tmp_path):
    write_config(tmp_path)

    response = client.get("/people/demo_astronaut_1/conditions")

    assert response.status_code == 200
    condition = response.json()[1]
    assert condition["condition_id"] == "hyperglycaemia"
    assert condition["score"] is None
    assert condition["label"] == "no_data"
    assert condition["signals"] == [
        {
            "indicator_id": "glucose_mgdl",
            "side": "above",
            "contribution": None,
            "value": None,
        }
    ]


def test_conditions_route_shape(client, tmp_path):
    write_config(tmp_path)

    body = client.get("/people/demo_astronaut_1/conditions").json()

    assert [condition["condition_id"] for condition in body] == [
        "orthostatic_intolerance",
        "hyperglycaemia",
    ]
    for condition in body:
        assert set(condition) == {
            "condition_id",
            "name",
            "score",
            "label",
            "signals",
            "source",
        }
        assert condition["score"] is None or 0.0 <= condition["score"] <= 1.0
        for signal in condition["signals"]:
            assert set(signal) == {"indicator_id", "side", "contribution", "value"}


def test_conditions_route_missing_file_is_an_empty_list(client):
    assert client.get("/people/demo_astronaut_1/conditions").json() == []


def test_conditions_route_never_says_the_person_has_the_condition(client, tmp_path):
    """The finding forbids a certainty about the person, in every field we write."""
    (tmp_path / "data").mkdir()
    (tmp_path / "rules").mkdir()
    for name in ("data/indicators.csv", "rules/attention.csv", "rules/conditions.csv"):
        (tmp_path / name).write_text(
            (REPO_CONFIG / name).read_text(encoding="utf-8"), encoding="utf-8"
        )

    body = client.get("/people/demo_astronaut_1/conditions").json()

    assert body
    for condition in body:
        # `source` is Bio 2's citation, quoted as written in conditions.csv.
        written = {key: value for key, value in condition.items() if key != "source"}
        text = str(written).lower()
        for forbidden in ("you have", "diagnosis", "certain", "confirmed"):
            assert forbidden not in text


@pytest.mark.parametrize("person_id", ["Bad-id", "9bad", "bad id"])
def test_conditions_route_invalid_person_id_is_422(client, tmp_path, person_id):
    write_config(tmp_path)

    response = client.get(f"/people/{person_id}/conditions")

    assert response.status_code == 422


def test_conditions_route_upstream_error_becomes_502(client, tmp_path):
    write_config(tmp_path)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    failing = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )
    app.dependency_overrides[storage.get_storage] = lambda: failing

    response = client.get("/people/demo_astronaut_1/conditions")

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"
