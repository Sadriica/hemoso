"""The content rules of FORMATS.md as pure functions, shared by both implementations.

``scripts/check_content.py`` imports this module, so the Python side has one
definition of each rule. The TypeScript side implements the same rules in
``frontend/src/domain/attention.ts``, ``frontend/src/domain/source.ts`` and
``frontend/src/content/csv.ts``; the vectors in
``scripts/fixtures/format_rules/`` are what both sides are checked against
(``scripts/test_format_rules.py`` for Python).

No file, network or clock access here: each function takes its input and
returns a value, so a test can call it with one vector.
"""

from __future__ import annotations

import re

# One source token (STANDARDS.md section 6): a bare http(s) link, no spaces.
LINK_RE = re.compile(r"^https?://\S+$")

# Who acts on an attention row (REQ-05), from least to most severe. When several
# rows of one indicator match a value, the row with the most severe notify wins
# (FORMATS.md section 3, rules/attention.csv).
NOTIFY_ORDER = ["crew", "cmo", "flight_surgeon"]


def parse_sources(cell: str) -> list[str] | None:
    """One source cell as a list: the links, ``["Assumption"]``, or ``None``.

    FORMATS.md section 3: a source cell holds "a link or the word Assumption",
    and several links are separated by a space. The word counts only when it is
    the whole cell. Any other token makes the cell invalid, and so does an empty
    cell; ``None`` reports that, and the shared vectors write it as "invalid".
    """
    tokens = cell.split()
    if tokens == ["Assumption"]:
        return ["Assumption"]
    if not tokens or not all(LINK_RE.match(token) for token in tokens):
        return None
    return tokens


def attention_for(rows: list[dict], value: float) -> dict | None:
    """The attention row a value triggers, or ``None`` when no row does.

    ``rows`` are the attention rows of one indicator, in file order, already
    filtered by ``indicator_id`` as the frontend receives them. The result is
    the winning row's ``attention_level`` and ``notify``::

        {"attention_level": "example_level", "notify": "cmo"}

    A row matches when the value is on its side of its threshold (``below``:
    value < threshold, ``above``: value > threshold). Of the matching rows the
    most severe ``notify`` wins; on the same severity the more extreme threshold
    wins (lower on ``below``, higher on ``above``), and two rows on opposite
    sides keep the first one in file order. FORMATS.md states the notify rule
    and the escalation it needs, but not the tie on equal ``notify``; the
    frontend does it this way and ``attention.json`` says so.
    """
    winner: dict | None = None
    for row in rows:
        if not attention_matches(row, value):
            continue
        if winner is None or is_more_severe(row, winner):
            winner = row
    if winner is None:
        return None
    return {"attention_level": winner["attention_level"], "notify": winner["notify"]}


def attention_matches(row: dict, value: float) -> bool:
    """Whether the value is on the row's side of its threshold (strict)."""
    side = row["side"]
    threshold = float(row["threshold"])
    if side == "below":
        return value < threshold
    if side == "above":
        return value > threshold
    raise ValueError(f"side must be below or above, got {side!r}")


def is_more_severe(candidate: dict, winner: dict) -> bool:
    """Whether a matching row beats the row held so far."""
    candidate_rank = notify_rank(candidate["notify"])
    winner_rank = notify_rank(winner["notify"])
    if candidate_rank != winner_rank:
        return candidate_rank > winner_rank
    # Equal severity: no shared scale across the two sides, so the first row of
    # the file stays.
    if candidate["side"] != winner["side"]:
        return False
    if candidate["side"] == "below":
        return float(candidate["threshold"]) < float(winner["threshold"])
    return float(candidate["threshold"]) > float(winner["threshold"])


def notify_rank(notify: str) -> int:
    """Position of a ``notify`` value in ``NOTIFY_ORDER``, least severe first."""
    if notify not in NOTIFY_ORDER:
        raise ValueError(f"notify must be crew, cmo or flight_surgeon, got {notify!r}")
    return NOTIFY_ORDER.index(notify)


def baseline_state(median, spread, value, boundary=None) -> str:
    """The state of one value against that person's own baseline (phys-02).

    ``median`` is ``None`` when there is no baseline yet (fewer than 3 entries),
    which is ``no_data``. A value past the optional clinical ``boundary`` is
    ``needs_review`` whatever the band says. Otherwise the state is
    ``in_range`` when the value is at most 3 spreads from the median and
    ``outside_range`` when it is further.
    """
    if median is None:
        return "no_data"
    if boundary is not None and crosses_boundary(value, median, boundary):
        return "needs_review"
    if abs(value - median) <= 3 * spread:
        return "in_range"
    return "outside_range"


def crosses_boundary(value, median, boundary) -> bool:
    """Whether the value is past the boundary on the side it lies from the median.

    A boundary above the median triggers on a higher value, one below it on a
    lower value, and a value exactly on the boundary does not trigger. The
    finding gives one number and no side; FORMATS.md puts the real trigger in
    ``rules/attention.csv`` rows, which carry a side.
    """
    return (value - median) * (value - boundary) > 0
