"""The test vectors of `team/bio2/notes/symptom-test-vectors.md` (T-78).

One test per row of the file's "Test vectors" table, named after the case, run
through `GET /people/{person_id}/conditions` on a synthetic history. The two
"row error at load" rows are the checker's job (`scripts/check_content.py`);
here they check the other half of the agreement: an unknown or repeated id in
the `symptoms` column does not crash the route.
"""

from __future__ import annotations

PERSON = "demo_astronaut_1"
GLUCOSE = "glucose_mgdl"
CITED = "https://example.org/limit"

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "glucose_mgdl,Blood glucose,mg/dL,both,example measurement,,8,A,metabolic,"
    "Assumption\n"
    "hr_bpm,Heart rate,bpm,both,example measurement,,4,A,cardiovascular,Assumption\n"
    "bp_sys_mmhg,Systolic blood pressure,mmHg,both,example measurement,,5,A,"
    "cardiovascular,Assumption\n"
)

# The thresholds the vectors name: glucose below 70 and above 126, both cited.
ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    f"glucose_mgdl,below,70,consult,cmo,{CITED}\n"
    f"glucose_mgdl,above,126,consult,cmo,{CITED}\n"
    f"hr_bpm,above,100,consult,cmo,{CITED}\n"
    f"bp_sys_mmhg,above,140,consult,cmo,{CITED}\n"
)

SYMPTOMS_CSV = (
    "symptom_id,name,red_flag,shared,source\n"
    "shaky,Shaky,no,no,Assumption\n"
    "sweating,Sweating or clammy skin,no,no,Assumption\n"
    "confusion,Confusion,yes,yes,Assumption\n"
    "thirst,Thirst,no,no,Assumption\n"
    "frequent_urination,Frequent urination,no,no,Assumption\n"
    "vomiting,Vomiting,yes,no,Assumption\n"
    "fatigue,Fatigue,no,yes,Assumption\n"
)

# The two glucose conditions with the agreed fifth column (FORMATS.md section 3).
CONDITIONS_FIVE = (
    "condition_id,name,based_on,symptoms,source\n"
    "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,"
    "shaky sweating fatigue confusion,Assumption\n"
    "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,"
    "thirst frequent_urination vomiting fatigue,Assumption\n"
)

# Two four-cell rows: the glucose pair, and one row with two indicators.
CONDITIONS_FOUR = (
    "condition_id,name,based_on,source\n"
    "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,Assumption\n"
    "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,Assumption\n"
    "dehydration,Dehydration,hr_bpm:above bp_sys_mmhg:below,Assumption\n"
)

ENTRY = {
    "person_id": PERSON,
    "indicator_id": GLUCOSE,
    "value": 100.0,
    "unit": "mg/dL",
    "mission_day": 12,
    "time": "07:00",
    "context": "rest",
}

UNITS = {GLUCOSE: "mg/dL", "hr_bpm": "bpm", "bp_sys_mmhg": "mmHg"}


def write_config(tmp_path, conditions: str = CONDITIONS_FIVE) -> None:
    """The config rows the score reads, written in the test's CONFIG_DIR."""
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "indicators.csv").write_text(INDICATORS_CSV)
    (tmp_path / "data" / "symptoms.csv").write_text(SYMPTOMS_CSV)
    (tmp_path / "rules").mkdir(exist_ok=True)
    (tmp_path / "rules" / "attention.csv").write_text(ATTENTION_CSV)
    (tmp_path / "rules" / "conditions.csv").write_text(conditions)


def post_reading(
    client,
    indicator_id: str,
    value: float,
    mission_day: int,
    time: str = "07:00",
) -> None:
    response = client.post(
        "/entries",
        json={
            **ENTRY,
            "indicator_id": indicator_id,
            "value": value,
            "unit": UNITS[indicator_id],
            "mission_day": mission_day,
            "time": time,
        },
    )
    assert response.status_code == 201, response.text


def post_glucose(client, value: float, mission_day: int = 12) -> None:
    post_reading(client, GLUCOSE, value, mission_day)


def in_baseline_history(client) -> None:
    """Three readings of 100: the baseline is median 100, spread 8 (the floor).

    A glucose of 110 is then inside the baseline and a glucose of 62, 55 or 180
    is not, so the vectors' "inside baseline" cells hold.
    """
    for day in (9, 10, 11):
        post_glucose(client, 100.0, mission_day=day)


def post_symptom(client, symptom_id: str, mission_day: int = 12) -> None:
    response = client.post(
        f"/people/{PERSON}/symptoms",
        json={
            "symptom_id": symptom_id,
            "severity": 2,
            "mission_day": mission_day,
            "time": "14:10",
        },
    )
    assert response.status_code == 201, response.text


def condition(client, condition_id: str) -> dict:
    response = client.get(f"/people/{PERSON}/conditions")
    assert response.status_code == 200, response.text
    found = [row for row in response.json() if row["condition_id"] == condition_id]
    assert found, response.text
    return found[0]


def with_column(*symptoms: str) -> str:
    """A one-row five-column conditions.csv listing `symptoms`."""
    return (
        "condition_id,name,based_on,symptoms,source\n"
        f"hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,{' '.join(symptoms)},"
        "Assumption\n"
    )


def test_four_cell_row_glucose_in_baseline(client, tmp_path):
    write_config(tmp_path, CONDITIONS_FOUR)
    in_baseline_history(client)
    post_glucose(client, 110.0)

    result = condition(client, "hypoglycaemia")

    assert result["score"] is None
    assert result["label"] == "no_data"


