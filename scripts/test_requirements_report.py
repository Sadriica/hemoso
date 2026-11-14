"""Tests for scripts/requirements_report.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

No network: the board is mocked.
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
import requirements_report  # noqa: E402


@contextmanager
def chdir(path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)


class RequirementsReportTest(unittest.TestCase):
    def test_write_handles_backslash_in_title(self):
        item = {"kind": "Requirement", "status": "Todo", "reqtype": "Functional",
                "role": "bio1", "priority": "P0", "block": "B1",
                "content": {"number": 1, "title": "[REQ-01] A \\ test"}}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "docs").mkdir()
            doc = root / "docs" / "requirements.md"
            doc.write_text("# Requirements\n", encoding="utf-8")
            with chdir(root), redirect_stdout(io.StringIO()), \
                    mock.patch("requirements_report.board.load_conf", return_value={}), \
                    mock.patch("requirements_report.board.items", return_value=[item]), \
                    mock.patch.object(sys, "argv", ["requirements_report.py", "--write"]):
                requirements_report.main()
            text = doc.read_text(encoding="utf-8")
            self.assertIn("A \\ test", text)
            self.assertIn("<!-- status:start -->", text)


if __name__ == "__main__":
    unittest.main()
