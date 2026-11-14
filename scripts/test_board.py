"""Tests for scripts/board.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

No network: subprocess.run is mocked.
"""

import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import board  # noqa: E402


class BoardTest(unittest.TestCase):
    def test_gh_passes_utf8_and_replace(self):
        proc = mock.Mock(returncode=0, stdout="ok", stderr="")
        with mock.patch.object(board.subprocess, "run", return_value=proc) as run:
            board.gh("issue", "list")
        self.assertEqual(run.call_args.kwargs.get("encoding"), "utf-8")
        self.assertEqual(run.call_args.kwargs.get("errors"), "replace")

    def test_transient_eof_retries(self):
        bad = mock.Mock(returncode=1, stdout="", stderr="received EOF")
        good = mock.Mock(returncode=0, stdout="ok", stderr="")
        with mock.patch.object(board.subprocess, "run", side_effect=[bad, good]) as run:
            with mock.patch.object(board.time, "sleep"):
                out = board.gh("issue", "list")
        self.assertEqual(out, "ok")
        self.assertEqual(run.call_count, 2)

    def test_gh_missing_raises_system_exit(self):
        with mock.patch.object(board.subprocess, "run", side_effect=FileNotFoundError):
            with self.assertRaises(SystemExit):
                board.gh("issue", "list")

    def test_load_save_conf_roundtrip_utf8(self):
        conf = {"owner": "bio1", "note": "Bio 1 · health content"}
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(board, "CONF", Path(tmp) / "board.json"):
                board.save_conf(conf)
                self.assertEqual(board.load_conf(), conf)

    def test_cmd_import_reads_utf8_sig(self):
        csv_text = "\ufeffid,person,title\ntask-1,bio1,Hello\n"
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "cards.csv"
            csv_path.write_text(csv_text, encoding="utf-8")
            args = mock.Mock(file=str(csv_path))
            with mock.patch.object(board, "load_conf", return_value={"repo": "r"}), \
                    mock.patch.object(board, "fields", return_value={}), \
                    mock.patch.object(board, "existing_issues", return_value={}), \
                    mock.patch.object(board, "create_item", return_value="url") as create:
                with redirect_stdout(io.StringIO()):
                    board.cmd_import(args)
            row = create.call_args.args[2]
            self.assertEqual(row["id"], "task-1")
            self.assertEqual(row["person"], "bio1")


if __name__ == "__main__":
    unittest.main()
