"""Per-client rate limit for the public API, standard library only.

The API has no login (docs/PRIVACY.md), so the smallest useful guard is a cap
per client address. Each address gets a sliding window of 60 seconds: a request
is refused once the address already made `limit` requests in the last 60
seconds, and allowed again when the oldest of them leaves the window.

`RATE_LIMIT_PER_MINUTE` sets the cap: unset or empty means 120, `0` turns the
limit off, and a value that is not a whole number or is negative means 120.
`/health`, `/openapi.json` and `/docs` are exempt, so the health check and the
schema stay reachable when an address is over the cap.

The client address is the first value of `X-Forwarded-For` when that header is
present, else `request.client.host`. Railway's proxy terminates TLS, so the
socket address of every request is the proxy: the header is the only place the
address the proxy saw appears. The proxy sets it, so a client cannot pick
another address to escape its own window; with no proxy the header is absent
and the socket address is used.

Old windows are dropped on the way: an address's timestamps are pruned on each
of its requests, and the whole table is swept when it holds more than
`RateLimiter.max_clients`, so memory follows the addresses seen in one window,
not the uptime of the service.
"""

from __future__ import annotations

import math
import os
import threading
import time
from collections import deque
from collections.abc import Callable

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

WINDOW_SECONDS = 60.0
DEFAULT_LIMIT = 120
MAX_CLIENTS = 1024
SWEEP_EVERY = 256
EXEMPT_PATHS = ("/health", "/docs", "/openapi.json")
TOO_MANY = {"detail": "too many requests, try again in a minute"}


def configured_limit() -> int:
    """`RATE_LIMIT_PER_MINUTE` as a count; unset, empty, invalid or negative is 120."""
    raw = os.environ.get("RATE_LIMIT_PER_MINUTE", "").strip()
    if not raw:
        return DEFAULT_LIMIT
    try:
        value = int(raw)
    except ValueError:
        return DEFAULT_LIMIT
    return value if value >= 0 else DEFAULT_LIMIT


def is_exempt(path: str) -> bool:
    """True for the paths that are never counted (`/docs/*` covers its redirect)."""
    return path in EXEMPT_PATHS or path.startswith("/docs/")


def client_address(scope: Scope) -> str:
    """The client address: first `X-Forwarded-For` value, else the socket address."""
    for name, raw in scope.get("headers", ()):
        if name == b"x-forwarded-for":
            first = raw.decode("latin-1").split(",")[0].strip()
            if first:
                return first
            break
    client = scope.get("client")
    return client[0] if client else "unknown"


class RateLimiter:
    """Sliding-window counter per client address, safe across threads.

    `clock` is injected so tests can move time; the default is `time.monotonic`,
    which no wall-clock adjustment on the host can jump.
    """

    def __init__(
        self,
        clock: Callable[[], float] = time.monotonic,
        window: float = WINDOW_SECONDS,
        max_clients: int = MAX_CLIENTS,
    ) -> None:
        self.clock = clock
        self.window = window
        self.max_clients = max_clients
        self._lock = threading.Lock()
        self._seen: dict[str, deque[float]] = {}
        self._requests = 0

    @property
    def tracked_clients(self) -> int:
        """How many addresses the table holds now, after its last sweep."""
        with self._lock:
            return len(self._seen)

    def reset(self) -> None:
        """Forget every window (the tests start each case from an empty table)."""
        with self._lock:
            self._seen.clear()
            self._requests = 0

    def allow(self, client: str, limit: int) -> int | None:
        """Count one request for `client`; None when allowed, else seconds to wait."""
        now = self.clock()
        with self._lock:
            self._requests += 1
            times = self._seen.setdefault(client, deque())
            cutoff = now - self.window
            while times and times[0] <= cutoff:
                times.popleft()
            if len(times) >= limit:
                retry_after = max(1, math.ceil(times[0] + self.window - now))
            else:
                times.append(now)
                retry_after = None
            if self._requests % SWEEP_EVERY == 0 or len(self._seen) > self.max_clients:
                self._sweep(now)
            return retry_after

    def _sweep(self, now: float) -> None:
        """Drop emptied windows, then the least recently seen over the cap."""
        cutoff = now - self.window
        for client in [
            client for client, times in self._seen.items() if times[-1] <= cutoff
        ]:
            del self._seen[client]
        over = len(self._seen) - self.max_clients
        if over > 0:
            oldest = sorted(self._seen, key=lambda client: self._seen[client][-1])
            for client in oldest[:over]:
                del self._seen[client]


class RateLimitMiddleware:
    """Answer 429 with a `Retry-After` header when a client is over its cap."""

    def __init__(self, app: ASGIApp, limiter: RateLimiter) -> None:
        self.app = app
        self.limiter = limiter

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or is_exempt(scope.get("path", "")):
            await self.app(scope, receive, send)
            return
        limit = configured_limit()
        if limit == 0:
            await self.app(scope, receive, send)
            return
        retry_after = self.limiter.allow(client_address(scope), limit)
        if retry_after is None:
            await self.app(scope, receive, send)
            return
        response = JSONResponse(
            status_code=429,
            content=TOO_MANY,
            headers={"Retry-After": str(retry_after)},
        )
        await response(scope, receive, send)


limiter = RateLimiter()
