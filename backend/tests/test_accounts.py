"""Accounts, sessions and the token rule on every person route (REQ-37)."""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

import httpx
import pytest

from app import accounts, storage
from app.models import Account

PIN = "2468"
WRONG = "1357"
PERSON = "crew_1"
OTHER = "crew_2"
ENTRY = {
    "person_id": PERSON,
    "indicator_id": "example_indicator",
    "value": 1.5,
    "unit": "example_unit",
    "mission_day": 1,
    "time": "13:30",
    "context": "rest",
}

INDICATORS_CSV = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
    "example_indicator,Example indicator,example_unit,both,example measurement,"
    "isolation_and_confinement,4,B,neuro_behavioural,Assumption\n"
    "bp_sys_mmhg,Systolic blood pressure,mmHg,both,arm cuff,gravity_fields,"
    "5,A,cardiovascular,Assumption\n"
    "bp_dia_mmhg,Diastolic blood pressure,mmHg,both,arm cuff,gravity_fields,"
    "4,A,cardiovascular,Assumption\n"
)

PERSON_ROUTES = [
    ("post", "/entries", {"json": ENTRY}, 201),
    (
        "get",
        "/people/{person}/indicators/example_indicator/history",
        None,
        200,
    ),
    (
        "get",
        "/people/{person}/indicators/example_indicator/state",
        {"params": {"value": 72}},
        200,
    ),
    (
        "get",
        "/people/{person}/blood_pressure/state",
        {"params": {"systolic": 120, "diastolic": 95}},
        200,
    ),
    ("get", "/people/{person}/conditions", None, 200),
]


@pytest.fixture(autouse=True)
def _fixed_secret(monkeypatch):
    """A known signing key and no leftover wrong PINs between tests."""
    monkeypatch.setenv("SESSION_SECRET", "test-secret-for-accounts")
    accounts.wrong_pins.reset()


@pytest.fixture
def store():
    """The in-memory store the client fixture wired into the app."""
    from app.main import app

    return app.dependency_overrides[storage.get_storage]()


def create(client, person_id: str = PERSON, pin: str = PIN):
    return client.post("/accounts", json={"person_id": person_id, "pin": pin})


def sign_in(client, person_id: str = PERSON, pin: str = PIN):
    return client.post("/sessions", json={"person_id": person_id, "pin": pin})


