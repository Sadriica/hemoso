"""Smoke test a running HeMoSo backend: health, one entry, its history, CORS.

  python scripts/smoke.py <backend_url> [--origin <frontend_url>]

<backend_url> is the base URL of the API, with or without a trailing slash.
--origin is the frontend URL a browser uses; the last check is the CORS
preflight for it. Without --origin that check is skipped.

The entry it stores belongs to `smoke_test_1` with a fixed day and time, so a
second run stores nothing: the store keeps one entry per person, indicator, day
and time (REQ-13). Every value is synthetic (REQ-14).

It prints one line per check and exits 1 when any check fails.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from http.client import HTTPConnection, HTTPSConnection
from pathlib import Path
from urllib.parse import quote, urlsplit

REPO_ROOT = Path(__file__).resolve().parent.parent
INDICATORS = REPO_ROOT / "config" / "data" / "indicators.csv"

PERSON_ID = "smoke_test_1"
MISSION_DAY = 1
TIME = "12:00"
CONTEXT = "rest"
TIMEOUT = 20.0
MAX_DETAIL = 160


class Precondition(Exception):
    """Something the smoke test needs before it can call the backend."""


class Checks:
    """Prints one line per check and counts the failures."""

    def __init__(self) -> None:
        self.total = 0
        self.failures = 0

    def check(self, name: str, ok: bool, detail: str) -> bool:
        self.total += 1
        if not ok:
            self.failures += 1
        print(f"{'OK' if ok else 'FAIL':<4} {name}: {detail}")
        return ok


def load_indicator(path: Path = INDICATORS) -> tuple[str, str, float]:
    """(id, unit, value) from the first row of indicators.csv.

    The value is that row's min_spread: a number the file already holds, so the
    smoke entry invents no measurement.
    """
    if not path.exists():
        raise Precondition(f"{path} does not exist")
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            indicator_id = (row.get("id") or "").strip()
            unit = (row.get("unit") or "").strip()
            if not indicator_id or not unit:
                continue
            try:
                value = float((row.get("min_spread") or "").strip())
            except ValueError:
                raise Precondition(
                    f"row {indicator_id} has no number in min_spread"
                ) from None
            return indicator_id, unit, value
    raise Precondition(f"{path} has no indicator row")


def request(
    base: str, method: str, path: str, headers: dict[str, str] | None = None,
    body: bytes | None = None,
) -> tuple[int, dict[str, str], bytes]:
    """(status, lowercased headers, body) from one request. Raises OSError."""
    parts = urlsplit(base)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError(f"{base!r} is not an http or https URL")
    connection_class = HTTPSConnection if parts.scheme == "https" else HTTPConnection
    target = parts.path.rstrip("/") + path
    connection = connection_class(parts.hostname, parts.port, timeout=TIMEOUT)
    try:
        connection.request(method, target, body=body, headers=headers or {})
        response = connection.getresponse()
        data = response.read()
        headers_out = {name.lower(): value for name, value in response.getheaders()}
        return response.status, headers_out, data
    finally:
        connection.close()


def as_json(data: bytes):
    """The body as JSON, or None when it is not JSON."""
    try:
        return json.loads(data)
    except (ValueError, UnicodeDecodeError):
        return None


def short(data: bytes) -> str:
    """The body on one line, cut to MAX_DETAIL characters."""
    text = " ".join(data.decode("utf-8", errors="replace").split())
    if not text:
        return "empty body"
    return text if len(text) <= MAX_DETAIL else text[:MAX_DETAIL] + "..."


def run(base: str, origin: str | None) -> int:
    checks = Checks()
    base = base.rstrip("/")

    try:
        indicator_id, unit, value = load_indicator()
    except Precondition as error:
        checks.check("indicators", False, str(error))
        return 1

    try:
        status, _, data = request(base, "GET", "/health")
    except (OSError, ValueError) as error:
        checks.check("GET /health", False, f"cannot reach {base}: {error}")
        return 1
    health = as_json(data)
    checks.check(
        "GET /health",
        status == 200 and health == {"status": "ok"},
        '200 {"status":"ok"}' if status == 200 and health == {"status": "ok"}
        else f"expected 200 and the status ok, got {status}: {short(data)}",
    )

    payload = {
        "person_id": PERSON_ID,
        "indicator_id": indicator_id,
        "value": value,
        "unit": unit,
        "mission_day": MISSION_DAY,
        "time": TIME,
        "context": CONTEXT,
    }
    body = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    stored_detail = (
        f"{PERSON_ID} {indicator_id} {value} {unit} on day {MISSION_DAY} at {TIME}"
    )

    try:
        status, _, data = request(base, "POST", "/entries", headers=headers, body=body)
    except OSError as error:
        checks.check("POST /entries", False, f"cannot reach {base}: {error}")
        return 1
    stored = as_json(data)
    checks.check(
        "POST /entries",
        status in (200, 201) and stored == payload,
        f"{status}, stored {stored_detail}"
        if status in (200, 201) and stored == payload
        else f"expected 201 for a new entry (200 when an earlier run stored it) "
        f"and the entry back, got {status}: {short(data)}",
    )

    try:
        status, _, data = request(base, "POST", "/entries", headers=headers, body=body)
    except OSError as error:
        checks.check("POST /entries again", False, f"cannot reach {base}: {error}")
        return 1
    checks.check(
        "POST /entries again",
        status == 200 and as_json(data) == payload,
        "200, nothing stored twice"
        if status == 200 and as_json(data) == payload
        else f"expected 200 for the same entry, got {status}: {short(data)}",
    )

    path = f"/people/{PERSON_ID}/indicators/{quote(indicator_id, safe='')}/history"
    try:
        status, _, data = request(base, "GET", path)
    except OSError as error:
        checks.check("GET history", False, f"cannot reach {base}: {error}")
        return 1
    history = as_json(data)
    count = len(history) if isinstance(history, list) else 0
    found = status == 200 and isinstance(history, list) and payload in history
    checks.check(
        "GET history",
        found,
        f"200, {count} {'entry' if count == 1 else 'entries'} for {indicator_id}, "
        f"the smoke entry is one"
        if found
        else f"expected 200 and the smoke entry in the list, got {status}: "
        f"{short(data)}",
    )

    if origin:
        frontend = origin.rstrip("/")
        preflight = {
            "Origin": frontend,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }
        try:
            status, response_headers, data = request(
                base, "OPTIONS", "/entries", headers=preflight
            )
        except OSError as error:
            checks.check("CORS preflight", False, f"cannot reach {base}: {error}")
            return 1
        allowed = response_headers.get("access-control-allow-origin")
        checks.check(
            "CORS preflight",
            status in (200, 204) and allowed in (frontend, "*"),
            f"{status}, access-control-allow-origin {allowed}"
            if status in (200, 204) and allowed in (frontend, "*")
            else f"expected 200 and access-control-allow-origin {frontend}, got "
            f"{status} and {allowed or 'no such header'}; ALLOWED_ORIGINS on the "
            f"host must list {frontend} without a trailing slash",
        )
    else:
        print("SKIP CORS preflight: no --origin given")

    return 1 if checks.failures else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Smoke test a running HeMoSo backend."
    )
    parser.add_argument("backend_url", help="base URL of the API")
    parser.add_argument(
        "--origin",
        help="frontend URL a browser uses, for the CORS preflight",
    )
    args = parser.parse_args(argv)
    return run(args.backend_url, args.origin)


if __name__ == "__main__":
    sys.exit(main())
