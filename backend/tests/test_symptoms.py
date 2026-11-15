"""The symptom log and the symptom part of the evidence score (T-79).

A symptom report is what the astronaut says they feel: which symptom from
`config/data/symptoms.csv`, how strong (1 mild, 2 moderate, 3 severe), on which
mission day and at what time. The API stores it, answers the same when the same
report is sent twice (the frontend's outbox re-sends) and lists it oldest first.

The score reads those reports only when `config/rules/conditions.csv` has the
optional fifth column `symptoms` (Bio 2's proposal, `team/bio2/notes/
complementary-proposals.md` section 4). With four columns, no `symptoms.csv` and
no reports the response is the one the conditions tests already check; the last
tests here pin that.
"""

from __future__ import annotations

import httpx
import pytest

from app import accounts, storage
from app.conditions import newest_day_reports, shared_symptoms, symptom_point
from app.main import app
from app.models import SymptomReport

PERSON = "demo_astronaut_1"
PATH = f"/people/{PERSON}/symptoms"
PIN = "2468"

SYMPTOM = {
    "symptom_id": "shaky",
    "severity": 2,
    "mission_day": 12,
    "time": "14:10",
}

CONFLICT = (
    "a symptom report for this person, day, time and symptom already exists"
    " with a different severity"
)

CITED = "https://example.org/limit"

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "glucose_mgdl,Blood glucose,mg/dL,both,example measurement,,8,A,metabolic,"
    "Assumption\n"
)

ATTENTION_CSV = (
    "indicator_id,side,threshold,attention_level,notify,source\n"
    f"glucose_mgdl,below,70,consult,cmo,{CITED}\n"
    f"glucose_mgdl,above,180,consult,cmo,{CITED}\n"
)

SYMPTOMS_CSV = (
    "symptom_id,name,red_flag,source\n"
    "shaky,Shaky,no,Assumption\n"
    "sweating,Sweating or clammy skin,no,Assumption\n"
    "confusion,Confusion,yes,Assumption\n"
    "thirst,Thirst,no,Assumption\n"
    "vomiting,Vomiting,yes,Assumption\n"
)

# The two glucose conditions of Bio 2's proposal, with the symptoms column.
CONDITIONS_FIVE = (
    "condition_id,name,based_on,symptoms,source\n"
    "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shaky sweating confusion,"
    "Assumption\n"
    "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,thirst confusion vomiting,"
    "Assumption\n"
)

# The same two conditions as FORMATS.md has them today: four columns.
CONDITIONS_FOUR = (
    "condition_id,name,based_on,source\n"
    "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,Assumption\n"
    "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,Assumption\n"
)


def report(**changes) -> dict:
    return {**SYMPTOM, **changes}


def stored(**changes) -> dict:
    """The body the API returns for a report, with the person in the path."""
    return {"person_id": PERSON, **SYMPTOM, **changes}


def write_config(
    tmp_path, conditions: str = CONDITIONS_FIVE, symptoms: str | None = SYMPTOMS_CSV
) -> None:
    """The config rows the score reads, written in the test's CONFIG_DIR."""
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "indicators.csv").write_text(INDICATORS_CSV)
    (tmp_path / "rules").mkdir(exist_ok=True)
    (tmp_path / "rules" / "attention.csv").write_text(ATTENTION_CSV)
    (tmp_path / "rules" / "conditions.csv").write_text(conditions)
    if symptoms is not None:
        (tmp_path / "data" / "symptoms.csv").write_text(symptoms)


def write_symptoms_csv(tmp_path, content: str = SYMPTOMS_CSV) -> None:
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "symptoms.csv").write_text(content)


def post_symptom(
    client,
    symptom_id: str = "shaky",
    severity: int = 2,
    mission_day: int = 12,
    time: str = "14:10",
    person_id: str = PERSON,
):
    return client.post(
        f"/people/{person_id}/symptoms",
        json={
            "symptom_id": symptom_id,
            "severity": severity,
            "mission_day": mission_day,
            "time": time,
        },
    )


