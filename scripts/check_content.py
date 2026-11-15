"""Checks the config files against FORMATS.md. Run from the repository root:

  python scripts/check_content.py           # a missing file is a warning
  python scripts/check_content.py --strict  # required files must exist and hold data

It validates every file that exists under config/ against the formats and rules
in FORMATS.md: exact header and column order, empty required cells, duplicate
ids, unknown ids across files, a source that is an http(s) link or the word
Assumption, numbers where numbers are expected, the allowed values for
direction and side, 24-hour times, positive integer mission days, min below
max, notify values and their order against thresholds, demo values inside their demo ranges, hazards from the five names, and the
headings, attention levels and sources of the content files.

Prints one line per problem (ERROR or WARN), then a one-line summary.
Exits 1 when there is at least one ERROR, 0 otherwise.
"""

from __future__ import annotations

import argparse
import csv
import math
import re
import sys
from collections import Counter
from pathlib import Path

# The source and attention rules live in one place, so the checker and the
# frontend cannot drift apart (see scripts/fixtures/format_rules/).
from format_rules import LINK_RE, NOTIFY_ORDER, parse_sources

HAZARDS = {
    "radiation",
    "isolation_and_confinement",
    "distance_from_earth",
    "gravity_fields",
    "hostile_closed_environments",
}
ID_RE = re.compile(r"^[a-z][a-z0-9_]*$")
TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

# The fixed ``##`` headings of a content file, in order (FORMATS.md section 3).
EXPECTED_H2 = [
    "Why it matters",
    "How spaceflight affects it",
    "Measurement steps",
    "Status and next steps",
    "How to prevent problems",
    "Sources",
]

# Files every merge needs (FORMATS.md section 1). content/body_regions.csv has
# no owner yet, so it is never required. content/<indicator_id>.md is required
# per indicator id, checked against data/indicators.csv.
REQUIRED_FILES = [
    "config/data/indicators.csv",
    "config/data/demo_data.csv",
    "config/data/demo_ranges.csv",
    "config/rules/attention.csv",
    "config/rules/conditions.csv",
]

# The exact CSV header (column order) of each table. scripts/new_config.py
# imports these to write empty files, so the two can never drift.
INDICATORS_HEADER = ["id", "name", "unit", "direction", "measured_on_board", "hazards",
                     "min_spread", "tier", "system", "source"]

# Tiers (FORMATS.md): A measured by an instrument that flies, B self-reported,
# C explained only (no in-flight measurement; never an input).
TIERS = {"A", "B", "C"}
# Body systems the 3D body opens (FORMATS.md section 2).
SYSTEMS = {
    "cardiovascular",
    "respiratory",
    "thermoregulation",
    "sleep",
    "neuro_behavioural",
    "metabolic",
    "musculoskeletal",
    "radiation",
}
DEMO_RANGES_HEADER = ["indicator_id", "min", "max", "source", "generation_note"]
DEMO_DATA_HEADER = ["person_id", "indicator_id", "value", "unit", "mission_day", "time", "context"]
ATTENTION_HEADER = ["indicator_id", "side", "threshold", "attention_level", "notify", "source"]

CONDITIONS_HEADER = ["condition_id", "name", "based_on", "source"]


class Reporter:
    """Collects problem lines in the order they are found."""

    def __init__(self) -> None:
        self.lines: list[str] = []

    def error(self, msg: str) -> None:
        self.lines.append(f"ERROR {msg}")

    def warn(self, msg: str) -> None:
        self.lines.append(f"WARN {msg}")


def is_number(value: str) -> bool:
    if "_" in value:
        return False
    try:
        return math.isfinite(float(value))
    except ValueError:
        return False


def decimal_comma_hint(value: str) -> str:
    """Hint when a non-number looks like it uses a decimal comma (60,5)."""
    return " (use a decimal point, STANDARDS.md section 3)" if re.search(r"\d,\d", value) else ""


def valid_source(value: str) -> bool:
    """A source cell is the word ``Assumption`` or one or more http(s) links."""
    return parse_sources(value) is not None


