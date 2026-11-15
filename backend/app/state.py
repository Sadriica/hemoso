"""The state of one value against a person's own baseline (FORMATS.md section 3).

The rule today is "How each value is compared", point 1 (team decision Sat 14
Nov 18:45): the median and spread of the person's entries for the indicator in
the same context, over the last 14 readings (moving window). The spread is
`max(1.4826 x median absolute deviation, min_spread)`; fewer than 3 entries is
"no data yet", and a value more than 3 spreads from the median is "outside
your usual range". `docs/findings/phys-02-baseline-state-rule.md` counts the
same way: the last 14 readings before this one, three readings enough, at most
one per day.

This module proposes a change to that rule: daily averages over the last 14
mission days. A day counts once, as the arithmetic mean of its readings in the
context, and the median and spread are taken over those daily values; fewer
than 3 days gives `no_data`, a value more than 3 spreads from the median gives
`outside_range`, and a matching row of `rules/attention.csv` whose source is a
link gives `needs_review`. The change is pending Phys and Eng 1; until they
accept it, FORMATS.md and phys-02 still say 14 readings. The derivation and
the test vectors are in `docs/findings/phys-02-baseline-state-rule.md`.

The arithmetic is pure: no file, network or clock access. The route reads the
rows with `app.indicators` and the history with the store, so the same
functions can be checked against the team's shared vectors
(`scripts/fixtures/format_rules/baseline.json` and `attention.json`) in
`tests/test_state.py`.

Where the decision leaves room, this module resolves it as follows:

- The window is the last 14 mission days that hold a reading, as proposed
  above, so a day with six readings counts once and a busy day cannot push out
  a quiet week.
- A day's value is the arithmetic mean of that day's readings in the context,
  and the median and the spread are taken over those daily values. The mean
  keeps every reading of the day in the baseline; the median over the days
  keeps one unusual day from moving it far.
- Mission days count as they are written, so a gap between days does not
  shrink the window: four readings on days 1, 2, 5 and 9 are four days.
- The value under test is not part of the window: `phys-02` defines the window
  as "the readings before this one". The route receives the value and, when it
  also receives the mission day and time of that value, keeps only the stored
  entries strictly earlier (`window`'s `before`); without them it keeps every
  stored entry, as it did before T-68.
- The attention row comes first, before the baseline, as `phys-02` orders the
  checks (safety decision, Sat 14 Nov): a value past a cited limit is
  `needs_review` even with no baseline, so a core temperature of 39.5 °C on the
  first day is not "no data yet". Only rows whose `source` is a link count
  (`cited_rows`); a row marked `Assumption` never raises `needs_review`, with or
  without a baseline, because an invented limit must not raise an alarm on its
  own. The finding says "the only place a `needs_review` can come from, and only
  when the row carries a link".
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

# Mission days in the proposed window. FORMATS.md section 3, point 1, counts
# the last 14 readings today; Phys and Eng 1 decide whether that changes.
WINDOW = 14
# Fewer than this many days gives no_data.
MIN_DAYS = 3
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
    """The entries a value is compared with: the last 14 mission days.

    `entries` arrives oldest first, as the store returns it. Entries in another
    context are dropped: heart rate after exercise is a different population
    from the same value at rest (FORMATS.md, `config/data/demo_data.csv`).

    `before` is the mission day and time of the value under test. With it, only
    the entries strictly earlier are kept, so a reading the app already stored
    is not compared with itself; without it nothing is dropped.

    The days kept are the last `WINDOW` mission days that still hold an entry,
    whatever the gaps between them: a day with several readings takes the place
    of one day, not of several.
    """
    same = [
        entry
        for entry in entries
        if entry.context == context
        and (before is None or (entry.mission_day, entry.time) < before)
    ]
    days = set(sorted({entry.mission_day for entry in same})[-WINDOW:])
    return [entry for entry in same if entry.mission_day in days]


def daily_values(entries: Iterable[Entry]) -> list[float]:
    """One value per mission day: the arithmetic mean of that day's readings.

    The days come oldest first, and a day with a single reading gives that
    reading. `baseline` takes the median and the spread over these values, so
    every day weighs the same whatever its number of readings.
    """
    by_day: dict[int, list[float]] = {}
    for entry in entries:
        by_day.setdefault(entry.mission_day, []).append(entry.value)
    return [statistics.fmean(by_day[day]) for day in sorted(by_day)]


def baseline(
    values: Sequence[float], min_spread: float
) -> tuple[float | None, float | None]:
    """Median and spread of the daily values; `(None, None)` with fewer than 3 days.

    `min_spread` is the indicator's noise floor from
    `config/data/indicators.csv`, so a flat history does not flag every small
    change.
    """
    if len(values) < MIN_DAYS:
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

    `attention` is the row `attention_for` returned from `cited_rows`, or None
    when no row matches. The checks follow phys-02's order: a cited attention
    row gives `needs_review` with or without a baseline; then, without a
    baseline, `no_data`; then the band. A row without a link is ignored here
    too, so a caller that forgets `cited_rows` still cannot raise the alarm.
    """
    if attention is not None and is_cited(attention):
        return "needs_review"
    if median is None:
        return "no_data"
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


def is_cited(row: dict) -> bool:
    """Whether a row's `source` is one or more links, with no `Assumption`.

    STANDARDS.md section 6: in tables a source is a link alone, several
    separated by a space, or the word `Assumption`.
    """
    links = str(row.get("source", "")).split()
    return bool(links) and all(
        link.startswith(("https://", "http://")) for link in links
    )


def cited_rows(rows: Iterable[dict]) -> list[dict]:
    """The rows that may raise `needs_review`: those whose source is a link."""
    return [row for row in rows if is_cited(row)]


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