def post_glucose(client, value: float, mission_day: int = 12, time: str = "14:00"):
    response = client.post(
        "/entries",
        json={
            "person_id": PERSON,
            "indicator_id": "glucose_mgdl",
            "value": value,
            "unit": "mg/dL",
            "mission_day": mission_day,
            "time": time,
            "context": "rest",
        },
    )
    assert response.status_code == 201, response.text


def conditions(client) -> list[dict]:
    response = client.get(f"/people/{PERSON}/conditions")
    assert response.status_code == 200, response.text
    return response.json()


# The route: storing one report.


def test_post_files_a_report(client):
    response = client.post(PATH, json=SYMPTOM)

    assert response.status_code == 201
    assert response.json() == stored()


def test_resend_returns_200_and_keeps_one_report(client):
    first = client.post(PATH, json=SYMPTOM)
    second = client.post(PATH, json=SYMPTOM)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json() == stored()
    assert client.get(PATH).json() == [stored()]


def test_resend_with_another_severity_is_409(client):
    client.post(PATH, json=SYMPTOM)

    conflict = client.post(PATH, json=report(severity=3))

    assert conflict.status_code == 409
    assert conflict.json()["detail"] == CONFLICT
    assert client.get(PATH).json() == [stored()]


def test_the_same_symptom_on_another_day_is_a_new_report(client):
    client.post(PATH, json=SYMPTOM)

    response = client.post(PATH, json=report(mission_day=13))

    assert response.status_code == 201
    assert len(client.get(PATH).json()) == 2


def test_another_symptom_at_the_same_time_is_a_new_report(client):
    client.post(PATH, json=SYMPTOM)

    response = client.post(PATH, json=report(symptom_id="sweating"))

    assert response.status_code == 201
    assert len(client.get(PATH).json()) == 2


def test_the_same_symptom_at_another_time_is_a_new_report(client):
    client.post(PATH, json=SYMPTOM)

    response = client.post(PATH, json=report(time="18:00"))

    assert response.status_code == 201
    assert len(client.get(PATH).json()) == 2


@pytest.mark.parametrize("severity", [1, 2, 3])
def test_severity_one_to_three_is_accepted(client, severity):
    assert post_symptom(client, severity=severity).status_code == 201


@pytest.mark.parametrize(
    ("field", "bad"),
    [
        ("severity", 0),
        ("severity", 4),
        ("severity", 2.0),
        ("severity", True),
        ("severity", "2"),
        ("symptom_id", "Shaky"),
        ("symptom_id", "shaky arm"),
        ("symptom_id", "9shaky"),
        ("symptom_id", "a" * 65),
        ("time", "24:00"),
        ("time", "14:60"),
        ("time", "4:10"),
        ("time", "14:10:00"),
        ("mission_day", 0),
        ("mission_day", -1),
        ("mission_day", True),
        ("mission_day", "12"),
        ("mission_day", 100001),
    ],
)
def test_bad_field_is_422_and_stores_nothing(client, field, bad):
    response = client.post(PATH, json=report(**{field: bad}))

    assert response.status_code == 422, response.text
    assert client.get(PATH).json() == []


@pytest.mark.parametrize("missing", ["symptom_id", "severity", "mission_day", "time"])
def test_missing_field_is_422(client, missing):
    body = {key: value for key, value in SYMPTOM.items() if key != missing}

    response = client.post(PATH, json=body)

    assert response.status_code == 422


# The route: reading the log.


def test_list_is_oldest_first(client):
    for day, time in ((2, "08:00"), (1, "20:00"), (1, "08:00")):
        assert post_symptom(client, mission_day=day, time=time).status_code == 201

    body = client.get(PATH).json()

    assert [(row["mission_day"], row["time"]) for row in body] == [
        (1, "08:00"),
        (1, "20:00"),
        (2, "08:00"),
    ]


