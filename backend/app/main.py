"""HeMoSo backend: FastAPI app with health, entry store and history routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

from . import storage
from .indicators import validate_against_indicators
from .models import Entry

app = FastAPI()

Store = Annotated[storage.Storage, Depends(storage.get_storage)]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/entries", status_code=201)
def create_entry(entry: Entry, store: Store) -> Entry:
    error = validate_against_indicators(entry)
    if error is not None:
        raise HTTPException(status_code=422, detail=error)
    return store.add(entry)


@app.get("/people/{person_id}/indicators/{indicator_id}/history")
def get_history(person_id: str, indicator_id: str, store: Store) -> list[Entry]:
    return store.history(person_id, indicator_id)
