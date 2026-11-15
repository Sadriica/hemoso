"""Tests for scripts/format_rules.py against the shared format vectors.

  python -m unittest discover -s scripts -p "test_*.py"

``scripts/fixtures/format_rules/`` holds one JSON file per rule, written so the
frontend tests can read the same cases. This module checks the Python side of
every case; the TypeScript side is checked against the same files by the
frontend tests.
"""

import csv
import io
import json
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import format_rules  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "format_rules"

# The rule each file holds, so a renamed or emptied file is not silently skipped.
RULE_FILES = {
    "attention.json": "attention_for",
    "sources.json": "parse_sources",
    "baseline.json": "baseline_state",
    "csv.json": "read_csv",
}


def load(name: str) -> dict:
    with (FIXTURES / name).open(encoding="utf-8") as fh:
        return json.load(fh)


def read_csv_rows(text: str) -> list[list[str]]:
    """The rows scripts/check_content.py sees: utf-8-sig, blank lines skipped."""
    reader = csv.reader(io.StringIO(text.encode("utf-8").decode("utf-8-sig"), newline=""))
    rows = []
    for row in reader:
        if not row or (len(row) == 1 and row[0].strip() == ""):
            continue
        rows.append(row)
    return rows


class VectorSchemaTest(unittest.TestCase):
    def test_every_file_declares_its_rule_and_its_cases(self):
        for name, rule in RULE_FILES.items():
            with self.subTest(file=name):
                data = load(name)
                self.assertEqual(data.get("rule"), rule)
                self.assertIsInstance(data.get("source"), str)
                self.assertTrue(data["source"].strip())
                cases = data.get("cases")
                self.assertIsInstance(cases, list)
                self.assertTrue(cases)
                names = [case.get("name") for case in cases]
                self.assertEqual(len(names), len(set(names)), f"{name}: duplicate case names")
                for case in cases:
                    self.assertIsInstance(case.get("name"), str)
                    self.assertTrue(case["name"].strip())
                    self.assertIn("input", case)
                    self.assertIn("expected", case)


class AttentionVectorsTest(unittest.TestCase):
    def test_attention_for(self):
        for case in load("attention.json")["cases"]:
            with self.subTest(case=case["name"]):
                rows = case["input"]["rows"]
                value = case["input"]["value"]
                self.assertEqual(format_rules.attention_for(rows, value), case["expected"])


class SourcesVectorsTest(unittest.TestCase):
    def test_parse_sources(self):
        for case in load("sources.json")["cases"]:
            with self.subTest(case=case["name"]):
                expected = None if case["expected"] == "invalid" else case["expected"]
                self.assertEqual(format_rules.parse_sources(case["input"]["cell"]), expected)


class BaselineVectorsTest(unittest.TestCase):
    def test_baseline_state(self):
        for case in load("baseline.json")["cases"]:
            with self.subTest(case=case["name"]):
                given = case["input"]
                self.assertEqual(
                    format_rules.baseline_state(
                        given["median"], given["spread"], given["value"], given.get("boundary")),
                    case["expected"])


class CsvVectorsTest(unittest.TestCase):
    def test_read_csv(self):
        for case in load("csv.json")["cases"]:
            with self.subTest(case=case["name"]):
                if case["expected"] == "error":
                    with self.assertRaises(csv.Error):
                        read_csv_rows(case["input"]["text"])
                else:
                    self.assertEqual(read_csv_rows(case["input"]["text"]), case["expected"])


if __name__ == "__main__":
    unittest.main()
