"""The evidence score of one condition, from the person's own readings.

`rules/conditions.csv` says what the astronaut may have and which signals each
row rests on, written `indicator_id:above` or `indicator_id:below` (FORMATS.md
section 3, "How each value is compared", point 3). The score is the mean of one
point scale over those signals: 1 when the newest reading of the signal crossed
a row of `rules/attention.csv` on the signal's side, 0.5 when it is outside the
person's baseline on that side, 0 otherwise. Fewer than two usable signals is
`no_data`, never a low score. The rule and its test vectors are in
`docs/findings/bio2-02-evidence-score.md`.

The arithmetic is pure: no file, network or clock access. The route reads the
rows with `app.indicators` and the history with the store, so the same functions
can be checked against the finding's vectors in `tests/test_conditions.py`.

Where the decision leaves room, this module resolves it as follows:

- The value under test is the newest stored reading of the signal, in its own
  context, and the baseline is `app.state`'s rule applied to it: the last 14
  readings before it in that same context, median and spread with the
  indicator's noise floor. A reading after exercise is compared with readings
  after exercise, and the newest reading decides which context that is.
- A cited limit does not need a baseline (bio2-02, phys-02 safety order): a
  newest reading past a row of `rules/attention.csv` whose source is a link adds
  1 even on the first day. A signal with no baseline and no cited limit crossed
  is not usable and stays out of the denominator. Rows marked `Assumption` are
  dropped (`app.state.cited_rows`), so they never add the attention point; a
  value past one can still add the baseline point.
- "On the signal's side" applies to the baseline too, not only to the attention
  rows: a high value adds nothing to a `below` condition, whatever its distance
  from the baseline. The finding says this in words ("a value on the wrong side
  of the condition adds 0"), and it is what separates `hyperglycaemia` from
  `hypoglycaemia` when both rest on `glucose_mgdl`. The finding's fourth vector
  was written before `based_on` carried the sides and gives a diastolic of 120
  the baseline point for a `below` signal; this module does not, and
  `tests/test_conditions.py` records the difference.
- The label bands are written in the finding with both ends, `0 to 0.3`,
  `0.3 to 0.6` and `0.6 to 1`. They are read as a ladder closed at the lower
  end, so exactly 0.3 is `possible` and exactly 0.6 is `review`: the higher
  band starts at its bound, which asks for a review sooner; no vector of the
  finding touches either end.
- The score is reported with three decimals, as the finding's vectors write it
  (0.167, 0.667); the label is read from the unrounded mean.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from .models import ConditionScore, ConditionSignal, Entry
from .state import attention_for, baseline, cited_rows, state_for, window

# One signal whose newest value crossed an attention row on its side.
ATTENTION_POINT = 1.0
# One signal outside the person's baseline on its side.
BASELINE_POINT = 0.5
# Fewer usable signals than this gives no_data (bio2-02).
MIN_USABLE_SIGNALS = 2
# The label bands, narrowest first: a score takes the first label it is below.
# Each band is closed at its lower end, so 0.3 is `possible` and 0.6 `review`.
LABEL_STEPS: tuple[tuple[str, float], ...] = (
    ("low", 0.3),
    ("possible", 0.6),
    ("review", 1.0),
)
# Decimals of the reported score.
SCORE_DECIMALS = 3
# The two sides a signal of conditions.csv can carry.
SIDES = ("above", "below")


@dataclass(frozen=True)
class LatestValue:
    """The newest reading of one indicator and the baseline it is compared with.

    `median` and `spread` are empty while the reading has no baseline;
    `attention` holds the indicator's cited rows of `rules/attention.csv`, with
    or without a baseline, as the state route checks them first.
    """

    value: float
    context: str
    median: float | None
    spread: float | None
    attention: tuple[dict, ...]


def latest_value(
    entries: Iterable[Entry],
    min_spread: float | None,
    attention_rows: Sequence[dict] = (),
) -> LatestValue | None:
    """The newest reading, its context and its own baseline; None without entries.

    `entries` arrives oldest first, as the store returns it. The window is the
    last 14 readings before the newest one, in the newest one's context, so the
    reading under test is not part of its own baseline. `min_spread` is the
    indicator's noise floor from `config/data/indicators.csv`; None means the
    indicator has no row there, so the reading has no baseline.
    """
    readings = list(entries)
    if not readings:
        return None
    newest = readings[-1]
    if min_spread is None:
        return LatestValue(newest.value, newest.context, None, None, ())
    recent = window(readings[:-1], newest.context)
    median, spread = baseline([entry.value for entry in recent], min_spread)
    rows = tuple(cited_rows(attention_rows))
    return LatestValue(newest.value, newest.context, median, spread, rows)


def parse_signals(based_on: str) -> list[tuple[str, str | None]]:
    """The `based_on` column as `(indicator_id, side)` pairs, in file order.

    A token without a side, or with a side other than `above` or `below`, keeps
    its indicator id and carries None: `scripts/check_content.py` reports it,
    and the route shows the signal with no contribution instead of failing.
    """
    pairs: list[tuple[str, str | None]] = []
    for token in based_on.split():
        indicator_id, _, side = token.partition(":")
        pairs.append((indicator_id, side if side in SIDES else None))
    return pairs


def signal_point(latest: LatestValue | None, side: str | None) -> float | None:
    """The point one signal adds, or None while the signal is not usable.

    A signal is usable with a reading, a side, and either a baseline or a cited
    limit crossed on that side. The point is 1 when the value crossed a cited
    row of `rules/attention.csv` on the signal's side, 0.5 when it is outside
    the baseline on that side, and 0 otherwise.
    """
    if latest is None or side is None:
        return None
    rows = [row for row in latest.attention if row["side"] == side]
    state = state_for(
        latest.value, latest.median, latest.spread, attention_for(rows, latest.value)
    )
    if state == "needs_review":
        return ATTENTION_POINT
    if state == "no_data":
        return None
    if state != "outside_range":
        return 0.0
    if side == "above" and latest.value < latest.median:
        return 0.0
    if side == "below" and latest.value > latest.median:
        return 0.0
    return BASELINE_POINT


def score_for(points: Sequence[float | None]) -> float | None:
    """The mean of the usable points; None with fewer than two of them."""
    usable = [point for point in points if point is not None]
    if len(usable) < MIN_USABLE_SIGNALS:
        return None
    return sum(usable) / len(usable)


def label_for(score: float | None) -> str:
    """`no_data` without a score, else `low`, `possible` or `review`."""
    if score is None:
        return "no_data"
    for name, upper in LABEL_STEPS:
        if score < upper:
            return name
    return LABEL_STEPS[-1][0]


def condition_result(
    row: dict[str, str], latest: dict[str, LatestValue | None]
) -> ConditionScore:
    """One row of `rules/conditions.csv` as the route returns it."""
    signals: list[ConditionSignal] = []
    for indicator_id, side in parse_signals(row["based_on"]):
        newest = latest.get(indicator_id)
        signals.append(
            ConditionSignal(
                indicator_id=indicator_id,
                side=side,
                contribution=signal_point(newest, side),
                value=None if newest is None else newest.value,
            )
        )
    score = score_for([signal.contribution for signal in signals])
    return ConditionScore(
        condition_id=row["condition_id"],
        name=row["name"],
        score=None if score is None else round(score, SCORE_DECIMALS),
        label=label_for(score),
        signals=signals,
        source=row["source"],
    )
