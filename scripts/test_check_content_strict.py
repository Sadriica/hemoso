"""Tests for the --strict additions to scripts/check_content.py.

Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

The --strict mode is the check for the final submission, so it must fail while
the config is still placeholder: a required table with only its header, an
indicator without a demo range row or an attention row, or a missing content
file. Without --strict the same states stay warnings. All ids and values are
placeholders (example_indicator, example_level).
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_content  # noqa: E402


# A complete placeholder config that passes under --strict.
COMPLETE = {
    "config/data/indicators.csv": (
        "id,name,unit,direction,measured_on_board,hazards,source\n"
        "example_indicator,Example indicator,example_unit,higher,"
        "example measurement method,isolation_and_confinement,Assumption\n"
    ),
    "config/data/demo_ranges.csv": (
        "indicator_id,min,max,source,generation_note\n"
        "example_indicator,0,100,Assumption,uniform random integers\n"
    ),
    "config/data/demo_data.csv": (
        "person_id,indicator_id,value,unit,mission_day,time\n"
        "demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n"
    ),
    "config/rules/attention.csv": (
        "indicator_id,side,threshold,attention_level,notify,source\n"
        "example_indicator,above,100,example_level,crew,Assumption\n"
    ),
    "config/rules/conditions.csv": (
        "condition_id,name,based_on,source\n"
        "example_condition,Example condition,example_indicator,Assumption\n"
    ),
    "config/content/example_indicator.md": (
        "# Example indicator\n\n"
        "## Why it matters\nExample reason. Assumption.\n\n"
        "## How spaceflight affects it\nExample hazard effect. Assumption.\n\n"
        "## Measurement steps\n1. Example step one.\n2. Example step two.\n\n"
        "## Status and next steps\n### example_level\n"
        "Example status text and example next step. Assumption.\n\n"
        "## How to prevent problems\nExample guidance. Assumption.\n\n"
        "## Sources\n- Example title: https://example.org\n"
    ),
}

# The header-only files scripts/new_config.py writes before anyone fills rows.
HEADER_ONLY = {
    "config/data/indicators.csv": "id,name,unit,direction,measured_on_board,hazards,source\n",
    "config/data/demo_ranges.csv": "indicator_id,min,max,source,generation_note\n",
    "config/data/demo_data.csv": "person_id,indicator_id,value,unit,mission_day,time\n",
    "config/rules/attention.csv": "indicator_id,side,threshold,attention_level,notify,source\n",
    "config/rules/conditions.csv": "condition_id,name,based_on,source\n",
}


class StrictContentCheckTest(unittest.TestCase):
    def problems(self, files, strict=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for rel, content in files.items():
                path = root / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
            return check_content.check(root, strict)

    def errors(self, files, strict=False):
        return [line for line in self.problems(files, strict) if line.startswith("ERROR ")]

    def warnings(self, files, strict=False):
        return [line for line in self.problems(files, strict) if line.startswith("WARN ")]

    def assert_error(self, files, needle, strict=True):
        self.assertTrue(
            any(needle in line for line in self.errors(files, strict)),
            f"no error matching {needle!r} in {self.errors(files, strict)}",
        )

    def test_complete_placeholder_set_passes_strict(self):
        self.assertEqual(self.errors(COMPLETE, strict=True), [])

    # The confirmed bug: header-only files pass --strict with 0 errors.
    def test_header_only_files_pass_with_warnings(self):
        self.assertEqual(self.errors(HEADER_ONLY, strict=False), [])
        self.assertTrue(self.warnings(HEADER_ONLY, strict=False))

    def test_header_only_files_fail_strict(self):
        self.assert_error(HEADER_ONLY, "no indicator rows (header only)")
        self.assert_error(HEADER_ONLY, "no demo data rows (header only)")

    # Point 1: data/indicators.csv with no data rows blocks --strict.
    def test_indicators_no_data_rows(self):
        files = dict(COMPLETE)
        files["config/data/indicators.csv"] = HEADER_ONLY["config/data/indicators.csv"]
        self.assert_error(files, "no indicator rows (header only)")

    # Point 2: each indicator needs a content file, a demo range and an attention row.
    def test_missing_content_file(self):
        files = {k: v for k, v in COMPLETE.items() if k != "config/content/example_indicator.md"}
        self.assert_error(files, "missing content file for indicator 'example_indicator'")

    def test_missing_demo_range_row(self):
        files = dict(COMPLETE)
        files["config/data/demo_ranges.csv"] = HEADER_ONLY["config/data/demo_ranges.csv"]
        self.assert_error(files, "demo_ranges.csv: no row for indicator 'example_indicator'")

    def test_missing_attention_row(self):
        files = dict(COMPLETE)
        files["config/rules/attention.csv"] = HEADER_ONLY["config/rules/attention.csv"]
        self.assert_error(files, "attention.csv: no row for indicator 'example_indicator'")

    # Point 3: data/demo_data.csv with no data rows blocks --strict.
    def test_demo_data_no_data_rows(self):
        files = dict(COMPLETE)
        files["config/data/demo_data.csv"] = HEADER_ONLY["config/data/demo_data.csv"]
        self.assert_error(files, "no demo data rows (header only)")


if __name__ == "__main__":
    unittest.main()
