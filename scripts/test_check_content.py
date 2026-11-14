"""Tests for scripts/check_content.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_check_content.py"

Each test builds a temporary config/ folder and runs the checker against it.
One test is a fully valid set built from the FORMATS.md examples; the rest each
introduce one failing case per rule in FORMATS.md section 4.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_content  # noqa: E402


# The FORMATS.md examples, assembled into a valid config/ folder.
VALID = {
    "config/data/indicators.csv": (
        "id,name,unit,direction,measured_on_board,hazards,source\n"
        "example_indicator,Example indicator,example_unit,higher,"
        "example measurement method,isolation_and_confinement,Assumption\n"
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


class ContentCheckTest(unittest.TestCase):
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

    def assert_error(self, files, needle, strict=False):
        self.assertTrue(
            any(needle in line for line in self.errors(files, strict)),
            f"no error matching {needle!r} in {self.errors(files, strict)}",
        )

    # The FORMATS.md examples are valid together.
    def test_valid_set(self):
        self.assertEqual(self.errors(VALID), [])

    # Missing files: warning without --strict, error with --strict.
    def test_missing_file_is_warning(self):
        files = {k: v for k, v in VALID.items() if k != "config/data/demo_data.csv"}
        lines = self.problems(files)
        self.assertTrue(any("demo_data.csv" in l and l.startswith("WARN ") for l in lines))
        self.assertFalse(any(l.startswith("ERROR ") for l in lines))

    def test_missing_file_is_error_when_strict(self):
        files = {k: v for k, v in VALID.items() if k != "config/data/demo_data.csv"}
        self.assert_error(files, "config/data/demo_data.csv", strict=True)

    def test_body_regions_never_required(self):
        files = {k: v for k, v in VALID.items() if k != "config/content/body_regions.csv"}
        self.assertEqual(self.errors(files), [])
        self.assertEqual(self.errors(files, strict=True), [])

    def test_wrong_header(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id,name,unit,direction,measured_on_board,hazards\n"
            "example_indicator,Example indicator,example_unit,higher,"
            "example measurement method,isolation_and_confinement\n"
        )
        self.assert_error(files, "wrong header")

    def test_empty_required_cell(self):
        files = dict(VALID)
        files["config/rules/conditions.csv"] = (
            "condition_id,name,based_on,source\n"
            "example_condition,Example condition,example_indicator,\n"
        )
        self.assert_error(files, "empty required cell")

    def test_duplicate_id(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id,name,unit,direction,measured_on_board,hazards,source\n"
            "example_indicator,Example indicator,example_unit,higher,"
            "example measurement method,isolation_and_confinement,Assumption\n"
            "example_indicator,Duplicate,example_unit,higher,"
            "example measurement method,isolation_and_confinement,Assumption\n"
        )
        self.assert_error(files, "duplicate id")

    def test_unknown_indicator_id(self):
        files = dict(VALID)
        files["config/data/demo_ranges.csv"] = (
            "indicator_id,min,max,source,generation_note\n"
            "example_indicator,0,100,Assumption,uniform random integers across the range\n"
            "missing_indicator,0,10,Assumption,uniform random integers\n"
        )
        self.assert_error(files, "unknown indicator_id 'missing_indicator'")

    def test_unknown_based_on_id(self):
        files = dict(VALID)
        files["config/rules/conditions.csv"] = (
            "condition_id,name,based_on,source\n"
            "example_condition,Example condition,missing_indicator,Assumption\n"
        )
        self.assert_error(files, "based_on id 'missing_indicator'")

    def test_invalid_source(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id,name,unit,direction,measured_on_board,hazards,source\n"
            "example_indicator,Example indicator,example_unit,higher,"
            "example measurement method,isolation_and_confinement,not a source\n"
        )
        self.assert_error(files, "source must be an http(s) link or 'Assumption'")

    def test_non_numeric_value(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,abc,example_unit,1,13:30\n"
        )
        self.assert_error(files, "value must be a number")

    def test_is_number_rejects_non_finite(self):
        for bad in ("nan", "inf", "-inf", "NaN", "Infinity", "-Infinity", "1e400"):
            with self.subTest(bad=bad):
                self.assertFalse(check_content.is_number(bad))
        for good in ("0", "1", "-2.5", "1e3", "1e-3"):
            with self.subTest(good=good):
                self.assertTrue(check_content.is_number(good))

    def test_non_finite_value_is_error(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,nan,example_unit,1,13:30\n"
        )
        self.assert_error(files, "value must be a number")

    def test_bad_direction(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id,name,unit,direction,measured_on_board,hazards,source\n"
            "example_indicator,Example indicator,example_unit,sideways,"
            "example measurement method,isolation_and_confinement,Assumption\n"
        )
        self.assert_error(files, "direction must be higher, lower or both")

    def test_bad_side(self):
        files = dict(VALID)
        files["config/rules/attention.csv"] = (
            "indicator_id,side,threshold,attention_level,source\n"
            "example_indicator,middle,100,example_level,Assumption\n"
        )
        self.assert_error(files, "side must be below or above")

    def test_bad_time(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1,example_unit,1,25:00\n"
        )
        self.assert_error(files, "time must be 24-hour HH:MM")

    def test_bad_mission_day(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1,example_unit,0,13:30\n"
        )
        self.assert_error(files, "mission_day must be a positive integer")

    def test_min_not_less_than_max(self):
        files = dict(VALID)
        files["config/data/demo_ranges.csv"] = (
            "indicator_id,min,max,source,generation_note\n"
            "example_indicator,100,0,Assumption,uniform random integers\n"
        )
        self.assert_error(files, "min must be less than max")

    def test_value_outside_range(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,200,example_unit,1,13:30\n"
        )
        self.assert_error(files, "outside the demo range")

    def test_unknown_hazard(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id,name,unit,direction,measured_on_board,hazards,source\n"
            "example_indicator,Example indicator,example_unit,higher,"
            "example measurement method,radiation nonsense,Assumption\n"
        )
        self.assert_error(files, "unknown hazard 'nonsense'")

    def test_unit_mismatch(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            "demo_astronaut_1,example_indicator,1,wrong_unit,1,13:30\n"
        )
        self.assert_error(files, "does not match indicator")

    def test_missing_heading(self):
        files = dict(VALID)
        files["config/content/example_indicator.md"] = VALID[
            "config/content/example_indicator.md"
        ].replace("## Sources\n- Example title: https://example.org\n", "")
        self.assert_error(files, "missing heading '## Sources'")

    def test_unmatched_attention_level_heading(self):
        files = dict(VALID)
        files["config/content/example_indicator.md"] = VALID[
            "config/content/example_indicator.md"
        ].replace("### example_level\n", "### wrong_level\n")
        self.assert_error(files, "not an attention_level for indicator 'example_indicator'")

    def test_missing_attention_level_heading(self):
        files = dict(VALID)
        files["config/rules/attention.csv"] = (
            "indicator_id,side,threshold,attention_level,source\n"
            "example_indicator,above,100,example_level,Assumption\n"
            "example_indicator,below,0,low_level,Assumption\n"
        )
        self.assert_error(files, "no '### low_level' heading")

    def test_unsourced_paragraph(self):
        files = dict(VALID)
        files["config/content/example_indicator.md"] = (
            "# Example indicator\n\n"
            "## Why it matters\nNo source here.\n\n"
            "## How spaceflight affects it\nExample. Assumption.\n\n"
            "## Measurement steps\n1. Step.\n\n"
            "## Status and next steps\n### example_level\nText. Assumption.\n\n"
            "## How to prevent problems\nText. Assumption.\n\n"
            "## Sources\n- Example title\n"
        )
        self.assert_error(files, "unsourced paragraph under '## Why it matters'")

    def test_content_file_with_bom(self):
        files = dict(VALID)
        files["config/content/example_indicator.md"] = (
            "\ufeff" + VALID["config/content/example_indicator.md"]
        )
        self.assertEqual(self.errors(files), [])

    def test_semicolon_csv(self):
        files = dict(VALID)
        files["config/data/indicators.csv"] = (
            "id;name;unit;direction;measured_on_board;hazards;source\n"
            "example_indicator;Example indicator;example_unit;higher;"
            "example measurement method;isolation_and_confinement;Assumption\n"
        )
        self.assert_error(files, "the file uses semicolons; save it as CSV with commas")

    def test_decimal_comma(self):
        files = dict(VALID)
        files["config/data/demo_data.csv"] = (
            "person_id,indicator_id,value,unit,mission_day,time\n"
            'demo_astronaut_1,example_indicator,"60,5",example_unit,1,13:30\n'
        )
        self.assert_error(files, "use a decimal point")


if __name__ == "__main__":
    unittest.main()