def read_table(root: Path, rel: str, header: list[str], rep: Reporter):
    """Read a CSV table; check the header. Returns rows or None when absent.

    Each returned row is ``(line_number, list_of_cells)``. A wrong header is
    reported and returns [] (no rows are checked under the wrong columns).
    """
    path = root / rel
    if not path.exists():
        return None
    try:
        with path.open(encoding="utf-8-sig", newline="") as fh:
            reader = csv.reader(fh)
            first = next(reader, None)
            if first is None:
                rep.error(f"{rel}:1 empty file, missing header")
                return []
            if len(first) == 1 and ";" in first[0]:
                rep.error(f"{rel}:1 the file uses semicolons; save it as CSV with commas")
                return []
            if first != header:
                rep.error(f"{rel}:1 wrong header or column order, expected {header!r} got {first!r}")
                return []
            rows = []
            for row in reader:
                if not row or (len(row) == 1 and row[0].strip() == ""):
                    continue  # blank line
                rows.append((reader.line_num, row))
            return rows
    except (OSError, UnicodeDecodeError, csv.Error) as exc:
        rep.error(f"{rel}: cannot read file ({exc})")
        return []


def validate_rows(rep: Reporter, rel: str, rows, header: list[str],
                  required: set[str], check_row) -> None:
    """Check column count and empty required cells, then run check_row.

    ``check_row(cells, line_no)`` receives a dict of column name to value and
    only needs to validate non-empty fields; empty required fields are already
    reported here.
    """
    width = len(header)
    index = {name: i for i, name in enumerate(header)}
    for line_no, row in rows:
        if len(row) != width:
            rep.error(f"{rel}:{line_no} wrong number of columns, expected {width} got {len(row)}")
            continue
        cells = {name: row[index[name]] for name in header}
        empty = [name for name in required if not cells[name].strip()]
        if empty:
            rep.error(f"{rel}:{line_no} empty required cell(s): {', '.join(empty)}")
        check_row(cells, line_no)


