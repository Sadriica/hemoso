"""The state of one value against a person's own baseline (FORMATS.md section 3).

The rule is "How each value is compared (team decision, Sat 14 Nov 15:37)":
median and spread of the person's last 14 entries for the indicator, in the
same context; `spread = max(1.4826 x median absolute deviation, min_spread)`;
fewer than 3 entries gives `no_data`, a value more than 3 spreads from the
median gives `outside_range`, and a matching row of `rules/attention.csv` gives
`needs_review`. The derivation and the nine test vectors are in
`docs/findings/phys-02-baseline-state-rule.md`.

The arithmetic is pure: no file, network or clock access. The route reads the
rows with `app.indicators` and the history with the store, so the same
functions can be checked against the team's shared vectors
(`scripts/fixtures/format_rules/baseline.json` and `attention.json`) in
`tests/test_state.py`.

Where the decision leaves room, this module resolves it as follows:

- The window is the last 14 entries, not the last 14 calendar days: entries
  carry a mission day and a time, not a date, so a day count cannot be
  measured. `phys-02` says "the last 14 readings" and FORMATS.md "the last 14
  days (rolling window)"; the entry count is the one the stored history can
  answer.
- The value under test is not part of the window: `phys-02` defines the window
  as "the readings before this one". The route receives the value and, when it
  also receives the mission day and time of that value, keeps only the stored
  entries strictly earlier (`window`'s `before`); without them it keeps every
  stored entry, as it did before T-68.
- `no_data` comes first, before `attention.csv` is looked at, as `phys-02`
  orders the checks: with fewer than 3 entries there is no baseline, so the
  response carries no attention row either.
- A value exactly on an attention threshold does not trigger that row; the
  shared vectors and the frontend compare strictly.
- Two matching rows with the same `notify` are not defined by FORMATS.md; the
  more extreme threshold wins, as `scripts/fixtures/format_rules/attention.json`
  records, and two rows on opposite sides keep the first in file order.
"""

from __future__ import annotations

import statistics
from collections.abc import Iterable, Sequence

from .models import Entry

# Entries in the window (phys-02: "the last 14 readings").
WINDOW = 14
# Fewer than this many entries gives no_data.
MIN_ENTRIES = 3
# Scales the median absolute deviation to compare with a standard deviation.
SPREAD_SCALE = 1.4826
# Spreads from the median that still count as usual.
BAND = 3.0
# Who acts on an attention row, least severe first (FORMATS.md section 3).
NOTIFY_ORDER = ("crew", "cmo", "flight_surgeon")
# The four states, least to most serious (FORMATS.md section 3).
STATE_ORDER = ("no_data", "in_range", "outside_range", "needs_review")


def window(
    entries: Iterable[Entry], context: str, before: tuple[int, str] | None = None
) -> list[Entry]:
    """The entries a value is compared with: the last 14 in the same context.

    `entries` arrives oldest first, as the store returns it. Entries in another
    context are dropped: heart rate after exercise is a different population
    from the same value at rest (FORMATS.md, `config/data/demo_data.csv`).

    `before` is the mission day and time of the value under test. With it, only
    the entries strictly earlier are kept, so a reading the app already stored
    is not compared with itself; without it nothing is dropped.
    """
    same = [
        entry
        for entry in entries
        if entry.context == context
        and (before is None or (entry.mission_day, entry.time) < before)
    ]
    return same[-WINDOW:]


def baseline(
    values: Sequence[float], min_spread: float
) -> tuple[float | None, float | None]:
    """Median and spread of the window; `(None, None)` with fewer than 3 values.

    `min_spread` is the indicator's noise floor from
    `config/data/indicators.csv`, so a flat history does not flag every small
    change.
    """
    if len(values) < MIN_ENTRIES:
        return None, None
    median = float(statistics.median(values))
    mad = statistics.median(abs(value - median) for value in values)
    return median, max(SPREAD_SCALE * mad, min_spread)


def state_for(
    value: float,
    median: float | None,
    spread: float | None,
    attention: dict | None,
) -> str:
    """One of `no_data`, `in_range`, `outside_range` or `needs_review`.

    `attention` is the row `attention_for` returned, or None when no row
    matches. Without a baseline the state stops at `no_data`; with one, a
    matching attention row wins over the band and the value is `needs_review`.
    """
    if median is None:
        return "no_data"
    if attention is not None:
        return "needs_review"
    if abs(value - median) <= BAND * spread:
        return "in_range"
    return "outside_range"


def worse_state(first: str, second: str) -> str:
    """The worse of two states, by `STATE_ORDER`.

    One blood pressure reading shows the worse of its systolic and diastolic
    state (`docs/findings/bio2-01-pressure-state-rule.md`), so a reading of
    120/95 is `needs_review` and not `in_range`. The finding orders its own
    attention levels (none < consult < urgent); the four states of FORMATS.md
    are ordered here, with `needs_review` last because an attention row is a
    cited clinical boundary.
    """
    return max(first, second, key=STATE_ORDER.index)


def attention_for(rows: Sequence[dict], value: float) -> dict | None:
    """The attention row a value triggers, or None when no row does.

    `rows` are the rows of one indicator in file order. A row matches when the
    value is on its side of its threshold (`below`: value < threshold, `above`:
    value > threshold). When several rows match, the most severe `notify` wins;
    on the same severity the more extreme threshold wins, and two rows on
    opposite sides keep the first row of the file.
    """
    winner: dict | None = None
    for row in rows:
        if not attention_matches(row, value):
            continue
        if winner is None or is_more_severe(row, winner):
            winner = row
    return winner


def attention_matches(row: dict, value: float) -> bool:
    """Whether the value is past the row's threshold on the row's side."""
    side = row["side"]
    threshold = float(row["threshold"])
    if side == "below":
        return value < threshold
    if side == "above":
        return value > threshold
    raise ValueError(f"side must be below or above, got {side!r}")


def notify_rank(notify: str) -> int:
    """Position of a `notify` value in `NOTIFY_ORDER`, least severe first."""
    if notify not in NOTIFY_ORDER:
        raise ValueError(f"notify must be crew, cmo or flight_surgeon, got {notify!r}")
    return NOTIFY_ORDER.index(notify)


def is_more_severe(candidate: dict, winner: dict) -> bool:
    """Whether a matching row beats the row held so far."""
    candidate_rank = notify_rank(candidate["notify"])
    winner_rank = notify_rank(winner["notify"])
    if candidate_rank != winner_rank:
        return candidate_rank > winner_rank
    # Equal severity and opposite sides: no shared scale, so the first row stays.
    if candidate["side"] != winner["side"]:
        return False
    if candidate["side"] == "below":
        return float(candidate["threshold"]) < float(winner["threshold"])
    return float(candidate["threshold"]) > float(winner["threshold"])
