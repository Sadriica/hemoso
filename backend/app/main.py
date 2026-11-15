"""HeMoSo backend: FastAPI app with health, entry store, history and state routes."""

from __future__ import annotations

import math
import os
from contextlib import asynccontextmanager
from typing import Annotated

import httpx
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from . import storage
from .indicators import (
    load_attention_rows,
    load_indicator_rows,
    validate_against_indicators,
)
from .models import (
    CONTEXTS,
    AttentionRow,
    BloodPressureState,
    Entry,
    IndicatorState,
    is_valid_id,
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
    allow_headers=["*"],
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
) -> IndicatorState:
    """One value against the stored entries before it (FORMATS.md section 3)."""
    recent = window(entries, context)
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
def create_entry(entry: Entry, store: Store, response: Response) -> Entry:
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
def get_history(person_id: str, indicator_id: str, store: Store) -> list[Entry]:
    for name, path_id in (("person_id", person_id), ("indicator_id", indicator_id)):
        check_id(name, path_id)
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
    context: str = "rest",
) -> IndicatorState:
    """One value against the person's own baseline (FORMATS.md section 3)."""
    for name, path_id in (("person_id", person_id), ("indicator_id", indicator_id)):
        check_id(name, path_id)
    check_context(context)
    check_value("value", value)
    indicator = load_indicator_rows().get(indicator_id)
    if indicator is None:
        raise HTTPException(status_code=404, detail="unknown indicator")
    entries = history_of(store, person_id, indicator_id)
    return state_of(
        entries, indicator_id, value, context, float(indicator["min_spread"])
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
    context: str = "rest",
) -> BloodPressureState:
    """One blood pressure reading: the worse of its two states (bio2-01)."""
    check_id("person_id", person_id)
    check_context(context)
    for name, number in (("systolic", systolic), ("diastolic", diastolic)):
        check_value(name, number)
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
    )
    diastolic_state = state_of(
        history_of(store, person_id, "bp_dia_mmhg"),
        "bp_dia_mmhg",
        diastolic,
        context,
        float(indicators["bp_dia_mmhg"]["min_spread"]),
    )
    return BloodPressureState(
        state=worse_state(systolic_state.state, diastolic_state.state),
        systolic=systolic_state,
        diastolic=diastolic_state,
    )
