"""Pain reports from the 3D body: the two routes, both stores and the token rule.

A report is what the astronaut tapped on the 3D body: where it hurts, how strong
(0 to 10), on which mission day and at what time, with an optional note. The API
stores it, gives the same answer when the same report is sent twice (the
frontend's outbox re-sends) and lists it oldest first. Nothing here reads the
intensity: it is a number the astronaut chose, not a medical statement.
"""

from __future__ import annotations

import httpx
import pytest

from app import accounts, storage
from app.main import app
from app.models import PainReport

PERSON = "demo_astronaut_1"
PATH = f"/people/{PERSON}/pain"
PIN = "2468"

PAIN = {
    "region_id": "left_knee",
    "intensity": 4,
    "mission_day": 1,
    "time": "13:30",
}

CONFLICT = (
    "a pain report for this person, region, day and time already exists"
    " with a different intensity or note"
)


def report(**changes) -> dict:
    return {**PAIN, **changes}


def stored(**changes) -> dict:
    """The body the API returns for a report, with the person in the path."""
    return {"person_id": PERSON, **PAIN, "note": None, **changes}


def test_post_files_a_report(client):
    response = client.post(PATH, json=PAIN)

    assert response.status_code == 201
    assert response.json() == stored()


def test_post_keeps_the_note(client):
    response = client.post(PATH, json=report(note="After the treadmill run"))

    assert response.status_code == 201
    assert response.json()["note"] == "After the treadmill run"


def test_resend_returns_200_and_keeps_one_report(client):
    first = client.post(PATH, json=PAIN)
    second = client.post(PATH, json=PAIN)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json() == stored()
    assert client.get(PATH).json() == [stored()]


def test_resend_with_another_intensity_is_409(client):
    client.post(PATH, json=PAIN)

    conflict = client.post(PATH, json=report(intensity=7))

    assert conflict.status_code == 409
    assert conflict.json()["detail"] == CONFLICT
    assert client.get(PATH).json() == [stored()]


def test_resend_with_another_note_is_409(client):
    client.post(PATH, json=report(note="Shooting pain"))

    conflict = client.post(PATH, json=report(note="Dull pain"))

    assert conflict.status_code == 409
    assert client.get(PATH).json() == [stored(note="Shooting pain")]


def test_the_same_region_on_another_day_is_a_new_report(client):
    client.post(PATH, json=PAIN)

    response = client.post(PATH, json=report(mission_day=2))

    assert response.status_code == 201
    assert len(client.get(PATH).json()) == 2


def test_another_region_at_the_same_time_is_a_new_report(client):
    client.post(PATH, json=PAIN)

    response = client.post(PATH, json=report(region_id="right_knee"))

    assert response.status_code == 201
    assert len(client.get(PATH).json()) == 2


@pytest.mark.parametrize(
    ("field", "bad"),
    [
        ("intensity", -1),
        ("intensity", 11),
        ("intensity", 4.0),
        ("intensity", True),
        ("intensity", "4"),
        ("region_id", "Left-Knee"),
        ("region_id", "left knee"),
        ("region_id", "9left_knee"),
        ("region_id", "a" * 65),
        ("time", "24:00"),
        ("time", "13:60"),
        ("time", "1:30"),
        ("time", "13:30:00"),
        ("mission_day", 0),
        ("mission_day", -1),
        ("mission_day", True),
        ("mission_day", "1"),
        ("mission_day", 100001),
        ("note", "a" * 281),
        ("note", 5),
    ],
)
def test_bad_field_is_422_and_stores_nothing(client, field, bad):
    response = client.post(PATH, json=report(**{field: bad}))

    assert response.status_code == 422, response.text
    assert client.get(PATH).json() == []


@pytest.mark.parametrize("missing", ["region_id", "intensity", "mission_day", "time"])
def test_missing_field_is_422(client, missing):
    body = {key: value for key, value in PAIN.items() if key != missing}

    response = client.post(PATH, json=body)

    assert response.status_code == 422


def test_note_at_the_longest_allowed_length_is_201(client):
    response = client.post(PATH, json=report(note="a" * 280))

    assert response.status_code == 201


def test_zero_and_ten_are_valid_intensities(client):
    assert client.post(PATH, json=report(intensity=0)).status_code == 201
    assert client.post(PATH, json=report(intensity=10, time="13:31")).status_code == 201


