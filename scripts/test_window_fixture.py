"""The shared window vectors (scripts/fixtures/format_rules/window.json) agree
with the rule in docs/findings/phys-02-baseline-state-rule.md, "Window test
vectors". The backend and the frontend test their own code against the same file.

  python -m unittest discover -s scripts -p "test_window_fixture.py"
"""

import json
import statistics
import unittest
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "format_rules" / "window.json"


def window_state(history, min_spread, test):
    """Reference: last 14 mission days with a reading before the test, daily means."""
    before = [e for e in history if (e["mission_day"], e["time"]) < (test["mission_day"], test["time"])]
    days: dict[int, list[float]] = {}
    for entry in before:
        days.setdefault(entry["mission_day"], []).append(entry["value"])
    daily = [statistics.fmean(days[d]) for d in sorted(days)[-14:]]
    if len(daily) < 3:
        return daily, None, None, "no_data"
    median = statistics.median(daily)
    spread = max(1.4826 * statistics.median([abs(x - median) for x in daily]), min_spread)
    state = "in_range" if abs(test["value"] - median) <= 3 * spread else "outside_range"
    return daily, median, spread, state


class WindowFixtureTest(unittest.TestCase):
    def test_cases_match_the_rule(self):
        doc = json.loads(FIXTURE.read_text(encoding="utf-8"))
        self.assertEqual(doc["rule"], "baseline_window")
        self.assertEqual(len(doc["cases"]), 7)
        for case in doc["cases"]:
            with self.subTest(case["name"]):
                inp, exp = case["input"], case["expected"]
                daily, median, spread, state = window_state(inp["history"], inp["min_spread"], inp["test"])
                self.assertEqual(daily, exp["daily_values"])
                self.assertEqual(len(daily), exp["n"])
                self.assertEqual(median, exp["median"])
                if spread is None:
                    self.assertIsNone(exp["spread"])
                else:
                    self.assertAlmostEqual(spread, exp["spread"], places=4)
                self.assertEqual(state, exp["state"])


if __name__ == "__main__":
    unittest.main()
