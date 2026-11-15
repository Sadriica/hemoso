"""Rate limit: one sliding window per client address (T-65, REQ-14)."""

from __future__ import annotations

import pytest

from app.ratelimit import (
    DEFAULT_LIMIT,
    RateLimiter,
    client_address,
    configured_limit,
    is_exempt,
    limiter,
)

HISTORY = "/people/demo_astronaut_1/indicators/example_indicator/history"
TOO_MANY = "too many requests, try again in a minute"


class Clock:
    """A clock the test moves by hand, in place of `time.monotonic`."""

    def __init__(self, now: float = 1000.0) -> None:
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def test_under_the_limit_passes():
    limiter_ = RateLimiter(clock=Clock())
    for _ in range(3):
        assert limiter_.allow("203.0.113.9", 3) is None


def test_over_the_limit_says_when_to_retry():
    clock = Clock()
    limiter_ = RateLimiter(clock=clock)
    for _ in range(3):
        limiter_.allow("203.0.113.9", 3)

    assert limiter_.allow("203.0.113.9", 3) == 60
    clock.advance(30)
    assert limiter_.allow("203.0.113.9", 3) == 30


def test_addresses_are_counted_separately():
    limiter_ = RateLimiter(clock=Clock())
    assert limiter_.allow("203.0.113.9", 1) is None
    assert limiter_.allow("203.0.113.9", 1) == 60
    assert limiter_.allow("198.51.100.7", 1) is None


def test_the_window_resets():
    clock = Clock()
    limiter_ = RateLimiter(clock=clock)
    limiter_.allow("203.0.113.9", 2)
    limiter_.allow("203.0.113.9", 2)

    clock.advance(59)
    assert limiter_.allow("203.0.113.9", 2) == 1

    clock.advance(1)
    assert limiter_.allow("203.0.113.9", 2) is None
    assert limiter_.allow("203.0.113.9", 2) is None


def test_old_windows_are_pruned():
    clock = Clock()
    limiter_ = RateLimiter(clock=clock, max_clients=4)
    for index in range(10):
        limiter_.allow(f"address-{index}", 10)
    assert limiter_.tracked_clients == 4

    clock.advance(61)
    limiter_.allow("address-new", 10)
    assert limiter_.tracked_clients == 1


def test_exempt_paths():
    assert is_exempt("/health")
    assert is_exempt("/docs")
    assert is_exempt("/docs/oauth2-redirect")
    assert is_exempt("/openapi.json")
    assert not is_exempt("/entries")
    assert not is_exempt(HISTORY)


def test_client_address_uses_the_last_forwarded_value():
    scope = {
        "headers": [(b"x-forwarded-for", b"203.0.113.9, 10.0.0.1")],
        "client": ("127.0.0.1", 5000),
    }
    assert client_address(scope) == "10.0.0.1"


def test_client_address_falls_back_to_the_socket():
    assert client_address({"headers": [], "client": ("127.0.0.1", 5000)}) == "127.0.0.1"


def test_limit_from_the_environment(monkeypatch):
    monkeypatch.delenv("RATE_LIMIT_PER_MINUTE", raising=False)
    assert configured_limit() == DEFAULT_LIMIT == 120
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "")
    assert configured_limit() == 120
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "5")
    assert configured_limit() == 5
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "0")
    assert configured_limit() == 0
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "many")
    assert configured_limit() == 120
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "-5")
    assert configured_limit() == 120


@pytest.fixture
def clock(monkeypatch):
    """Turn the limit on at 2 per minute, with a clock the test moves by hand."""
    fake = Clock()
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "2")
    monkeypatch.setattr(limiter, "clock", fake)
    limiter.reset()
    return fake


def test_requests_under_the_limit_reach_the_route(client, clock):
    assert client.get(HISTORY).status_code == 200
    assert client.get(HISTORY).status_code == 200


def test_over_the_limit_answers_429_with_retry_after(client, clock):
    client.get(HISTORY)
    client.get(HISTORY)

    response = client.get(HISTORY)

    assert response.status_code == 429
    assert response.json() == {"detail": TOO_MANY}
    assert response.headers["retry-after"] == "60"


def test_exempt_paths_are_never_limited(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    for _ in range(3):
        assert client.get("/health").status_code == 200
        assert client.get("/docs").status_code == 200
        assert client.get("/openapi.json").status_code == 200
    assert client.get(HISTORY).status_code == 200
    assert client.get(HISTORY).status_code == 429


def test_separate_addresses_are_limited_separately(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    first = {"X-Forwarded-For": "203.0.113.9"}
    second = {"X-Forwarded-For": "198.51.100.7"}

    assert client.get(HISTORY, headers=first).status_code == 200
    assert client.get(HISTORY, headers=first).status_code == 429
    assert client.get(HISTORY, headers=second).status_code == 200


def test_the_last_forwarded_value_is_the_address(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "1")
    # A client that forges the first value is still counted by the address the
    # proxy appended last.
    forged = {"X-Forwarded-For": "203.0.113.9, 10.0.0.1"}
    forged_again = {"X-Forwarded-For": "198.51.100.7, 10.0.0.1"}

    assert client.get(HISTORY, headers=forged).status_code == 200
    assert client.get(HISTORY, headers=forged_again).status_code == 429
    assert client.get(HISTORY, headers={"X-Forwarded-For": "203.0.113.9"}).status_code == 200


def test_zero_turns_the_limit_off(client, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "0")
    for _ in range(10):
        assert client.get(HISTORY).status_code == 200


def test_the_window_resets_through_the_app(client, clock):
    client.get(HISTORY)
    client.get(HISTORY)
    assert client.get(HISTORY).status_code == 429

    clock.advance(60)

    assert client.get(HISTORY).status_code == 200
