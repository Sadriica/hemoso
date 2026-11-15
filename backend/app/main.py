"""HeMoSo backend: FastAPI app with health, entry store, history and state routes."""

from __future__ import annotations

import hmac
import math
import os
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from . import accounts, storage
from .conditions import condition_result, latest_value, parse_signals
from .indicators import (
    load_attention_rows,
    load_condition_rows,
    load_indicator_rows,
    validate_against_indicators,
)
from .models import (
    CONTEXTS,
    Account,
    AccountOut,
    AttentionRow,
    BloodPressureState,
    ConditionScore,
    Credentials,
    Entry,
    IndicatorState,
    SessionOut,
    is_valid_id,
    is_valid_time,
)
from .ratelimit import RateLimitMiddleware, limiter
from .state import attention_for, baseline, state_for, window, worse_state


def allowed_origins() -> list[str]:
    """Origins from ALLOWED_ORIGINS (comma-separated); empty means the local dev server."""
    raw = os.environ.get("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]


@asynccontextmanager
async def lifespan(_: FastAPI):
    storage.ensure_supabase_config()
    yield


app = FastAPI(lifespan=lifespan)

# Added before CORS so CORS stays the outer layer and a 429 carries its headers.
app.add_middleware(RateLimitMiddleware, limiter=limiter)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

Store = Annotated[storage.Storage, Depends(storage.get_storage)]

# A blood pressure reading is these two indicators; the state route treats one
# value at a time, so this route reads both and keeps the worse state
# (FORMATS.md section 3, docs/findings/bio2-01-pressure-state-rule.md).
BLOOD_PRESSURE = ("bp_sys_mmhg", "bp_dia_mmhg")


def check_id(name: str, value: str) -> None:
    """422 unless `value` is a lowercase snake_case id."""
    if not is_valid_id(value):
        raise HTTPException(
            status_code=422, detail=f"{name} must be lowercase snake_case"
        )


def check_value(name: str, value: float) -> None:
    """422 unless `value` is a finite number."""
    if not math.isfinite(value):
        raise HTTPException(status_code=422, detail=f"{name} must be a finite number")


def check_context(context: str) -> None:
    """422 unless `context` is one of the four contexts."""
    if context not in CONTEXTS:
        raise HTTPException(
            status_code=422,
            detail="context must be rest, after_exercise, on_waking or before_sleep",
        )


def check_before(mission_day: int | None, time: str | None) -> tuple[int, str] | None:
    """The (mission_day, time) of the value under test, or None when neither is given.

    Both or neither: a day without a time does not say which entries come
    first, so one alone is a 422 (T-68).
    """
    if mission_day is None and time is None:
        return None
    if mission_day is None or time is None:
        raise HTTPException(
            status_code=422, detail="mission_day and time must be given together"
        )
    if mission_day <= 0:
        raise HTTPException(
            status_code=422, detail="mission_day must be a positive integer"
        )
    if not is_valid_time(time):
        raise HTTPException(status_code=422, detail="time must be HH:MM (24-hour)")
    return mission_day, time


def history_of(
    store: storage.Storage, person_id: str, indicator_id: str
) -> list[Entry]:
    """A person's stored entries for one indicator; 502 when the store fails."""
    try:
        return store.history(person_id, indicator_id)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="upstream storage error"
        ) from error


def state_of(
    entries: list[Entry],
    indicator_id: str,
    value: float,
    context: str,
    min_spread: float,
    before: tuple[int, str] | None,
) -> IndicatorState:
    """One value against the stored entries before it (FORMATS.md section 3)."""
    recent = window(entries, context, before)
    median, spread = baseline([entry.value for entry in recent], min_spread)
    attention = None
    if median is not None:
        attention = attention_for(load_attention_rows(indicator_id), value)
    return IndicatorState(
        state=state_for(value, median, spread, attention),
        median=median,
        spread=spread,
        n=len(recent),
        attention=(
            None
            if attention is None
            else AttentionRow(
                attention_level=attention["attention_level"],
                notify=attention["notify"],
                source=attention["source"],
            )
        ),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/accounts",
    status_code=201,
    responses={
        409: {
            "description": "This username is taken, or this person already has "
            "an account."
        }
    },
)
def create_account(body: Credentials, store: Store) -> AccountOut:
    """Create one account (REQ-37): the PIN is kept only as a salted hash."""
    if accounts.name_taken(body.person_id, store):
        raise HTTPException(status_code=409, detail=accounts.TAKEN_NAME)
    salt = accounts.new_salt()
    account = Account(
        person_id=body.person_id,
        salt=salt,
        pin_hash=accounts.hash_pin(body.pin, salt),
    )
    try:
        created = store.create_account(account)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail=accounts.STORAGE_ERROR
        ) from error
    if not created:
        raise HTTPException(
            status_code=409, detail="this person already has an account"
        )
    return AccountOut(person_id=body.person_id)


@app.post(
    "/sessions",
    responses={
        401: {"description": "Unknown person or wrong PIN; the same message."},
        429: {"description": "Five wrong PINs for this person in ten minutes."},
    },
)
def create_session(body: Credentials, store: Store) -> SessionOut:
    """A token for one person, valid 30 days (REQ-37)."""
    if accounts.wrong_pins.locked(body.person_id):
        raise HTTPException(status_code=429, detail=accounts.LOCKED)
    try:
        account = store.account(body.person_id)
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail=accounts.STORAGE_ERROR
        ) from error
    # An unknown person still pays for one scrypt run, so the answer says
    # nothing about which people have an account.
    salt = account.salt if account is not None else accounts.DUMMY_SALT
    if account is None or not hmac.compare_digest(
        accounts.hash_pin(body.pin, salt), account.pin_hash
    ):
        accounts.wrong_pins.record(body.person_id)
        raise HTTPException(status_code=401, detail=accounts.WRONG_CREDENTIALS)
    accounts.wrong_pins.clear(body.person_id)
    token, expires_at = accounts.issue_token(body.person_id)
    return SessionOut(token=token, person_id=body.person_id, expires_at=expires_at)