def test_low_glucose_no_symptoms(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 62.0)

    result = condition(client, "hypoglycaemia")

    assert result["score"] == 1.0
    assert result["label"] == "review"


def test_low_glucose_plus_sweating(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 62.0)
    post_symptom(client, "sweating")

    result = condition(client, "hypoglycaemia")

    assert result["score"] == 1.0
    assert result["label"] == "review"


def test_normal_glucose_plus_sweating(client, tmp_path):
    write_config(tmp_path)
    in_baseline_history(client)
    post_glucose(client, 110.0)
    post_symptom(client, "sweating")

    result = condition(client, "hypoglycaemia")

    # (0 * 1 + 1 * 0.5) / (1 + 0.5); the vector writes the same value as 0.33.
    assert result["score"] == 0.333
    assert result["label"] == "possible"


def test_no_glucose_two_specific_symptoms(client, tmp_path):
    write_config(tmp_path)
    post_symptom(client, "shaky")
    post_symptom(client, "sweating")

    result = condition(client, "hypoglycaemia")

    # (1 * 0.5 + 1 * 0.5) / (0.5 + 0.5) = 1.0, capped to 0.5: no measurement.
    assert result["score"] == 0.5
    assert result["label"] == "possible"


def test_no_glucose_one_symptom(client, tmp_path):
    write_config(tmp_path)
    post_symptom(client, "shaky")

    result = condition(client, "hypoglycaemia")

    # One usable signal, no boundary: no_data, and the screen still asks for
    # a measurement.
    assert result["score"] is None
    assert result["label"] == "no_data"


def test_shared_symptom_only(client, tmp_path):
    write_config(tmp_path)
    post_symptom(client, "fatigue")

    result = condition(client, "hypoglycaemia")

    # One shared symptom alone is no_data before the cap can apply.
    assert result["score"] is None
    assert result["label"] == "no_data"


def test_red_flag_with_normal_glucose(client, tmp_path):
    write_config(tmp_path)
    in_baseline_history(client)
    post_glucose(client, 110.0)
    post_symptom(client, "confusion")

    result = condition(client, "hypoglycaemia")

    assert result["label"] == "urgent"
    assert result["red_flag"] is True
    # (0 * 1 + 1 * 0.25) / (1 + 0.25): the score is still reported, and the
    # label is `urgent` whatever it says.
    assert result["score"] == 0.2


def test_hypoglycaemia_unawareness(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 55.0)

    result = condition(client, "hypoglycaemia")

    assert result["score"] == 1.0
    assert result["label"] == "review"


def test_high_glucose_plus_thirst_and_urination(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 180.0)
    post_symptom(client, "thirst")
    post_symptom(client, "frequent_urination")

    result = condition(client, "hyperglycaemia")

    assert result["score"] == 1.0
    assert result["label"] == "review"


def test_high_glucose_plus_vomiting(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 180.0)
    post_symptom(client, "vomiting")

    result = condition(client, "hyperglycaemia")

    assert result["label"] == "urgent"
    assert result["red_flag"] is True


def test_symptom_not_listed_for_the_condition(client, tmp_path):
    write_config(tmp_path)
    in_baseline_history(client)
    post_glucose(client, 110.0)
    post_symptom(client, "thirst")

    result = condition(client, "hypoglycaemia")

    assert [row.get("symptom_id") for row in result["signals"]] == [
        None,
        "shaky",
        "sweating",
        "fatigue",
        "confusion",
    ]
    assert "thirst" not in {row.get("symptom_id") for row in result["signals"]}
    assert result["score"] is None
    assert result["label"] == "no_data"


def test_unknown_symptom_id(client, tmp_path):
    """The checker reports the row; the route ignores the id and keeps answering."""
    write_config(tmp_path, with_column("not_a_symptom"))
    in_baseline_history(client)
    post_glucose(client, 110.0)

    result = condition(client, "hypoglycaemia")

    assert [row.get("symptom_id") for row in result["signals"]] == [None]
    assert result["score"] is None
    assert result["label"] == "no_data"


def test_duplicate_symptom_id(client, tmp_path):
    """`shaky shaky` is one symptom: it counts once, not twice."""
    write_config(tmp_path, with_column("shaky", "shaky"))
    in_baseline_history(client)
    post_glucose(client, 110.0)
    post_symptom(client, "shaky")

    result = condition(client, "hypoglycaemia")

    assert [row.get("symptom_id") for row in result["signals"]] == [None, "shaky"]
    # (0 * 1 + 1 * 0.5) / (1 + 0.5); twice would be 0.5.
    assert result["score"] == 0.333
    assert result["label"] == "possible"


def test_four_cell_row_after_the_change(client, tmp_path):
    """A four-cell row is valid and scores exactly as it did before T-78."""
    write_config(tmp_path, CONDITIONS_FOUR)
    for day in (9, 10, 11):
        post_reading(client, "bp_sys_mmhg", 118.0, day, "07:10")
    post_reading(client, "hr_bpm", 112.0, 12, "07:00")
    post_reading(client, "bp_sys_mmhg", 95.0, 12, "07:10")

    result = condition(client, "dehydration")

    assert set(result) == {
        "condition_id",
        "name",
        "score",
        "label",
        "signals",
        "source",
    }
    assert result["signals"] == [
        {
            "indicator_id": "hr_bpm",
            "side": "above",
            "contribution": 1.0,
            "value": 112.0,
        },
        {
            "indicator_id": "bp_sys_mmhg",
            "side": "below",
            "contribution": 0.5,
            "value": 95.0,
        },
    ]
    # The mean of the two points, as before the symptom layer: (1 + 0.5) / 2.
    assert result["score"] == 0.75
    assert result["label"] == "review"
