"""Tests for scripts/now.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import now  # noqa: E402


class NowTest(unittest.TestCase):
    def test_parse_at_without_minutes(self):
        self.assertEqual(now.parse_at("Sat 9"), now.SAT.replace(hour=9, minute=0))

    def test_parse_at_with_minutes(self):
        self.assertEqual(now.parse_at("Sun 9:30"), now.SUN.replace(hour=9, minute=30))

    def test_unknown_day_is_error(self):
        with self.assertRaises(SystemExit):
            now.parse_at("Mon 9:00")

    def test_bad_format_is_error(self):
        with self.assertRaises(SystemExit):
            now.parse_at("Sat")


if __name__ == "__main__":
    unittest.main()
