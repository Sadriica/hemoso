"""Tests for the numeric rules of scripts/check_content.py (card T-08, #8).

Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

Kept separate from test_check_content.py so the two edits stay easy to merge.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_content  # noqa: E402


VALID = {
    "config/data/indicators.csv": (
        "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
        "example_indicator,Example indicator,example_unit,higher,"
        "example measurement method,isolation_and_confinement,1,A,neuro_behavioural,Assumption\n"
    ),
    "config/data/demo_data.csv": (
        "person_id,indicator_id,value,unit,mission_day,time\n"
        "demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n"
    ),
    "config/data/demo_ranges.csv": (
        "indicator_id,min,max,source,generation_note\n"
        "example_indicator,0,100,Assumption,uniform random integers across the range\n"
    ),
    "config/rules/attention.csv": (
        "indicator_id,side,threshold,attention_level,source\n"
        "example_indicator,above,100,example_level,Assumption\n"
    ),
    "config/rules/conditions.csv": (
        "condition_id,name,based_on,source\n"
        "example_condition,Example condition,example_indicator,Assumption\n"
    ),
    "config/content/body_regions.csv": (
        "id,name,source\n"
        "example_body_region,Example body region,Assumption\n"
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


class CheckContentNumbersTest(unittest.TestCase):
    def problems(self, files):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for rel, content in files.items():
                path = root / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
            return check_content.check(root, False)

    def errors(self, files):
        return [line for line in self.problems(files) if line.startswith("ERROR ")]

    def assert_error(self, files, needle):
        self.assertTrue(
            any(needle in line for line in self.errors(files)),
            f"no error matching {needle!r} in {self.errors(files)}",
        )

    def test_is_number_rejects_underscore(self):
        self.assertFalse(check_content.is_number("1_000"))
        self.assertFalse(check_content.is_number("1_0"))
        self.assertTrue(check_content.is_number("1000"))

    def test_value_with_underscore_is_error(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1_000,example_unit,1,13:30\n"
        )
        self.assert_error(files, "value must be a number")

    def test_mission_day_superscript_rejected(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1,example_unit,²,13:30\n"
        )
        self.assert_error(files, "mission_day must be a positive integer")

    def test_mission_day_underscore_rejected(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1,example_unit,1_0,13:30\n"
        )
        self.assert_error(files, "mission_day must be a positive integer")


if __name__ == "__main__":
    unittest.main()
