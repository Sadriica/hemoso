"""The evidence score of one condition, from the person's own records.

`rules/conditions.csv` says what the astronaut may have and which signals each
row rests on, written `indicator_id:above` or `indicator_id:below` (FORMATS.md
section 3, "How each value is compared", point 3). An optional fifth column,
`symptoms`, names the symptom ids that also support the row, read against
`data/symptoms.csv` and `data/symptom_log.csv`.

The score is a weighted mean. Every usable signal has a weight and an evidence:

- An indicator signal weighs 1. Its evidence is 1 when the newest reading
  crossed a row of `rules/attention.csv` on the signal's side, 0.5 when it is
  outside the person's baseline on that side, and 0 otherwise.
- A symptom signal weighs 0.5 when `data/symptoms.csv` marks the symptom
  `shared` `no` and 0.25 when it marks it `yes`. Its evidence is 1 when the
  person reported it on the day of the score. A symptom the condition lists and
  the person did not report is not usable: it stays out of both sums, and it is
  not a zero.

`score = sum(weight * evidence) / sum(weight)` over the usable signals.

Fewer than two usable signals is `no_data`, except when the one usable signal
is an indicator that crossed a cited clinical boundary: a crossed limit counts
on its own, so a low glucose before any symptom is reported is evidence, not
silence. A score that comes only from symptoms is capped at `SYMPTOM_ONLY_CAP`
(0.5), so a condition with no measured signal stops at `possible`.

A symptom `data/symptoms.csv` marks `red_flag` `yes`, listed by this condition
and reported that day, makes the `label` `urgent` whatever the score. The flag
sits outside the weighted mean and outranks the label; `red_flag` stays `true`
and the computed `score` (or null) stays in the answer, so a screen can still
show what each signal rests on. The score never becomes a diagnosis: no text is
written here, and the CMO or the flight surgeon confirms.

The rule and its test vectors are `team/bio2/notes/symptom-test-vectors.md`
(T-78); the arithmetic before symptoms is
`docs/findings/bio2-02-evidence-score.md`.

The arithmetic is pure: no file, network or clock access. The route reads the
rows with `app.indicators` and the history and reports with the store, so the
same functions can be checked against the vectors in `tests/test_conditions.py`
and `tests/test_symptom_vectors.py`.

Where the decision leaves room, this module resolves it as follows:

- The value under test is the newest stored reading of the signal, in its own
  context, and the baseline is `app.state`'s rule applied to it: the last 14
  mission days before it in that same context, one value per day, then median
  and spread with the indicator's noise floor. A reading after exercise is
  compared with readings after exercise, and the newest reading decides which
  context that is.
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
  (0.167, 0.667); the label is read from the unrounded mean. Bio 2's shared
  vectors write one third as 0.33; the route answers 0.333, the same value.
- A symptom counts once, on the newest mission day that holds any report of
  that person (`newest_day_reports`): an older day is history, not evidence for
  today, and every condition reads the same day. `severity` is stored but adds
  nothing to the score.
- A symptom id in the `symptoms` column that `data/symptoms.csv` does not define
  is ignored: the weight and the red flag come from that row, and only the
  checker can call the row an error. An id written twice in one row is one
  symptom. Without `data/symptoms.csv` no symptom is defined, so no symptom
  signal is scored.
- The finding's last vector reads one usable signal as `no_data`. Rule 3 of
  the agreed vector file supersedes that row when the signal crossed a cited
  boundary: the limit counts on its own, and `tests/test_conditions.py` records
  the difference.
- The cap reads the usable signals only: a condition with any usable indicator
  signal is never capped, even when that indicator's evidence is 0. The cap is
  about a missing measurement, not about its result.
"""

from __future__ import annotations

from collections.abc import Collection, Iterable, Mapping, Sequence
from dataclasses import dataclass

from .models import ConditionScore, ConditionSignal, Entry, SymptomReport
from .state import (
    attention_for,
    baseline,
    cited_rows,
    daily_values,
    state_for,
    window,
)

# Which evidence a signal can carry.
# A signal whose newest value crossed an attention row on its side.
ATTENTION_POINT = 1.0
# A signal outside the person's baseline on its side.
BASELINE_POINT = 0.5
# A symptom the person reported on the day of the score.
SYMPTOM_POINT = 1.0
# Weight of one indicator signal in the weighted mean.
INDICATOR_WEIGHT = 1.0
# Weight of a reported symptom only this condition lists ("specific").
SYMPTOM_SPECIFIC_WEIGHT = 0.5
# Weight of a reported symptom `data/symptoms.csv` marks `shared` `yes`.
SYMPTOM_SHARED_WEIGHT = 0.25
# A score that comes only from symptoms stops here, so its label is at most
# `possible`: no measurement supports it (T-78).
SYMPTOM_ONLY_CAP = 0.5
# The cell value of `red_flag` and `shared` in data/symptoms.csv that applies.
YES = "yes"
# Fewer usable signals than this gives no_data, unless one crossed a boundary.
MIN_USABLE_SIGNALS = 2
# The label of a condition with a reported red-flag symptom: outside the score.
LABEL_URGENT = "urgent"
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