def token_for(client, person_id: str = PERSON, pin: str = PIN) -> str:
    return sign_in(client, person_id, pin).json()["token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def write_indicators(config_dir) -> None:
    path = config_dir / "data" / "indicators.csv"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(INDICATORS_CSV, encoding="utf-8")


def test_create_account_stores_only_a_salted_hash(client, store):
    response = create(client)

    assert response.status_code == 201
    assert response.json() == {"person_id": PERSON}
    account = store.account(PERSON)
    assert account is not None
    assert account.pin_hash != PIN
    assert re.fullmatch("[0-9a-f]{64}", account.pin_hash)
    assert re.fullmatch("[0-9a-f]{32}", account.salt)
    assert accounts.hash_pin(PIN, account.salt) == account.pin_hash


def test_two_accounts_get_different_salts(client, store):
    create(client)
    create(client, OTHER, pin=WRONG)

    first = store.account(PERSON)
    second = store.account(OTHER)
    assert first is not None and second is not None
    assert first.salt != second.salt
    assert first.pin_hash != second.pin_hash


def test_duplicate_account_is_409(client):
    create(client)

    response = create(client)

    assert response.status_code == 409
    assert response.json()["detail"] == "this person already has an account"


@pytest.mark.parametrize(
    "body",
    [
        {"person_id": PERSON, "pin": "123"},
        {"person_id": PERSON, "pin": "123456789"},
        {"person_id": PERSON, "pin": "12a4"},
        {"person_id": "Crew-1", "pin": PIN},
        {"pin": PIN},
    ],
)
def test_bad_account_body_is_422(client, store, body):
    response = client.post("/accounts", json=body)

    assert response.status_code == 422
    assert store.account(PERSON) is None


def test_malformed_pin_is_422_on_sign_in(client):
    create(client)

    response = sign_in(client, pin="123")

    assert response.status_code == 422


def test_sign_in_returns_a_30_day_token(client):
    create(client)

    response = sign_in(client)

    assert response.status_code == 200
    body = response.json()
    assert body["person_id"] == PERSON
    assert re.fullmatch(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", body["token"])
    assert body["expires_at"].endswith("Z")
    expires = datetime.strptime(body["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=UTC
    )
    left = expires - datetime.now(UTC)
    assert timedelta(days=29, hours=23) < left <= timedelta(days=30)


def test_wrong_pin_and_unknown_person_answer_the_same(client):
    create(client)

    wrong = sign_in(client, pin=WRONG)
    unknown = sign_in(client, person_id="nobody_here")

    assert wrong.status_code == 401
    assert unknown.status_code == 401
    assert wrong.json()["detail"] == "wrong username or PIN"
    assert unknown.json() == wrong.json()


def test_five_wrong_pins_lock_the_person_for_ten_minutes(client, monkeypatch):
    create(client)
    now = [1000.0]
    monkeypatch.setattr(accounts.wrong_pins, "clock", lambda: now[0])

    for _ in range(5):
        assert sign_in(client, pin=WRONG).status_code == 401

    locked = sign_in(client)
    assert locked.status_code == 429
    assert locked.json()["detail"] == "too many wrong PINs, try again later"

    now[0] += accounts.LOCKOUT_SECONDS
    assert sign_in(client).status_code == 200


def test_a_locked_person_does_not_lock_another(client):
    create(client)
    create(client, OTHER, pin=WRONG)
    for _ in range(5):
        sign_in(client, pin=PIN[::-1])

    assert sign_in(client, OTHER, pin=WRONG).status_code == 200


def test_token_of_another_person_is_403(client):
    create(client)
    create(client, OTHER, pin=WRONG)

    response = client.get(
        f"/people/{PERSON}/indicators/example_indicator/history",
        headers=bearer(token_for(client, OTHER, pin=WRONG)),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "this token belongs to another person"


def test_expired_token_is_401(client):
    create(client)
    expired, _ = accounts.issue_token(
        PERSON, now=datetime.now(UTC) - timedelta(days=31)
    )

    response = client.get(
        f"/people/{PERSON}/indicators/example_indicator/history",
        headers=bearer(expired),
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "missing or invalid token"


@pytest.mark.parametrize("tamper", ["signature", "payload", "none"])
def test_tampered_token_is_401(client, tamper):
    create(client)
    token = token_for(client)
    payload, _, signature = token.partition(".")
    if tamper == "signature":
        token = f"{payload}.{signature[:-1]}{'A' if signature[-1] != 'A' else 'B'}"
    elif tamper == "payload":
        token = f"{payload[:-1]}{'A' if payload[-1] != 'A' else 'B'}.{signature}"
    else:
        token = payload

    response = client.get(
        f"/people/{PERSON}/indicators/example_indicator/history",
        headers=bearer(token),
    )

    assert response.status_code == 401


def test_a_person_without_an_account_stays_open(client, tmp_path):
    create(client)
    write_indicators(tmp_path)
    demo = "demo_astronaut_1"

    stored = client.post("/entries", json={**ENTRY, "person_id": demo})
    assert stored.status_code == 201
    for path in (
        f"/people/{demo}/indicators/example_indicator/history",
        f"/people/{demo}/indicators/example_indicator/state?value=72",
        f"/people/{demo}/blood_pressure/state?systolic=120&diastolic=95",
        f"/people/{demo}/conditions",
        "/health",
    ):
        assert client.get(path).status_code == 200, path


@pytest.mark.parametrize("method, path, kwargs, allowed", PERSON_ROUTES)
def test_every_person_route_needs_the_token(
    client, tmp_path, method, path, kwargs, allowed
):
    write_indicators(tmp_path)
    create(client)
    url = path.format(person=PERSON)
    call = getattr(client, method)

    refused = call(url, **(kwargs or {}))
    assert refused.status_code == 401, url
    assert refused.json()["detail"] == "missing or invalid token"

    answered = call(url, headers=bearer(token_for(client)), **(kwargs or {}))
    assert answered.status_code == allowed, url


def test_bare_authorization_value_is_401(client):
    create(client)

    response = client.get(
        f"/people/{PERSON}/indicators/example_indicator/history",
        headers={"Authorization": token_for(client)},
    )

    assert response.status_code == 401


def test_cors_allows_the_authorization_header(client):
    response = client.options(
        "/entries",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_sqlite_keeps_accounts_across_restarts(tmp_path):
    path = tmp_path / "entries.db"
    account = Account(
        person_id=PERSON, salt=accounts.new_salt(), pin_hash=accounts.hash_pin(PIN, "0" * 32)
    )
    first = storage.SqliteStorage(path)
    assert first.create_account(account) is True
    assert first.create_account(account) is False

    reopened = storage.SqliteStorage(path)
    assert reopened.account(PERSON) == account
    assert reopened.account(OTHER) is None


def test_supabase_accounts_use_the_accounts_table():
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(
                200,
                json=[{"person_id": PERSON, "salt": "aa", "pin_hash": "bb"}],
            )
        if b'"crew_2"' in request.content:
            return httpx.Response(409, json={"message": "duplicate key"})
        return httpx.Response(201)

    client = httpx.Client(transport=httpx.MockTransport(handler))
    store = storage.SupabaseStorage("https://example.supabase.co", "sb_secret_x", client)

    found = store.account(PERSON)
    assert found == Account(person_id=PERSON, salt="aa", pin_hash="bb")
    assert requests[0].url.path == "/rest/v1/accounts"
    assert requests[0].url.params["select"] == "person_id,salt,pin_hash"

    assert store.create_account(found) is True
    assert requests[1].method == "POST"
    assert requests[1].headers["Prefer"] == "return=minimal"
    duplicate = Account(person_id=OTHER, salt="aa", pin_hash="bb")
    assert store.create_account(duplicate) is False