def check_indicators(rep: Reporter, root: Path, state: dict) -> None:
    header = INDICATORS_HEADER
    rows = read_table(root, "config/data/indicators.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    units: dict[str, dict[str, str]] = {}
    seen: set[str] = set()

    def row(cells, line_no):
        rel = "config/data/indicators.csv"
        iid = cells["id"].strip()
        if iid:
            if not ID_RE.match(iid):
                rep.error(f"{rel}:{line_no} invalid id '{iid}', must be lowercase snake_case")
            if iid in seen:
                rep.error(f"{rel}:{line_no} duplicate id '{iid}'")
            seen.add(iid)
            units.setdefault(iid, {"unit": cells["unit"].strip(), "name": cells["name"].strip()})
        direction = cells["direction"].strip()
        if direction and direction not in ("higher", "lower", "both"):
            rep.error(f"{rel}:{line_no} direction must be higher, lower or both, got '{direction}'")
        hazards = cells["hazards"].strip()
        for h in hazards.split():
            if h not in HAZARDS:
                rep.error(f"{rel}:{line_no} unknown hazard '{h}', must be one of the five names")
        spread = cells["min_spread"].strip()
        if spread:
            try:
                if float(spread) <= 0:
                    rep.error(f"{rel}:{line_no} min_spread must be greater than 0")
            except ValueError:
                rep.error(f"{rel}:{line_no} min_spread must be a number, got '{spread}'")
        tier = cells["tier"].strip()
        if tier and tier not in TIERS:
            rep.error(f"{rel}:{line_no} tier must be A, B or C, got '{tier}'")
        system = cells["system"].strip()
        if system and system not in SYSTEMS:
            rep.error(f"{rel}:{line_no} unknown system '{system}', must be one of FORMATS.md section 2")
        source = cells["source"].strip()
        if source and not valid_source(source):
            rep.error(f"{rel}:{line_no} source must be an http(s) link or 'Assumption'")

    validate_rows(rep, "config/data/indicators.csv", rows, header, required, row)
    state["indicators"] = units
    state["indicator_row_count"] = len(rows)


def check_demo_ranges(rep: Reporter, root: Path, state: dict) -> None:
    header = DEMO_RANGES_HEADER
    rows = read_table(root, "config/data/demo_ranges.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    ranges: dict[str, tuple[float, float]] = {}
    seen: set[str] = set()

    def row(cells, line_no):
        rel = "config/data/demo_ranges.csv"
        iid = cells["indicator_id"].strip()
        indicators = state.get("indicators")
        if iid and indicators is not None and iid not in indicators:
            rep.error(f"{rel}:{line_no} unknown indicator_id '{iid}'")
        if iid:
            if iid in seen:
                rep.error(f"{rel}:{line_no} duplicate indicator_id '{iid}'")
            seen.add(iid)
        mn, mx = cells["min"].strip(), cells["max"].strip()
        if mn and not is_number(mn):
            rep.error(f"{rel}:{line_no} min must be a number, got '{mn}'{decimal_comma_hint(mn)}")
        if mx and not is_number(mx):
            rep.error(f"{rel}:{line_no} max must be a number, got '{mx}'{decimal_comma_hint(mx)}")
        if mn and mx and is_number(mn) and is_number(mx):
            if float(mn) >= float(mx):
                rep.error(f"{rel}:{line_no} min must be less than max, got {mn} and {mx}")
            ranges.setdefault(iid, (float(mn), float(mx)))
        source = cells["source"].strip()
        if source and not valid_source(source):
            rep.error(f"{rel}:{line_no} source must be an http(s) link or 'Assumption'")

    validate_rows(rep, "config/data/demo_ranges.csv", rows, header, required, row)
    state["demo_ranges"] = ranges
    state["demo_ranges_ids"] = seen


def check_attention(rep: Reporter, root: Path, state: dict) -> None:
    header = ATTENTION_HEADER
    rows = read_table(root, "config/rules/attention.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    levels: dict[str, set[str]] = {}
    seen: set[str] = set()

    def row(cells, line_no):
        rel = "config/rules/attention.csv"
        iid = cells["indicator_id"].strip()
        if iid:
            seen.add(iid)
        indicators = state.get("indicators")
        if iid and indicators is not None and iid not in indicators:
            rep.error(f"{rel}:{line_no} unknown indicator_id '{iid}'")
        side = cells["side"].strip()
        if side and side not in ("below", "above"):
            rep.error(f"{rel}:{line_no} side must be below or above, got '{side}'")
        threshold = cells["threshold"].strip()
        if threshold and not is_number(threshold):
            rep.error(f"{rel}:{line_no} threshold must be a number, got '{threshold}'{decimal_comma_hint(threshold)}")
        source = cells["source"].strip()
        if source and not valid_source(source):
            rep.error(f"{rel}:{line_no} source must be an http(s) link or 'Assumption'")
        level = cells["attention_level"].strip()
        if iid and level:
            levels.setdefault(iid, set()).add(level)
        notify = cells["notify"].strip()
        if notify and notify not in NOTIFY_ORDER:
            rep.error(f"{rel}:{line_no} notify must be crew, cmo or flight_surgeon, got '{notify}'")
        if iid and side in ("below", "above") and is_number(threshold) and notify in NOTIFY_ORDER:
            bounds.setdefault((iid, side), []).append(
                (float(threshold), NOTIFY_ORDER.index(notify), line_no))

    bounds: dict[tuple[str, str], list[tuple[float, int, int]]] = {}
    validate_rows(rep, "config/rules/attention.csv", rows, header, required, row)
    check_attention_order(rep, bounds)
    state["attention"] = levels
    state["attention_ids"] = seen


def check_attention_order(rep: Reporter, bounds: dict) -> None:
    """Rows that can match the same value must escalate in one direction.

    below: a lower threshold is reached by more extreme values, so its notify
    must be the same or more severe. above: the same for a higher threshold.
    Two rows with the same indicator, side and threshold are ambiguous.
    """
    rel = "config/rules/attention.csv"
    for (iid, side), items in bounds.items():
        seen: dict[float, int] = {}
        for value, _, line_no in items:
            if value in seen:
                rep.error(f"{rel}:{line_no} duplicate {side} threshold {value:g} for '{iid}' "
                          f"(also line {seen[value]})")
            seen.setdefault(value, line_no)
        # From the mildest bound to the most extreme one.
        ordered = sorted(items, key=lambda t: t[0], reverse=(side == "below"))
        for (v1, s1, _), (v2, s2, l2) in zip(ordered, ordered[1:]):
            if v1 != v2 and s2 < s1:
                rep.error(f"{rel}:{l2} '{iid}' {side} {v2:g} notifies {NOTIFY_ORDER[s2]}, less "
                          f"severe than {NOTIFY_ORDER[s1]} at {v1:g}; a more extreme value must "
                          f"notify the same or more")


SIGNAL_SIDES = ("above", "below")


def check_conditions(rep: Reporter, root: Path, state: dict, strict: bool = False) -> None:
    header = CONDITIONS_HEADER
    rows = read_table(root, "config/rules/conditions.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    seen: set[str] = set()

    def row(cells, line_no):
        rel = "config/rules/conditions.csv"
        cid = cells["condition_id"].strip()
        if cid:
            if not ID_RE.match(cid):
                rep.error(f"{rel}:{line_no} invalid condition_id '{cid}', must be lowercase snake_case")
            if cid in seen:
                rep.error(f"{rel}:{line_no} duplicate condition_id '{cid}'")
            seen.add(cid)
        indicators = state.get("indicators")
        sides_seen: dict[str, str] = {}
        for based in cells["based_on"].split():
            iid, sep, side = based.partition(":")
            if not sep:
                # Without a side two conditions on one indicator (hyper- and
                # hypoglycaemia) both score on any change (FORMATS.md, F-bio2-02).
                report_problem(rep, strict, f"{rel}:{line_no} based_on '{based}' has no side, "
                               "write it as indicator_id:above or indicator_id:below")
            elif side not in SIGNAL_SIDES:
                rep.error(f"{rel}:{line_no} based_on '{based}' side must be above or below, got '{side}'")
            if indicators is not None and iid not in indicators:
                rep.error(f"{rel}:{line_no} based_on id '{iid}' is not an indicator")
            if iid in sides_seen:
                rep.error(f"{rel}:{line_no} based_on names '{iid}' twice")
            sides_seen[iid] = side
        source = cells["source"].strip()
        if source and not valid_source(source):
            rep.error(f"{rel}:{line_no} source must be an http(s) link or 'Assumption'")

    validate_rows(rep, "config/rules/conditions.csv", rows, header, required, row)


def check_body_regions(rep: Reporter, root: Path) -> None:
    header = ["id", "name", "source"]
    rows = read_table(root, "config/content/body_regions.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    seen: set[str] = set()

    def row(cells, line_no):
        rel = "config/content/body_regions.csv"
        bid = cells["id"].strip()
        if bid:
            if not ID_RE.match(bid):
                rep.error(f"{rel}:{line_no} invalid id '{bid}', must be lowercase snake_case")
            if bid in seen:
                rep.error(f"{rel}:{line_no} duplicate id '{bid}'")
            seen.add(bid)
        source = cells["source"].strip()
        if source and not valid_source(source):
            rep.error(f"{rel}:{line_no} source must be an http(s) link or 'Assumption'")

    validate_rows(rep, "config/content/body_regions.csv", rows, header, required, row)


def check_demo_data(rep: Reporter, root: Path, state: dict) -> None:
    header = DEMO_DATA_HEADER
    rows = read_table(root, "config/data/demo_data.csv", header, rep)
    if rows is None:
        return
    required = set(header)
    indicators = state.get("indicators")
    ranges = state.get("demo_ranges")

    def row(cells, line_no):
        rel = "config/data/demo_data.csv"
        pid = cells["person_id"].strip()
        if pid and not ID_RE.match(pid):
            rep.error(f"{rel}:{line_no} invalid person_id '{pid}', must be lowercase snake_case")
        iid = cells["indicator_id"].strip()
        if iid and indicators is not None:
            if iid not in indicators:
                rep.error(f"{rel}:{line_no} unknown indicator_id '{iid}'")
            elif cells["unit"].strip() and cells["unit"].strip() != indicators[iid]["unit"]:
                rep.error(f"{rel}:{line_no} unit '{cells['unit'].strip()}' does not match indicator "
                          f"'{iid}' unit '{indicators[iid]['unit']}'")
        value = cells["value"].strip()
        if value and not is_number(value):
            rep.error(f"{rel}:{line_no} value must be a number, got '{value}'{decimal_comma_hint(value)}")
        day = cells["mission_day"].strip()
        if day and (not day.isdecimal() or int(day) <= 0):
            rep.error(f"{rel}:{line_no} mission_day must be a positive integer, got '{day}'")
        clock = cells["time"].strip()
        if clock and not TIME_RE.match(clock):
            rep.error(f"{rel}:{line_no} time must be 24-hour HH:MM, got '{clock}'")
        ctx = cells["context"].strip()
        if ctx and ctx not in ("rest", "after_exercise", "on_waking", "before_sleep"):
            rep.error(f"{rel}:{line_no} context must be rest, after_exercise, on_waking or before_sleep, got '{ctx}'")
        if value and is_number(value) and iid and ranges is not None:
            if iid not in ranges:
                rep.error(f"{rel}:{line_no} no range in demo_ranges.csv for indicator '{iid}'")
            else:
                lo, hi = ranges[iid]
                if not (lo <= float(value) <= hi):
                    rep.error(f"{rel}:{line_no} value {value} is outside the demo range "
                              f"{lo} to {hi} for '{iid}'")

    validate_rows(rep, "config/data/demo_data.csv", rows, header, required, row)
    state["demo_data_row_count"] = len(rows)


def parse_markdown(text: str) -> list[dict]:
    """Split a content file into blocks: {level, heading, lines}."""
    blocks: list[dict] = [{"level": 0, "heading": None, "lines": []}]
    for raw in text.splitlines():
        line = raw.rstrip()
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match:
            blocks.append({"level": len(match.group(1)), "heading": match.group(2).strip(),
                           "lines": []})
        else:
            blocks[-1]["lines"].append(line)
    return blocks


def split_paragraphs(lines: list[str]) -> list[str]:
    """Join runs of non-blank lines into paragraph strings."""
    paragraphs: list[str] = []
    current: list[str] = []
    for line in lines:
        if line.strip():
            current.append(line.strip())
        elif current:
            paragraphs.append(" ".join(current))
            current = []
    if current:
        paragraphs.append(" ".join(current))
    return paragraphs


def paragraph_ends_with_link(paragraph: str) -> bool:
    text = paragraph.rstrip().rstrip(".;,")
    return bool(re.search(r"https?://\S+$", text))


def check_content_file(rep: Reporter, path: Path, rel: str, stem: str, state: dict) -> None:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeDecodeError) as exc:
        rep.error(f"{rel}: cannot read file ({exc})")
        return
    blocks = parse_markdown(text)

    headings = [b for b in blocks if b["level"] >= 1]
    if not headings:
        rep.error(f"{rel}: no '#' heading (indicator name)")
    elif headings[0]["level"] != 1:
        rep.error(f"{rel}: first heading must be '# <indicator name>'")
    if sum(1 for b in blocks if b["level"] == 1) > 1:
        rep.error(f"{rel}: more than one '#' heading")

    h2 = [b["heading"] for b in blocks if b["level"] == 2]
    missing = [h for h in EXPECTED_H2 if h not in h2]
    extra = [h for h in h2 if h not in EXPECTED_H2]
    for h in missing:
        rep.error(f"{rel}: missing heading '## {h}'")
    for h in extra:
        rep.error(f"{rel}: unexpected heading '## {h}'")
    for h, count in Counter(h2).items():
        if count > 1:
            rep.error(f"{rel}: duplicate heading '## {h}'")
    if not missing and not extra and h2 != EXPECTED_H2:
        rep.error(f"{rel}: headings out of order, expected {EXPECTED_H2}")

    current_h2 = None
    subheads: list[str] = []
    for block in blocks:
        if block["level"] == 2:
            current_h2 = block["heading"]
        elif block["level"] == 3:
            if current_h2 != "Status and next steps":
                rep.error(f"{rel}: '### {block['heading']}' must be under '## Status and next steps'")
            subheads.append(block["heading"])

    attention = state.get("attention")
    if attention is not None:
        levels = attention.get(stem, set())
        for h in subheads:
            if h not in levels:
                rep.error(f"{rel}: '### {h}' is not an attention_level for indicator '{stem}'")
        for level in sorted(levels - set(subheads)):
            rep.error(f"{rel}: no '### {level}' heading for attention_level of indicator '{stem}'")
    else:
        rep.warn(f"{rel}: cannot check attention levels, rules/attention.csv is missing")

    # Source coverage: a link under "## Sources" covers the whole file; otherwise
    # every content section except "Measurement steps" must carry the word
    # Assumption or end each paragraph with a link. A section's text includes the
    # bodies of its ``###`` sub-headings (the status text under "Status and next
    # steps").
    sources_has_link = False
    for block in blocks:
        if block["level"] == 2 and block["heading"] == "Sources":
            if re.search(r"https?://\S+", "\n".join(block["lines"])):
                sources_has_link = True
    if not sources_has_link:
        bodies: dict[str, list[str]] = {}
        parent: str | None = None
        for block in blocks:
            if block["level"] == 2:
                parent = block["heading"]
            if block["level"] in (2, 3) and parent is not None:
                bodies.setdefault(parent, []).extend(block["lines"])
        for heading in EXPECTED_H2:
            if heading in ("Measurement steps", "Sources"):
                continue
            text_lines = [ln for ln in bodies.get(heading, []) if ln.strip()]
            if not text_lines:
                continue
            section_text = "\n".join(text_lines)
            if "Assumption" in section_text:
                continue
            for paragraph in split_paragraphs(text_lines):
                if not paragraph_ends_with_link(paragraph):
                    rep.error(f"{rel}: unsourced paragraph under '## {heading}' "
                              "(end it with a link, add 'Assumption', or list a link under '## Sources')")


def check_content_files(rep: Reporter, root: Path, state: dict, strict: bool) -> None:
    content_dir = root / "config" / "content"
    files = sorted(content_dir.glob("*.md")) if content_dir.exists() else []
    indicators = state.get("indicators")
    ids = set(indicators.keys()) if indicators is not None else None
    seen: set[str] = set()
    for path in files:
        rel = f"config/content/{path.name}"
        stem = path.stem
        seen.add(stem)
        if ids is not None and stem not in ids:
            rep.error(f"{rel}: unknown indicator id '{stem}'")
        check_content_file(rep, path, rel, stem, state)
    if ids is not None:
        for iid in sorted(ids - seen):
            rel = f"config/content/{iid}.md"
            if strict:
                rep.error(f"{rel}: missing content file for indicator '{iid}'")
            else:
                rep.warn(f"{rel}: missing content file for indicator '{iid}'")


def report_problem(rep: Reporter, strict: bool, msg: str) -> None:
    """A problem that blocks the final submission under --strict, warns otherwise."""
    if strict:
        rep.error(msg)
    else:
        rep.warn(msg)


def check_nonempty_tables(rep: Reporter, state: dict, strict: bool) -> None:
    """A required table with only its header (no data rows) blocks --strict.

    ``None`` means the file is missing (already reported by ``check``); ``0``
    means the file exists but holds no data rows yet.
    """
    if state.get("indicator_row_count") == 0:
        report_problem(rep, strict, "config/data/indicators.csv: no indicator rows (header only)")
    if state.get("demo_data_row_count") == 0:
        report_problem(rep, strict, "config/data/demo_data.csv: no demo data rows (header only)")


def check_indicator_coverage(rep: Reporter, state: dict, strict: bool) -> None:
    """Each indicator needs a demo range row and an attention row.

    ``None`` means the table is missing (already reported); otherwise a set of
    the indicator ids present in that table.
    """
    indicators = state.get("indicators")
    if not indicators:
        return
    demo_ranges_ids = state.get("demo_ranges_ids")
    attention_ids = state.get("attention_ids")
    for iid in sorted(indicators):
        if demo_ranges_ids is not None and iid not in demo_ranges_ids:
            report_problem(rep, strict, f"config/data/demo_ranges.csv: no row for indicator '{iid}'")
        if attention_ids is not None and iid not in attention_ids:
            report_problem(rep, strict, f"config/rules/attention.csv: no row for indicator '{iid}'")


def check(root: Path, strict: bool) -> list[str]:
    rep = Reporter()
    state: dict = {}

    for rel in REQUIRED_FILES:
        if not (root / rel).exists():
            if strict:
                rep.error(f"{rel}: missing required file")
            else:
                rep.warn(f"{rel}: missing required file")

    # Load and validate in dependency order: the cross-file checks in the later
    # tables and content files need indicators, demo ranges and attention levels.
    check_indicators(rep, root, state)
    check_demo_ranges(rep, root, state)
    check_attention(rep, root, state)
    check_conditions(rep, root, state, strict)
    check_body_regions(rep, root)
    check_demo_data(rep, root, state)
    check_content_files(rep, root, state, strict)
    check_nonempty_tables(rep, state, strict)
    check_indicator_coverage(rep, state, strict)

    return rep.lines


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Check config/ against FORMATS.md.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("\n\n")[0],
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="treat missing required files, header-only tables, and a missing "
             "demo range or attention row as errors (content/body_regions.csv excluded)",
    )
    args = parser.parse_args(argv)

    problems = check(Path("."), args.strict)
    errors = 0
    for problem in problems:
        print(problem)
        if problem.startswith("ERROR "):
            errors += 1
    warnings = len(problems) - errors
    print(f"{errors} error(s), {warnings} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
