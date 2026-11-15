"""Tests for scripts/status.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

No network: subprocess and the board are mocked.
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
import status  # noqa: E402


@contextmanager
def chdir(path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)


def run(person, write, readme=None, items=None, mine=None):
    """Run status.main() in a temp cwd; return (stdout, written README text or None)."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        readme_path = None
        if readme is not None:
            readme_path = root / "team" / person / "README.md"
            readme_path.parent.mkdir(parents=True)
            readme_path.write_text(readme, encoding="utf-8")
        out = io.StringIO()
        argv = ["status.py", person] + (["--write"] if write else [])
        with chdir(root), redirect_stdout(out), \
                mock.patch("status.board.load_conf", return_value={"repo": "r"}), \
                mock.patch("status.board.gh", return_value=mine or []), \
                mock.patch("status.board.items", return_value=items or []), \
                mock.patch.object(sys, "argv", argv):
            status.main()
        written = readme_path.read_text(encoding="utf-8") if readme_path else None
        return out.getvalue(), written


class StatusTest(unittest.TestCase):
    def test_git_branch_uses_utf8(self):
        proc = mock.Mock(returncode=0, stdout="bio1\n", stderr="")
        with mock.patch("status.subprocess.run", return_value=proc) as run:
            with mock.patch("status.board.load_conf", return_value={"repo": "r"}), \
                    mock.patch("status.board.gh", return_value=[]), \
                    mock.patch("status.board.items", return_value=[]), \
                    mock.patch.object(sys, "argv", ["status.py"]), \
                    redirect_stdout(io.StringIO()):
                status.main()
        self.assertEqual(run.call_args.kwargs.get("encoding"), "utf-8")
        self.assertEqual(run.call_args.kwargs.get("errors"), "replace")

    def test_write_reports_missing_heading(self):
        out, _ = run("bio1", write=True, readme="# bio1\n\n## Blockers\n- None\n")
        self.assertIn("no '## Current status' heading", out)
        self.assertNotIn("Updated", out)

    def test_write_handles_backslash_in_title(self):
        item = {"status": "In progress", "block": "B1",
                "content": {"number": 1, "title": "[T-01] Fix the \\ path"}}
        out, text = run("bio1", write=True,
                        readme="## Current status\nold\n\n## Blockers\n- None\n",
                        items=[item], mine=[{"number": 1}])
        self.assertIn("Fix the \\ path", text)
        self.assertIn("Updated", out)

    def test_commit_message_has_card_number(self):
        item = {"status": "Todo", "block": "B1", "content": {"number": 1, "title": "[T-01] X"}}
        out, _ = run("bio1", write=True,
                     readme="## Current status\nold\n\n## Blockers\n- None\n",
                     items=[item], mine=[{"number": 1}])
        self.assertIn("(#N)", out)


if __name__ == "__main__":
    unittest.main()
