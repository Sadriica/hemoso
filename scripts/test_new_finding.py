"""Tests for scripts/new_finding.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import new_finding  # noqa: E402


class NewFindingTest(unittest.TestCase):
    def test_slugify_normal(self):
        self.assertEqual(
            new_finding.slugify("Resting HR rises before symptoms"),
            "resting-hr-rises-before-symptoms",
        )

    def test_slugify_empty_falls_back_to_finding(self):
        self.assertEqual(new_finding.slugify("¡¡¡"), "finding")
        self.assertEqual(new_finding.slugify("   "), "finding")


if __name__ == "__main__":
    unittest.main()