@app.post(
    "/entries",
    status_code=201,
    responses={
        200: {"description": "An entry with this key and value already existed."},
        409: {
            "description": "An entry with this key already exists with a "
            "different value or unit."
        },
    },
)
def create_entry(
    entry: Entry, store: Store, request: Request, response: Response
) -> Entry:
    accounts.authorize(request, entry.person_id, store)
    error = validate_against_indicators(entry)
    if error is not None:
        raise HTTPException(status_code=422, detail=error)
    try:
        stored, created = store.add(entry)
    except storage.EntryConflict as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "an entry for this person, indicator, day and time already"
                " exists with a different value"
            ),
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="upstream storage error"
        ) from error
    if not created:
        response.status_code = 200
    return stored


@app.get("/people/{person_id}/indicators/{indicator_id}/history")
def get_history(
    person_id: str, indicator_id: str, store: Store, request: Request
) -> list[Entry]:
    for name, path_id in (("person_id", person_id), ("indicator_id", indicator_id)):
        check_id(name, path_id)
    accounts.authorize(request, person_id, store)
    return history_of(store, person_id, indicator_id)


@app.get(
    "/people/{person_id}/indicators/{indicator_id}/state",
    responses={
        404: {"description": "The indicator is not in config/data/indicators.csv."},
    },
)
def get_state(
    person_id: str,
    indicator_id: str,
    value: float,
    store: Store,
    request: Request,
    context: str = "rest",
    mission_day: int | None = None,
    time: str | None = None,
) -> IndicatorState:
    """One value against the person's own baseline (FORMATS.md section 3)."""
    for name, path_id in (("person_id", person_id), ("indicator_id", indicator_id)):
        check_id(name, path_id)
    accounts.authorize(request, person_id, store)
    check_context(context)
    check_value("value", value)
    before = check_before(mission_day, time)
    indicator = load_indicator_rows().get(indicator_id)
    if indicator is None:
        raise HTTPException(status_code=404, detail="unknown indicator")
    entries = history_of(store, person_id, indicator_id)
    return state_of(
        entries, indicator_id, value, context, float(indicator["min_spread"]), before
    )


@app.get(
    "/people/{person_id}/blood_pressure/state",
    responses={
        404: {
            "description": "A blood pressure indicator is not in "
            "config/data/indicators.csv."
        },
    },
)
def get_blood_pressure_state(
    person_id: str,
    systolic: float,
    diastolic: float,
    store: Store,
    request: Request,
    context: str = "rest",
    mission_day: int | None = None,
    time: str | None = None,
) -> BloodPressureState:
    """One blood pressure reading: the worse of its two states (bio2-01)."""
    check_id("person_id", person_id)
    accounts.authorize(request, person_id, store)
    check_context(context)
    for name, number in (("systolic", systolic), ("diastolic", diastolic)):
        check_value(name, number)
    before = check_before(mission_day, time)
    rows = load_indicator_rows()
    indicators = {}
    for indicator_id in BLOOD_PRESSURE:
        indicator = rows.get(indicator_id)
        if indicator is None:
            raise HTTPException(status_code=404, detail="unknown indicator")
        indicators[indicator_id] = indicator
    systolic_state = state_of(
        history_of(store, person_id, "bp_sys_mmhg"),
        "bp_sys_mmhg",
        systolic,
        context,
        float(indicators["bp_sys_mmhg"]["min_spread"]),
        before,
    )
    diastolic_state = state_of(
        history_of(store, person_id, "bp_dia_mmhg"),
        "bp_dia_mmhg",
        diastolic,
        context,
        float(indicators["bp_dia_mmhg"]["min_spread"]),
        before,
    )
    return BloodPressureState(
        state=worse_state(systolic_state.state, diastolic_state.state),
        systolic=systolic_state,
        diastolic=diastolic_state,
    )


@app.get("/people/{person_id}/conditions")
def get_conditions(
    person_id: str, store: Store, request: Request
) -> list[ConditionScore]:
    """The evidence score of every condition in config/rules/conditions.csv.

    One point per signal: 1 when the newest reading crossed an attention row on
    the signal's side, 0.5 when it is outside the person's baseline on that
    side (both from `app.state`), 0 otherwise; the score is the mean of the
    usable signals (bio2-02, FORMATS.md section 3 point 3).
    """
    if not is_valid_id(person_id):
        raise HTTPException(
            status_code=422, detail="person_id must be lowercase snake_case"
        )
    accounts.authorize(request, person_id, store)
    rows = load_condition_rows()
    indicators = load_indicator_rows()
    indicator_ids = list(
        dict.fromkeys(
            indicator_id
            for row in rows
            for indicator_id, _ in parse_signals(row["based_on"])
        )
    )
    try:
        histories = {
            indicator_id: store.history(person_id, indicator_id)
            for indicator_id in indicator_ids
        }
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502, detail="upstream storage error"
        ) from error
    latest = {}
    for indicator_id in indicator_ids:
        indicator = indicators.get(indicator_id)
        latest[indicator_id] = latest_value(
            histories[indicator_id],
            None if indicator is None else float(indicator["min_spread"]),
            load_attention_rows(indicator_id),
        )
    return [condition_result(row, latest) for row in rows]