@dataclass(frozen=True)
class SignalScore:
    """One signal's place in the weighted mean.

    `weight` is `INDICATOR_WEIGHT` for an indicator signal and the symptom's
    weight for a symptom one; `evidence` is what the signal adds, or None while
    it is not usable (no reading, no side, no baseline, or no report that day).
    A usable indicator whose evidence is `ATTENTION_POINT` crossed a cited
    clinical boundary, so it scores alone when nothing else is usable.
    """

    weight: float
    evidence: float | None
    kind: str = "indicator"

    @property
    def usable(self) -> bool:
        return self.evidence is not None

    @property
    def contribution(self) -> float | None:
        """The signal's term in the numerator: its weight times its evidence."""
        return None if self.evidence is None else self.weight * self.evidence

    @property
    def boundary(self) -> bool:
        """Whether this signal crossed a cited limit and may score on its own."""
        return self.kind == "indicator" and self.evidence == ATTENTION_POINT


def latest_value(
    entries: Iterable[Entry],
    min_spread: float | None,
    attention_rows: Sequence[dict] = (),
) -> LatestValue | None:
    """The newest reading, its context and its own baseline; None without entries.

    `entries` arrives oldest first, as the store returns it. The window is the
    last 14 mission days before the newest one, in the newest one's context,
    with one value per day, so the reading under test is not part of its own
    baseline. `min_spread` is the indicator's noise floor from
    `config/data/indicators.csv`; None means the indicator has no row there, so
    the reading has no baseline.
    """
    readings = list(entries)
    if not readings:
        return None
    newest = readings[-1]
    if min_spread is None:
        return LatestValue(newest.value, newest.context, None, None, ())
    recent = window(readings[:-1], newest.context)
    median, spread = baseline(daily_values(recent), min_spread)
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
    """The evidence one indicator signal adds, or None while it is not usable.

    A signal is usable with a reading, a side, and either a baseline or a cited
    limit crossed on that side. The evidence is 1 when the value crossed a cited
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


def score_for(
    signals: Sequence[SignalScore], single_boundary: bool = False
) -> float | None:
    """The weighted mean of the usable signals, or None while there is no score.

    None when no signal is usable, and when fewer than two are: `no_data`. With
    `single_boundary`, one usable signal that crossed a cited clinical boundary
    scores on its own (T-78 rule 3). The caller passes it only for a row that
    lists symptoms, so a row without the `symptoms` column keeps the score it
    had before T-79 (vector "four-cell row after the change: same score as
    before"). A score that comes only from symptoms is capped at
    `SYMPTOM_ONLY_CAP`.
    """
    usable = [signal for signal in signals if signal.usable]
    if not usable:
        return None
    if len(usable) < MIN_USABLE_SIGNALS and not (
        single_boundary and usable[0].boundary
    ):
        return None
    total = sum(signal.weight for signal in usable)
    score = sum(signal.contribution for signal in usable) / total
    if all(signal.kind == "symptom" for signal in usable):
        return min(score, SYMPTOM_ONLY_CAP)
    return score


def symptom_ids(row: Mapping[str, str]) -> list[str]:
    """The `symptoms` column of one conditions.csv row, in file order.

    A four-cell row is read with an empty `symptoms` cell, so it lists none and
    the score is the one the indicator signals alone give (T-79). An id written
    twice in one row is one symptom: it cannot count twice.
    """
    return list(dict.fromkeys(row.get("symptoms", "").split()))


def newest_day_reports(reports: Iterable[SymptomReport]) -> list[SymptomReport]:
    """The person's reports of the newest mission day that holds any report.

    A report answers "how does the person feel" for its own day only: an older
    day is history, not evidence for today. The day is chosen over every
    report of the person, not per condition or per symptom, so all conditions
    read the same day, and `mission_day` is the only thing ordered here: a
    clock time is not a date. The person's own reports arrive oldest first from
    the store; the returned list keeps that order.
    """
    rows = list(reports)
    if not rows:
        return []
    newest = max(report.mission_day for report in rows)
    return [report for report in rows if report.mission_day == newest]


def is_yes(row: Mapping[str, str], column: str) -> bool:
    """Whether a symptoms.csv row has `yes` in `column`."""
    return str(row.get(column, "")).strip().lower() == YES


def is_shared(row: Mapping[str, str]) -> bool:
    """Whether a symptoms.csv row marks the symptom as shared by conditions."""
    return is_yes(row, "shared")


def is_red_flag(row: Mapping[str, str]) -> bool:
    """Whether a symptoms.csv row marks the symptom as a red flag."""
    return is_yes(row, "red_flag")


def shared_ids(symptom_rows: Mapping[str, Mapping[str, str]]) -> set[str]:
    """The symptom ids `data/symptoms.csv` marks `shared` `yes`.

    The file decides, not the number of conditions that list the symptom: the
    same list of symptoms must weigh the same tomorrow, when another condition
    names one of them.
    """
    return {
        symptom_id
        for symptom_id, row in symptom_rows.items()
        if is_shared(row)
    }


def symptom_weight(symptom_id: str, shared: Collection[str]) -> float:
    """The weight one symptom adds: less when the symptom is shared."""
    return SYMPTOM_SHARED_WEIGHT if symptom_id in shared else SYMPTOM_SPECIFIC_WEIGHT


def reported_ids(reports: Iterable[SymptomReport]) -> set[str]:
    """The symptom ids the person reported among `reports`."""
    return {report.symptom_id for report in reports}


def symptom_scores(
    row: Mapping[str, str],
    reports: Sequence[SymptomReport],
    shared: Collection[str],
    symptom_rows: Mapping[str, Mapping[str, str]],
) -> list[tuple[ConditionSignal, SignalScore]]:
    """One (signal, score) pair per symptom this condition lists and the file defines.

    A symptom the person reported on the newest day is usable and adds its
    weight; one they did not report is listed with no contribution, so the
    screen shows what the score rests on. `severity` does not change the
    evidence. An id `data/symptoms.csv` does not define is left out: its weight
    and its red flag would be invented.
    """
    reported = reported_ids(reports)
    pairs: list[tuple[ConditionSignal, SignalScore]] = []
    for symptom_id in symptom_ids(row):
        if symptom_id not in symptom_rows:
            continue
        score = SignalScore(
            symptom_weight(symptom_id, shared),
            SYMPTOM_POINT if symptom_id in reported else None,
            "symptom",
        )
        pairs.append(
            (
                ConditionSignal(
                    kind="symptom",
                    symptom_id=symptom_id,
                    weight=score.weight,
                    contribution=score.contribution,
                ),
                score,
            )
        )
    return pairs


def has_red_flag(
    row: Mapping[str, str],
    reports: Sequence[SymptomReport],
    symptom_rows: Mapping[str, Mapping[str, str]],
) -> bool:
    """Whether a red-flag symptom this condition lists was reported that day."""
    reported = reported_ids(reports)
    return any(
        symptom_id in reported and is_red_flag(symptom_rows.get(symptom_id, {}))
        for symptom_id in symptom_ids(row)
    )


def label_for(score: float | None) -> str:
    """`no_data` without a score, else `low`, `possible` or `review`.

    `urgent` is not a band: it comes from a reported red flag and is set by
    `condition_result`, whatever the score.
    """
    if score is None:
        return "no_data"
    for name, upper in LABEL_STEPS:
        if score < upper:
            return name
    return LABEL_STEPS[-1][0]


def condition_result(
    row: dict[str, str],
    latest: dict[str, LatestValue | None],
    reports: Iterable[SymptomReport] = (),
    symptom_rows: Mapping[str, Mapping[str, str]] | None = None,
    shared: Collection[str] = (),
) -> ConditionScore:
    """One row of `rules/conditions.csv` as the route returns it.

    `reports` are the person's symptom reports, oldest first; only the newest
    mission day counts (`newest_day_reports`). `symptom_rows` is
    `data/symptoms.csv` and `shared` the ids `shared_ids` returned; both may be
    empty, which leaves the symptoms unscored and no flag set.
    """
    today = newest_day_reports(reports)
    rows = symptom_rows or {}
    signals: list[ConditionSignal] = []
    scores: list[SignalScore] = []
    for indicator_id, side in parse_signals(row["based_on"]):
        newest = latest.get(indicator_id)
        point = signal_point(newest, side)
        signals.append(
            ConditionSignal(
                indicator_id=indicator_id,
                side=side,
                contribution=point,
                value=None if newest is None else newest.value,
            )
        )
        scores.append(SignalScore(INDICATOR_WEIGHT, point, "indicator"))
    for signal, score in symptom_scores(row, today, shared, rows):
        signals.append(signal)
        scores.append(score)
    score = score_for(scores, single_boundary=bool(symptom_ids(row)))
    # `red_flag` is passed only when it is true: the route leaves unset fields
    # out, so a condition with no red flag keeps the fields it had before T-79.
    flagged = has_red_flag(row, today, rows)
    return ConditionScore(
        condition_id=row["condition_id"],
        name=row["name"],
        score=None if score is None else round(score, SCORE_DECIMALS),
        label=LABEL_URGENT if flagged else label_for(score),
        signals=signals,
        source=row["source"],
        **({"red_flag": True} if flagged else {}),
    )