def test_symptom_filter(client):
    post_symptom(client, symptom_id="shaky", mission_day=1)
    post_symptom(client, symptom_id="sweating", mission_day=2)
    post_symptom(client, symptom_id="shaky", mission_day=3)

    body = client.get(PATH, params={"symptom_id": "shaky"}).json()

    assert [row["mission_day"] for row in body] == [1, 3]
    assert {row["symptom_id"] for row in body} == {"shaky"}


def test_symptom_filter_with_no_match_is_an_empty_list(client):
    client.post(PATH, json=SYMPTOM)

    assert client.get(PATH, params={"symptom_id": "nausea"}).json() == []


def test_a_person_with_no_report_gets_an_empty_list(client):
    response = client.get("/people/demo_astronaut_7/symptoms")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("person_id", ["Bad-id", "9bad", "bad id"])
def test_invalid_person_id_in_the_path_is_422(client, person_id):
    assert post_symptom(client, person_id=person_id).status_code == 422
    assert client.get(f"/people/{person_id}/symptoms").status_code == 422


@pytest.mark.parametrize("symptom_id", ["Shaky", "9bad", "bad id"])
def test_invalid_symptom_filter_is_422(client, symptom_id):
    response = client.get(PATH, params={"symptom_id": symptom_id})

    assert response.status_code == 422
    assert response.json()["detail"] == "symptom_id must be lowercase snake_case"


# The unknown id rule: checked only while config/data/symptoms.csv exists.


def test_any_snake_case_id_is_accepted_without_symptoms_csv(client):
    response = post_symptom(client, symptom_id="not_in_any_file")

    assert response.status_code == 201
    assert response.json()["symptom_id"] == "not_in_any_file"


def test_a_listed_symptom_is_accepted_with_symptoms_csv(client, tmp_path):
    write_symptoms_csv(tmp_path)

    assert post_symptom(client, symptom_id="shaky").status_code == 201


def test_an_unlisted_symptom_is_422_with_symptoms_csv(client, tmp_path):
    write_symptoms_csv(tmp_path)

    response = post_symptom(client, symptom_id="not_in_any_file")

    assert response.status_code == 422
    assert response.json()["detail"] == "unknown symptom"
    assert client.get(PATH).json() == []


def test_a_header_only_symptoms_csv_checks_nothing(client, tmp_path):
    write_symptoms_csv(tmp_path, "symptom_id,name,red_flag,source\n")

    assert post_symptom(client, symptom_id="shaky").status_code == 201


# The token rule, copied from the pain routes.


def create_account(client, person_id: str, pin: str = PIN):
    return client.post("/accounts", json={"person_id": person_id, "pin": pin})


def bearer(client, person_id: str, pin: str = PIN) -> dict[str, str]:
    token = client.post(
        "/sessions", json={"person_id": person_id, "pin": pin}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _fixed_secret(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "test-secret-for-symptoms")
    accounts.wrong_pins.reset()


def test_a_person_with_an_account_needs_the_token(client):
    create_account(client, "crew_1")

    refused = client.post("/people/crew_1/symptoms", json=SYMPTOM)
    listed = client.get("/people/crew_1/symptoms")

    assert refused.status_code == 401
    assert refused.json()["detail"] == "missing or invalid token"
    assert listed.status_code == 401
    assert listed.json()["detail"] == "missing or invalid token"


def test_with_the_token_both_routes_answer(client):
    create_account(client, "crew_1")
    headers = bearer(client, "crew_1")

    posted = client.post("/people/crew_1/symptoms", json=SYMPTOM, headers=headers)
    listed = client.get("/people/crew_1/symptoms", headers=headers)

    assert posted.status_code == 201
    assert listed.status_code == 200
    assert [row["symptom_id"] for row in listed.json()] == ["shaky"]


def test_the_token_of_another_person_is_403(client):
    create_account(client, "crew_1")
    create_account(client, "crew_2", pin="1357")
    headers = bearer(client, "crew_2", pin="1357")

    posted = client.post("/people/crew_1/symptoms", json=SYMPTOM, headers=headers)
    listed = client.get("/people/crew_1/symptoms", headers=headers)

    assert posted.status_code == 403
    assert posted.json()["detail"] == "this token belongs to another person"
    assert listed.status_code == 403


def test_a_person_without_an_account_stays_open(client):
    assert client.post(PATH, json=SYMPTOM).status_code == 201
    assert client.get(PATH).status_code == 200


# The store.


def failing_store() -> storage.SupabaseStorage:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    return storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )


def test_post_upstream_error_becomes_502(client):
    app.dependency_overrides[storage.get_storage] = failing_store

    response = client.post(PATH, json=SYMPTOM)

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"


def test_list_upstream_error_becomes_502(client):
    app.dependency_overrides[storage.get_storage] = failing_store

    response = client.get(PATH)

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"


def symptom_row(**changes) -> SymptomReport:
    values = {"person_id": PERSON, **SYMPTOM}
    return SymptomReport(**{**values, **changes})


def test_memory_store_is_idempotent_and_detects_a_conflict():
    store = storage.MemoryStorage()

    _, created = store.add_symptom(symptom_row())
    existing, again = store.add_symptom(symptom_row())

    assert created is True
    assert again is False
    assert existing == symptom_row()
    with pytest.raises(storage.SymptomConflict):
        store.add_symptom(symptom_row(severity=3))


def test_sqlite_keeps_reports_across_restarts(tmp_path):
    path = tmp_path / "entries.db"
    storage.SqliteStorage(path).add_symptom(symptom_row())

    reopened = storage.SqliteStorage(path)

    assert reopened.symptom_reports(PERSON) == [symptom_row()]


def test_sqlite_resend_returns_the_existing_report(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")

    first_stored, first_created = store.add_symptom(symptom_row())
    second_stored, second_created = store.add_symptom(symptom_row())

    assert first_created is True
    assert second_created is False
    assert first_stored == second_stored == symptom_row()
    assert len(store.symptom_reports(PERSON)) == 1


def test_sqlite_conflict_raises(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    store.add_symptom(symptom_row())

    with pytest.raises(storage.SymptomConflict):
        store.add_symptom(symptom_row(severity=3))


def test_sqlite_lists_oldest_first_and_filters_by_symptom(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    for symptom_id, day, time in (
        ("sweating", 2, "08:00"),
        ("shaky", 1, "20:00"),
        ("shaky", 1, "08:00"),
    ):
        store.add_symptom(symptom_row(symptom_id=symptom_id, mission_day=day, time=time))

    assert [(row.mission_day, row.time) for row in store.symptom_reports(PERSON)] == [
        (1, "08:00"),
        (1, "20:00"),
        (2, "08:00"),
    ]
    assert [row.symptom_id for row in store.symptom_reports(PERSON, "shaky")] == [
        "shaky",
        "shaky",
    ]


def test_supabase_add_writes_the_symptom_table():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(201, json=symptom_row().model_dump())

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    stored_report, created = store.add_symptom(symptom_row())

    assert created is True
    assert stored_report == symptom_row()
    assert [request.method for request in requests] == ["GET", "POST"]
    post = requests[1]
    assert str(post.url) == "https://example.supabase.co/rest/v1/symptom_reports"
    assert '"symptom_id":"shaky"' in post.content.decode()


def test_supabase_add_reads_by_natural_key():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET":
            captured["params"] = dict(request.url.params)
            return httpx.Response(200, json=[])
        return httpx.Response(201)

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    store.add_symptom(symptom_row())

    assert captured["params"]["person_id"] == f"eq.{PERSON}"
    assert captured["params"]["mission_day"] == "eq.12"
    assert captured["params"]["time"] == "eq.14:10"
    assert captured["params"]["symptom_id"] == "eq.shaky"


def test_supabase_add_existing_report_skips_the_write():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=[symptom_row().model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    stored_report, created = store.add_symptom(symptom_row())

    assert created is False
    assert stored_report == symptom_row()
    assert [request.method for request in requests] == ["GET"]


def test_supabase_conflict_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[symptom_row(severity=3).model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    with pytest.raises(storage.SymptomConflict):
        store.add_symptom(symptom_row())


def test_supabase_list_request_shape():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["params"] = dict(request.url.params)
        captured["headers"] = request.headers
        return httpx.Response(200, json=[symptom_row().model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    rows = store.symptom_reports(PERSON)

    assert captured["method"] == "GET"
    assert captured["url"].startswith(
        "https://example.supabase.co/rest/v1/symptom_reports"
    )
    assert captured["headers"]["apikey"] == "sb_secret_x"
    assert captured["params"]["person_id"] == f"eq.{PERSON}"
    assert captured["params"]["order"] == "mission_day.asc,time.asc"
    assert "symptom_id" not in captured["params"]
    assert rows == [symptom_row()]


def test_supabase_list_filters_by_symptom():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["params"] = dict(request.url.params)
        return httpx.Response(200, json=[])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    assert store.symptom_reports(PERSON, "shaky") == []
    assert captured["params"]["symptom_id"] == "eq.shaky"


# The score: the rule on its own.


def symptom_report(symptom_id: str, mission_day: int = 12) -> SymptomReport:
    return SymptomReport(
        person_id=PERSON,
        symptom_id=symptom_id,
        severity=2,
        mission_day=mission_day,
        time="14:10",
    )


def test_newest_day_reports_keeps_the_latest_day_only():
    reports = [
        symptom_report("shaky", mission_day=11),
        symptom_report("sweating", mission_day=12),
        symptom_report("confusion", mission_day=12),
    ]

    kept = newest_day_reports(reports)

    assert [report.symptom_id for report in kept] == ["sweating", "confusion"]


def test_newest_day_reports_with_no_report_is_empty():
    assert newest_day_reports([]) == []


def test_shared_symptoms_are_the_ones_two_conditions_list():
    rows = [
        {"symptoms": "shaky sweating confusion"},
        {"symptoms": "thirst confusion"},
    ]

    assert shared_symptoms(rows) == {"confusion"}


def test_shared_symptoms_ignores_a_row_without_the_column():
    rows = [{"symptoms": "confusion"}, {"based_on": "glucose_mgdl:below"}]

    assert shared_symptoms(rows) == set()


def test_a_symptom_written_twice_in_one_row_counts_once(client, tmp_path):
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shaky shaky,Assumption\n"
    )
    write_config(tmp_path, conditions_csv)
    post_glucose(client, 60.0)
    post_symptom(client, "shaky", mission_day=12)

    condition = conditions(client)[0]

    assert len(condition["signals"]) == 2
    assert condition["score"] == 0.75


def test_a_specific_symptom_adds_more_than_a_shared_one():
    assert symptom_point("shaky", {"confusion"}) == 0.5
    assert symptom_point("confusion", {"confusion"}) == 0.25


# The score: the conditions route.


def test_four_columns_ignore_the_reports(client, tmp_path):
    """No symptoms column, reports stored: the condition scores as it did."""
    write_config(tmp_path, CONDITIONS_FOUR, symptoms=None)
    post_glucose(client, 60.0)
    post_symptom(client, "shaky", mission_day=12)

    condition = conditions(client)[0]

    assert condition["condition_id"] == "hypoglycaemia"
    assert condition["signals"] == [
        {
            "indicator_id": "glucose_mgdl",
            "side": "below",
            "contribution": 1.0,
            "value": 60.0,
        }
    ]
    assert condition["score"] is None
    assert condition["label"] == "no_data"
    assert "red_flag" not in condition


def test_no_config_and_no_reports_leaves_the_conditions_route_empty(client):
    assert conditions(client) == []


def test_bio2_example_low_glucose_with_three_symptoms(client, tmp_path):
    """Bio 2's example: glucose 60 mg/dL and shaky, sweating, confusion.

    One indicator signal crossed the cited row (1.0), two symptoms are specific
    to this condition (0.5 each) and confusion is shared with hyperglycaemia
    (0.25): (1 + 0.5 + 0.5 + 0.25) / 4 = 0.5625, "possible". Confusion is a red
    flag in `symptoms.csv`, so the condition carries `red_flag: true`.
    """
    write_config(tmp_path)
    post_glucose(client, 60.0)
    for symptom_id in ("shaky", "sweating", "confusion"):
        assert post_symptom(client, symptom_id, mission_day=12).status_code == 201

    condition = conditions(client)[0]

    assert condition["condition_id"] == "hypoglycaemia"
    assert condition["score"] == 0.562
    assert condition["label"] == "possible"
    assert condition["red_flag"] is True
    assert condition["signals"] == [
        {
            "indicator_id": "glucose_mgdl",
            "side": "below",
            "contribution": 1.0,
            "value": 60.0,
        },
        {"kind": "symptom", "symptom_id": "shaky", "contribution": 0.5},
        {"kind": "symptom", "symptom_id": "sweating", "contribution": 0.5},
        {"kind": "symptom", "symptom_id": "confusion", "contribution": 0.25},
    ]


def test_a_shared_symptom_counts_less_than_a_specific_one(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 60.0)
    post_symptom(client, "shaky", mission_day=12)
    post_symptom(client, "confusion", mission_day=12)

    signals = {
        signal["symptom_id"]: signal["contribution"]
        for signal in conditions(client)[0]["signals"][1:]
    }

    assert signals == {"shaky": 0.5, "sweating": None, "confusion": 0.25}


def test_only_the_newest_day_of_reports_counts(client, tmp_path):
    """A report of an older day is history: it adds nothing to today's score."""
    write_config(tmp_path)
    post_glucose(client, 60.0)
    post_symptom(client, "sweating", mission_day=13)
    post_symptom(client, "shaky", mission_day=12)

    condition = conditions(client)[0]

    signals = condition["signals"]
    assert [(signal["symptom_id"], signal["contribution"]) for signal in signals[1:]] == [
        ("shaky", None),
        ("sweating", 0.5),
        ("confusion", None),
    ]
    assert condition["score"] == 0.75
    assert condition["label"] == "review"


def test_a_symptom_not_reported_is_listed_but_not_usable(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 60.0)

    condition = conditions(client)[0]

    assert condition["score"] is None
    assert condition["label"] == "no_data"
    assert [signal["contribution"] for signal in condition["signals"]] == [
        1.0,
        None,
        None,
        None,
    ]


def test_symptoms_alone_can_be_no_data(client, tmp_path):
    write_config(tmp_path)
    post_symptom(client, "shaky", mission_day=12)

    condition = conditions(client)[0]

    assert condition["score"] is None
    assert condition["label"] == "no_data"


def test_an_empty_symptoms_cell_lists_no_symptom(client, tmp_path):
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,,Assumption\n"
    )
    write_config(tmp_path, conditions_csv)
    post_glucose(client, 60.0)
    post_symptom(client, "shaky", mission_day=12)

    assert conditions(client)[0]["signals"] == [
        {
            "indicator_id": "glucose_mgdl",
            "side": "below",
            "contribution": 1.0,
            "value": 60.0,
        }
    ]


def test_a_red_flag_sets_the_field_whatever_the_score(client, tmp_path):
    """One usable signal is `no_data`, and the red flag is still set."""
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,confusion,Assumption\n"
    )
    write_config(tmp_path, conditions_csv)
    post_symptom(client, "confusion", mission_day=12)

    condition = conditions(client)[0]

    assert condition["score"] is None
    assert condition["label"] == "no_data"
    assert condition["red_flag"] is True


def test_a_red_flag_not_reported_does_not_set_the_field(client, tmp_path):
    write_config(tmp_path)
    post_symptom(client, "shaky", mission_day=12)

    assert "red_flag" not in conditions(client)[0]


def test_a_red_flag_of_an_older_day_does_not_set_the_field(client, tmp_path):
    """The flag reads the same newest day as the points, not the whole history."""
    write_config(tmp_path)
    post_symptom(client, "confusion", mission_day=11)
    post_symptom(client, "shaky", mission_day=12)

    condition = conditions(client)[0]

    assert "red_flag" not in condition
    assert {
        signal["symptom_id"]: signal["contribution"]
        for signal in condition["signals"][1:]
    } == {"shaky": 0.5, "sweating": None, "confusion": None}


def test_a_low_score_and_a_red_flag_can_arrive_together(client, tmp_path):
    """The flag outranks the label: a low mean does not hide a red flag."""
    write_config(tmp_path)
    for day in (9, 10, 11, 12):
        post_glucose(client, 100.0, mission_day=day)
    post_symptom(client, "shaky", mission_day=12)
    post_symptom(client, "confusion", mission_day=12)

    condition = conditions(client)[0]

    assert condition["score"] == 0.25
    assert condition["label"] == "low"
    assert condition["red_flag"] is True


def test_a_red_flag_of_another_condition_does_not_set_the_field(client, tmp_path):
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shaky,Assumption\n"
        "hyperglycaemia,Hyperglycaemia,glucose_mgdl:above,vomiting,Assumption\n"
    )
    write_config(tmp_path, conditions_csv)
    post_symptom(client, "vomiting", mission_day=12)

    hypoglycaemia, hyperglycaemia = conditions(client)

    assert "red_flag" not in hypoglycaemia
    assert hyperglycaemia["red_flag"] is True


def test_a_red_flag_without_symptoms_csv_sets_nothing(client, tmp_path):
    """Without `symptoms.csv` no row says a symptom is a red flag."""
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,confusion,Assumption\n"
    )
    write_config(tmp_path, conditions_csv, symptoms=None)
    post_symptom(client, "confusion", mission_day=12)

    assert "red_flag" not in conditions(client)[0]


def test_a_capitalised_id_in_symptoms_csv_still_answers(client, tmp_path):
    """An id the API accepts is lowercase; the file key is read the same way."""
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,shaky,Assumption\n"
    )
    symptoms_csv = "symptom_id,name,red_flag,source\nShaky,Shaky,yes,Assumption\n"
    write_config(tmp_path, conditions_csv, symptoms_csv)

    assert post_symptom(client, "shaky", mission_day=12).status_code == 201
    assert conditions(client)[0]["red_flag"] is True


def test_the_conditions_route_never_writes_a_diagnosis(client, tmp_path):
    write_config(tmp_path)
    post_glucose(client, 60.0)
    post_symptom(client, "confusion", mission_day=12)

    text = str(conditions(client)).lower()

    for forbidden in ("you have", "urgent", "diagnosis", "certain", "confirmed"):
        assert forbidden not in text


def test_an_id_missing_from_symptoms_csv_is_still_scored(client, tmp_path):
    """Without `symptoms.csv` any id is stored, and the column still counts it."""
    conditions_csv = (
        "condition_id,name,based_on,symptoms,source\n"
        "hypoglycaemia,Hypoglycaemia,glucose_mgdl:below,not_a_known_symptom,"
        "Assumption\n"
    )
    write_config(tmp_path, conditions_csv, symptoms=None)
    post_glucose(client, 60.0)
    post_symptom(client, "not_a_known_symptom", mission_day=12)

    condition = conditions(client)[0]

    assert condition["signals"][1] == {
        "kind": "symptom",
        "symptom_id": "not_a_known_symptom",
        "contribution": 0.5,
    }