def test_list_is_oldest_first(client):
    for day, time in ((2, "08:00"), (1, "20:00"), (1, "08:00")):
        assert (
            client.post(PATH, json=report(mission_day=day, time=time)).status_code == 201
        )

    body = client.get(PATH).json()

    assert [(row["mission_day"], row["time"]) for row in body] == [
        (1, "08:00"),
        (1, "20:00"),
        (2, "08:00"),
    ]


def test_region_filter(client):
    client.post(PATH, json=report(region_id="left_knee", mission_day=1))
    client.post(PATH, json=report(region_id="right_knee", mission_day=2))
    client.post(PATH, json=report(region_id="left_knee", mission_day=3))

    body = client.get(PATH, params={"region_id": "left_knee"}).json()

    assert [row["mission_day"] for row in body] == [1, 3]
    assert {row["region_id"] for row in body} == {"left_knee"}


def test_region_filter_with_no_match_is_an_empty_list(client):
    client.post(PATH, json=PAIN)

    assert client.get(PATH, params={"region_id": "neck"}).json() == []


def test_a_person_with_no_report_gets_an_empty_list(client):
    response = client.get("/people/demo_astronaut_7/pain")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("person_id", ["Bad-id", "9bad", "bad id"])
def test_invalid_person_id_in_the_path_is_422(client, person_id):
    assert client.post(f"/people/{person_id}/pain", json=PAIN).status_code == 422
    assert client.get(f"/people/{person_id}/pain").status_code == 422


@pytest.mark.parametrize("region_id", ["Left-Knee", "9bad", "bad id"])
def test_invalid_region_filter_is_422(client, region_id):
    response = client.get(PATH, params={"region_id": region_id})

    assert response.status_code == 422
    assert response.json()["detail"] == "region_id must be lowercase snake_case"


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

    response = client.post(PATH, json=PAIN)

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"


def test_list_upstream_error_becomes_502(client):
    app.dependency_overrides[storage.get_storage] = failing_store

    response = client.get(PATH)

    assert response.status_code == 502
    assert response.json()["detail"] == "upstream storage error"


def create_account(client, person_id: str, pin: str = PIN):
    return client.post("/accounts", json={"person_id": person_id, "pin": pin})


