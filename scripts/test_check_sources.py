"""Tests for scripts/check_sources.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

No network: run with --offline only.
"""

import io
import os
import sys
import tempfile
import unittest
from contextlib import contextmanager, redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_sources  # noqa: E402


@contextmanager
def chdir(path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)


class CheckSourcesTest(unittest.TestCase):
    def test_url_regex_keeps_comma_and_paren(self):
        self.assertEqual(
            check_sources.URL.findall("https://en.wikipedia.org/wiki/Percent-encoding_(percent,_comma)"),
            ["https://en.wikipedia.org/wiki/Percent-encoding_(percent,_comma)"],
        )

    def test_phys_finding_covered_and_add_forward_slash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config" / "data").mkdir(parents=True)
            (root / "docs" / "findings").mkdir(parents=True)
            link = "https://example.org/some/page"
            (root / "config" / "data" / "indicators.csv").write_text(
                f"id,name,unit,source\nx,X,u,{link}\n", encoding="utf-8")
            (root / "docs" / "findings" / "phys-01-test.md").write_text(
                "# Test\nNo link.\n", encoding="utf-8")
            (root / "docs" / "sources.md").write_text("# Sources\n", encoding="utf-8")
            out = io.StringIO()
            with chdir(root), redirect_stdout(out), \
                    mock.patch.object(sys, "argv", ["check_sources.py", "--offline", "--add"]):
                check_sources.main()
            sources = (root / "docs" / "sources.md").read_text(encoding="utf-8")
            self.assertIn("config/data/indicators.csv", sources)
            self.assertNotIn("\\", sources)
            self.assertIn("phys-01-test.md has no link yet", out.getvalue())


if __name__ == "__main__":
    unittest.main()
