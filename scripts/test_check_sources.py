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
    def test_url_regex_stops_at_comma(self):
        self.assertEqual(
            check_sources.URL.findall(
                "https://www.who.int/news-room/fact-sheets/detail/hypertension,Synthetic"),
            ["https://www.who.int/news-room/fact-sheets/detail/hypertension"],
        )

    def test_url_regex_stops_at_close_paren(self):
        self.assertEqual(
            check_sources.URL.findall("[t](https://x)"),
            ["https://x"],
        )

    def test_url_regex_keeps_comma_free_query_string(self):
        self.assertEqual(
            check_sources.URL.findall("https://example.org/search?q=hypertension&lang=en"),
            ["https://example.org/search?q=hypertension&lang=en"],
        )

    def test_collect_strips_trailing_punctuation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config" / "data").mkdir(parents=True)
            (root / "config" / "data" / "indicators.csv").write_text(
                "id,name,unit,source\nx,X,u,https://example.org/a/b.\n", encoding="utf-8")
            with chdir(root):
                used = check_sources.collect()
            self.assertIn("https://example.org/a/b", used)
            self.assertNotIn("https://example.org/a/b.", used)

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

    # Link classification (Sun 15 Nov): only a link that is gone is a FAIL.
    def http_error(self, code):
        return check_sources.urllib.error.HTTPError("https://x", code, "msg", {}, None)

    def level(self, error):
        def opener(url):
            raise error
        return check_sources.check_link("https://x", opener=opener, pause=0)[0]

    def test_ok(self):
        self.assertEqual(check_sources.check_link("https://x", opener=lambda u: None, pause=0)[0], "ok")

    def test_gone_is_fail(self):
        for code in (404, 410):
            self.assertEqual(self.level(self.http_error(code)), "fail")

    def test_server_error_is_fail_after_retry(self):
        calls = []

        def opener(url):
            calls.append(url)
            raise self.http_error(500)
        self.assertEqual(check_sources.check_link("https://x", opener=opener, pause=0)[0], "fail")
        self.assertEqual(len(calls), 2)

    def test_retry_recovers(self):
        calls = []

        def opener(url):
            calls.append(url)
            if len(calls) == 1:
                raise self.http_error(503)
        self.assertEqual(check_sources.check_link("https://x", opener=opener, pause=0)[0], "ok")

    def test_blocked_is_warn(self):
        for code in (401, 403, 429, 451):
            self.assertEqual(self.level(self.http_error(code)), "warn")

    def test_unresolved_host_is_warn(self):
        # A sandbox without DNS cannot resolve humanresearchroadmap.nasa.gov either.
        err = check_sources.urllib.error.URLError(check_sources.socket.gaierror(-2, "Name or service not known"))
        self.assertEqual(self.level(err), "warn")

    def test_tls_is_warn(self):
        err = check_sources.urllib.error.URLError(check_sources.ssl.SSLError("handshake failure"))
        self.assertEqual(self.level(err), "warn")

    def test_timeout_and_proxy_are_warn(self):
        self.assertEqual(self.level(TimeoutError("timed out")), "warn")
        err = check_sources.urllib.error.URLError(OSError("Tunnel connection failed: 403 Forbidden"))
        self.assertEqual(self.level(err), "warn")

    def test_warn_does_not_fail_the_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "config" / "data").mkdir(parents=True)
            (root / "config" / "data" / "indicators.csv").write_text(
                "id,source\nx,https://blocked.example\n", encoding="utf-8")
            (root / "docs").mkdir()
            (root / "docs" / "sources.md").write_text("https://blocked.example\n", encoding="utf-8")
            out = io.StringIO()
            with chdir(root), redirect_stdout(out), \
                    mock.patch.object(sys, "argv", ["check_sources.py"]), \
                    mock.patch.object(check_sources, "check_link", return_value=("warn", "HTTP 403")):
                code = check_sources.main()
            self.assertEqual(code, 0)
            self.assertIn("WARN  not verified", out.getvalue())


if __name__ == "__main__":
    unittest.main()