def bearer(client, person_id: str, pin: str = PIN) -> dict[str, str]:
    token = client.post(
        "/sessions", json={"person_id": person_id, "pin": pin}
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def _fixed_secret(monkeypatch):
    monkeypatch.setenv("SESSION_SECRET", "test-secret-for-pain")
    accounts.wrong_pins.reset()


def test_a_person_with_an_account_needs_the_token(client):
    create_account(client, "crew_1")

    refused = client.post("/people/crew_1/pain", json=PAIN)
    listed = client.get("/people/crew_1/pain")

    assert refused.status_code == 401
    assert refused.json()["detail"] == "missing or invalid token"
    assert listed.status_code == 401
    assert listed.json()["detail"] == "missing or invalid token"


def test_with_the_token_both_routes_answer(client):
    create_account(client, "crew_1")
    headers = bearer(client, "crew_1")

    posted = client.post("/people/crew_1/pain", json=PAIN, headers=headers)
    listed = client.get("/people/crew_1/pain", headers=headers)

    assert posted.status_code == 201
    assert listed.status_code == 200
    assert [row["region_id"] for row in listed.json()] == ["left_knee"]


def test_the_token_of_another_person_is_403(client):
    create_account(client, "crew_1")
    create_account(client, "crew_2", pin="1357")
    headers = bearer(client, "crew_2", pin="1357")

    posted = client.post("/people/crew_1/pain", json=PAIN, headers=headers)
    listed = client.get("/people/crew_1/pain", headers=headers)

    assert posted.status_code == 403
    assert posted.json()["detail"] == "this token belongs to another person"
    assert listed.status_code == 403


def test_a_person_without_an_account_stays_open(client):
    assert client.post(PATH, json=PAIN).status_code == 201
    assert client.get(PATH).status_code == 200


def test_sqlite_keeps_reports_across_restarts(tmp_path):
    path = tmp_path / "entries.db"
    stored_report = PainReport(
        person_id=PERSON, region_id="left_knee", intensity=4, mission_day=1, time="13:30"
    )
    storage.SqliteStorage(path).add_pain(stored_report)

    reopened = storage.SqliteStorage(path)

    assert reopened.pain_reports(PERSON) == [stored_report]


def test_sqlite_resend_returns_the_existing_report(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    report_row = PainReport(
        person_id=PERSON, region_id="left_knee", intensity=4, mission_day=1, time="13:30"
    )

    first_stored, first_created = store.add_pain(report_row)
    second_stored, second_created = store.add_pain(report_row)

    assert first_created is True
    assert second_created is False
    assert first_stored == second_stored == report_row
    assert len(store.pain_reports(PERSON)) == 1


def test_sqlite_conflict_raises(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    store.add_pain(
        PainReport(
            person_id=PERSON,
            region_id="left_knee",
            intensity=4,
            mission_day=1,
            time="13:30",
        )
    )

    with pytest.raises(storage.PainConflict):
        store.add_pain(
            PainReport(
                person_id=PERSON,
                region_id="left_knee",
                intensity=9,
                mission_day=1,
                time="13:30",
            )
        )


def test_sqlite_lists_oldest_first_and_filters_by_region(tmp_path):
    store = storage.SqliteStorage(tmp_path / "entries.db")
    for region_id, day, time in (
        ("right_knee", 2, "08:00"),
        ("left_knee", 1, "20:00"),
        ("left_knee", 1, "08:00"),
    ):
        store.add_pain(
            PainReport(
                person_id=PERSON,
                region_id=region_id,
                intensity=4,
                mission_day=day,
                time=time,
            )
        )

    assert [(row.mission_day, row.time) for row in store.pain_reports(PERSON)] == [
        (1, "08:00"),
        (1, "20:00"),
        (2, "08:00"),
    ]
    assert [row.region_id for row in store.pain_reports(PERSON, "left_knee")] == [
        "left_knee",
        "left_knee",
    ]


def pain_row(**changes) -> PainReport:
    values = {
        "person_id": PERSON,
        "region_id": "left_knee",
        "intensity": 4,
        "mission_day": 1,
        "time": "13:30",
        "note": None,
    }
    return PainReport(**{**values, **changes})


def test_supabase_add_writes_the_pain_table():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(200, json=[])
        return httpx.Response(201, json=pain_row().model_dump())

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    stored_report, created = store.add_pain(pain_row())

    assert created is True
    assert stored_report == pain_row()
    assert [request.method for request in requests] == ["GET", "POST"]
    post = requests[1]
    assert str(post.url) == "https://example.supabase.co/rest/v1/pain_reports"
    assert '"region_id":"left_knee"' in post.content.decode()


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

    store.add_pain(pain_row())

    assert captured["params"]["person_id"] == f"eq.{PERSON}"
    assert captured["params"]["region_id"] == "eq.left_knee"
    assert captured["params"]["mission_day"] == "eq.1"
    assert captured["params"]["time"] == "eq.13:30"


def test_supabase_add_existing_report_skips_the_write():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=[pain_row().model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    stored_report, created = store.add_pain(pain_row())

    assert created is False
    assert stored_report == pain_row()
    assert [request.method for request in requests] == ["GET"]


@pytest.mark.parametrize("changes", [{"intensity": 9}, {"note": "Dull pain"}])
def test_supabase_conflict_raises(changes):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[pain_row(**changes).model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    with pytest.raises(storage.PainConflict):
        store.add_pain(pain_row())


def test_supabase_list_request_shape():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["params"] = dict(request.url.params)
        captured["headers"] = request.headers
        return httpx.Response(200, json=[pain_row().model_dump()])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    rows = store.pain_reports(PERSON)

    assert captured["method"] == "GET"
    assert captured["url"].startswith("https://example.supabase.co/rest/v1/pain_reports")
    assert captured["headers"]["apikey"] == "sb_secret_x"
    assert captured["params"]["person_id"] == f"eq.{PERSON}"
    assert captured["params"]["order"] == "mission_day.asc,time.asc"
    assert "region_id" not in captured["params"]
    assert rows == [pain_row()]


def test_supabase_list_filters_by_region():
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["params"] = dict(request.url.params)
        return httpx.Response(200, json=[])

    store = storage.SupabaseStorage(
        "https://example.supabase.co",
        "sb_secret_x",
        client=httpx.Client(transport=httpx.MockTransport(handler)),
    )

    assert store.pain_reports(PERSON, "left_knee") == []
    assert captured["params"]["region_id"] == "eq.left_knee"
