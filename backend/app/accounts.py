"""Accounts and session tokens, standard library only (REQ-37).

An account is a person id and a salted PIN hash: `hashlib.scrypt` over the PIN,
the salt and n=2**14, r=8, p=1. The PIN is never stored and never logged.

A session token is `base64url(payload) + "." + base64url(signature)`, the
payload a JSON object `{"sub": person_id, "exp": unix_seconds}`, the signature
`HMAC-SHA256(SESSION_SECRET, base64url(payload))`, both base64url without
padding. `SESSION_SECRET` comes from the environment; when it is unset, one is
generated at start and a single warning says that tokens end at a restart.

Wrong PINs are counted per person in the memory of this process: after
`LOCKOUT_FAILURES` of them within `LOCKOUT_SECONDS`, that person is answered 429
until the oldest of those failures leaves the window. A restart clears the
count, and with more than one instance each counts its own attempts.

Every route that names a person calls `authorize`: a person with an account
needs a token for that same person, and a person without one stays open (the
synthetic demo astronaut and the smoke-test person, REQ-32).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import threading
import time
from collections import deque
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import HTTPException, Request

from . import storage

SCRYPT_N = 2**14
SCRYPT_R = 8
SCRYPT_P = 1
HASH_BYTES = 32
SALT_BYTES = 16
SESSION_DAYS = 30
LOCKOUT_FAILURES = 5
LOCKOUT_SECONDS = 600.0

WRONG_CREDENTIALS = "wrong username or PIN"
MISSING_TOKEN = "missing or invalid token"
OTHER_PERSON = "this token belongs to another person"
STORAGE_ERROR = "upstream storage error"
LOCKED = "too many wrong PINs, try again later"
# A fixed salt, used to spend the same work on an unknown person as on a wrong
# PIN, so the answer does not say whether the account exists.
DUMMY_SALT = "00" * SALT_BYTES

logger = logging.getLogger(__name__)

_secret: str | None = None
_secret_lock = threading.Lock()


def secret() -> str:
    """`SESSION_SECRET`, or one random value generated once when it is unset."""
    global _secret
    with _secret_lock:
        configured = os.environ.get("SESSION_SECRET", "")
        if configured:
            return configured
        if _secret is None:
            _secret = secrets.token_hex(32)
            logger.warning(
                "SESSION_SECRET is unset: tokens are signed with a random"
                " secret and end at the next restart"
            )
        return _secret


def new_salt() -> str:
    """A random 16-byte salt, hex."""
    return secrets.token_hex(SALT_BYTES)


def hash_pin(pin: str, salt: str) -> str:
    """The hex scrypt digest of `pin` and the hex `salt`."""
    return hashlib.scrypt(
        pin.encode("utf-8"),
        salt=bytes.fromhex(salt),
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        dklen=HASH_BYTES,
    ).hex()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _unb64(text: str) -> bytes | None:
    """The bytes of one base64url field without padding, or None when it is not one."""
    try:
        return base64.b64decode(
            text + "=" * (-len(text) % 4), altchars=b"-_", validate=True
        )
    except ValueError:
        return None


def _iso(moment: datetime) -> str:
    return moment.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def issue_token(
    person_id: str, now: datetime | None = None
) -> tuple[str, str]:
    """A signed token for `person_id` and its expiry, ISO 8601 in UTC."""
    expires = (now or datetime.now(UTC)) + timedelta(days=SESSION_DAYS)
    payload = _b64(
        json.dumps(
            {"sub": person_id, "exp": int(expires.timestamp())},
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
    )
    signature = _b64(
        hmac.new(secret().encode("utf-8"), payload.encode("ascii"), hashlib.sha256)
        .digest()
    )
    return f"{payload}.{signature}", _iso(expires)


def token_person(token: str, now: float | None = None) -> str | None:
    """The person the token is for, or None when it is tampered, malformed or expired."""
    payload, _, signature = token.partition(".")
    if not payload or not signature:
        return None
    expected = _b64(
        hmac.new(secret().encode("utf-8"), payload.encode("ascii"), hashlib.sha256)
        .digest()
    )
    if not hmac.compare_digest(expected, signature):
        return None
    raw = _unb64(payload)
    if raw is None:
        return None
    try:
        body = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(body, dict):
        return None
    subject = body.get("sub")
    expires = body.get("exp")
    if not isinstance(subject, str) or not isinstance(expires, int):
        return None
    if expires <= (time.time() if now is None else now):
        return None
    return subject


class WrongPins:
    """Wrong PINs per person in a sliding window, safe across threads."""

    def __init__(
        self, limit: int = LOCKOUT_FAILURES, seconds: float = LOCKOUT_SECONDS
    ) -> None:
        self.limit = limit
        self.seconds = seconds
        self._seen: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self.clock = time.monotonic

    def _prune(self, stamps: deque[float], now: float) -> None:
        """Drop the failures that left the window. Call under the lock."""
        while stamps and stamps[0] <= now - self.seconds:
            stamps.popleft()

    def locked(self, person_id: str) -> bool:
        """True when `person_id` already used up its wrong PINs in the window."""
        now = self.clock()
        with self._lock:
            stamps = self._seen.get(person_id)
            if stamps is None:
                return False
            self._prune(stamps, now)
            if not stamps:
                del self._seen[person_id]
                return False
            return len(stamps) >= self.limit

    def record(self, person_id: str) -> None:
        """Count one wrong PIN for `person_id`."""
        now = self.clock()
        with self._lock:
            stamps = self._seen.setdefault(person_id, deque())
            self._prune(stamps, now)
            stamps.append(now)

    def clear(self, person_id: str) -> None:
        """Forget the wrong PINs of `person_id`, after a good one."""
        with self._lock:
            self._seen.pop(person_id, None)

    def reset(self) -> None:
        """Forget every count."""
        with self._lock:
            self._seen.clear()


wrong_pins = WrongPins()


def authorize(request: Request, person_id: str, store: storage.Storage) -> None:
    """Refuse the request unless it may act for `person_id`.

    A person without an account stays open (REQ-32). A person with one needs
    `Authorization: Bearer <token>`: 401 when the header is missing, malformed,
    tampered or expired; 403 when the token belongs to another person.
    """
    try:
        account = store.account(person_id)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=STORAGE_ERROR) from error
    if account is None:
        return
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail=MISSING_TOKEN)
    subject = token_person(token.strip())
    if subject is None:
        raise HTTPException(status_code=401, detail=MISSING_TOKEN)
    if subject != person_id:
        raise HTTPException(status_code=403, detail=OTHER_PERSON)
