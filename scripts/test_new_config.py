"""Tests for scripts/new_config.py against a temporary root.

Run from the repository root:

  python -m unittest discover -s scripts -p "test_new_config.py"
"""

import io
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_content  # noqa: E402
import new_config  # noqa: E402


def run(*args):
    """Run new_config.main with the given args; return (code, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        code = new_config.main(list(args))
    return code, out.getvalue(), err.getvalue()


class NewConfigTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())

    def test_phys_creates_three_files(self):
        code, out, err = run("--root", str(self.root), "phys")
        self.assertEqual(code, 0, err)
        for rel, header in [
            ("config/data/indicators.csv", check_content.INDICATORS_HEADER),
            ("config/data/demo_ranges.csv", check_content.DEMO_RANGES_HEADER),
            ("config/data/demo_data.csv", check_content.DEMO_DATA_HEADER),
        ]:
            path = self.root / rel
            self.assertTrue(path.exists(), rel)
            self.assertEqual(path.read_text(encoding="utf-8"), ",".join(header) + "\n", rel)

    def test_bio2_creates_two_files(self):
        code, out, err = run("--root", str(self.root), "bio2")
        self.assertEqual(code, 0, err)
        for rel, header in [
            ("config/rules/attention.csv", check_content.ATTENTION_HEADER),
            ("config/rules/conditions.csv", check_content.CONDITIONS_HEADER),
        ]:
            path = self.root / rel
            self.assertTrue(path.exists(), rel)
            self.assertEqual(path.read_text(encoding="utf-8"), ",".join(header) + "\n", rel)

    def test_bio1_creates_content_files(self):
        code, out, err = run("--root", str(self.root), "bio1", "heart_rate", "sleep")
        self.assertEqual(code, 0, err)
        path = self.root / "config/content/heart_rate.md"
        self.assertTrue(path.exists())
        self.assertEqual(path.read_text(encoding="utf-8"), new_config.content_text("heart_rate"))
        self.assertTrue((self.root / "config/content/sleep.md").exists())

    def test_no_overwrite(self):
        run("--root", str(self.root), "phys")
        path = self.root / "config/data/indicators.csv"
        before = path.read_bytes()
        code, out, err = run("--root", str(self.root), "phys")
        self.assertEqual(code, 0, err)
        self.assertEqual(path.read_bytes(), before)
        self.assertIn("exists, left as is: config/data/indicators.csv", out)

    def test_invalid_id_refused(self):
        code, out, err = run("--root", str(self.root), "bio1", "Bad Id!")
        self.assertEqual(code, 2)
        self.assertIn("invalid indicator id", err)
        self.assertFalse((self.root / "config/content/Bad Id!.md").exists())

    def test_unknown_person(self):
        code, out, err = run("--root", str(self.root), "bogus")
        self.assertEqual(code, 2)
        self.assertIn("usage:", err)

    def test_missing_argument(self):
        self.assertEqual(run("--root", str(self.root))[0], 2)
        self.assertEqual(run("--root", str(self.root), "bio1")[0], 2)

    def test_check_content_reports_no_header_or_heading_errors(self):
        for person in ("phys", "bio2"):
            root = Path(tempfile.mkdtemp())
            code, out, err = run("--root", str(root), person)
            self.assertEqual(code, 0, err)
            problems = check_content.check(root, strict=False)
            bad = [ln for ln in problems
                   if ln.startswith("ERROR") and ("header" in ln or "heading" in ln)]
            self.assertEqual(bad, [], f"{person}: {problems}")

        root = Path(tempfile.mkdtemp())
        code, out, err = run("--root", str(root), "bio1", "heart_rate")
        self.assertEqual(code, 0, err)
        problems = check_content.check(root, strict=False)
        bad = [ln for ln in problems
               if ln.startswith("ERROR") and ("header" in ln or "heading" in ln)]
        self.assertEqual(bad, [], f"bio1: {problems}")


if __name__ == "__main__":
    unittest.main()
