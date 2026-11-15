"""Tests for scripts/smoke.py. Run from the repository root:

  python -m unittest discover -s scripts -p "test_*.py"

The checks against a live API start a local uvicorn with STORAGE=memory, so
they need `uv` and the backend dependencies; they are skipped when uv is not
installed, as on the scripts job of the CI workflow.
"""

import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import smoke  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
SMOKE = REPO_ROOT / "scripts" / "smoke.py"
ORIGIN = "http://localhost:5173"
START_TIMEOUT = 180.0

HEADER = (
    "id,name,unit,direction,measured_on_board,hazards,min_spread,tier,system,source\n"
)


def free_port():
    """A port nobody listens on, free for uvicorn."""
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_for_health(process, port, log, timeout=START_TIMEOUT):
    """Poll /health until it answers 200, or fail with uvicorn's output."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            log.seek(0)
            raise AssertionError(
                f"uvicorn exited with {process.returncode}:\n{log.read()[-2000:]}"
            )
        try:
            connection = HTTPConnection("127.0.0.1", port, timeout=2)
            try:
                connection.request("GET", "/health")
                connection.getresponse().read()
                return
            finally:
                connection.close()
        except OSError:
            time.sleep(0.2)
    log.seek(0)
    raise AssertionError(f"uvicorn did not answer /health:\n{log.read()[-2000:]}")


class SmokeAgainstLocalApiTest(unittest.TestCase):
    """One uvicorn in memory for the class; two runs of smoke.py against it."""

    @classmethod
    def setUpClass(cls):
        if shutil.which("uv") is None:
            raise unittest.SkipTest("uv is not installed")
        cls.port = free_port()
        env = dict(os.environ)
        env.update(
            {
                "STORAGE": "memory",
                "ALLOWED_ORIGINS": ORIGIN,
                "CONFIG_DIR": str(REPO_ROOT / "config"),
                "PYTHONUNBUFFERED": "1",
            }
        )
        cls.log = tempfile.TemporaryFile("w+")
        cls.process = subprocess.Popen(
            [
                "uv", "run", "uvicorn", "app.main:app",
                "--host", "127.0.0.1", "--port", str(cls.port),
            ],
            cwd=BACKEND,
            env=env,
            stdout=cls.log,
            stderr=subprocess.STDOUT,
        )
        cls.url = f"http://127.0.0.1:{cls.port}"
        try:
            wait_for_health(cls.process, cls.port, cls.log)
        except BaseException:
            cls.stop()
            raise

    @classmethod
    def tearDownClass(cls):
        cls.stop()

    @classmethod
    def stop(cls):
        process = getattr(cls, "process", None)
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=20)
        log = getattr(cls, "log", None)
        if log is not None:
            log.close()

    def run_smoke(self, *args):
        return subprocess.run(
            [sys.executable, str(SMOKE), *args],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
        )

    def test_every_check_passes(self):
        result = self.run_smoke(self.url, "--origin", ORIGIN)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        lines = [line for line in result.stdout.splitlines() if line.strip()]
        self.assertEqual(len(lines), 5, result.stdout)
        for line in lines:
            self.assertTrue(line.startswith("OK  "), line)
        output = "\n".join(lines)
        self.assertRegex(output, r"POST /entries: (201|200), stored")
        self.assertIn("POST /entries again: 200", output)
        self.assertIn("GET history: 200", output)
        self.assertIn(f"access-control-allow-origin {ORIGIN}", output)

    def test_second_run_stores_nothing_and_still_passes(self):
        first = self.run_smoke(self.url)
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        second = self.run_smoke(self.url)
        self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
        self.assertIn("POST /entries: 200, stored", second.stdout)
        self.assertIn("POST /entries again: 200, nothing stored twice", second.stdout)
        self.assertIn("SKIP CORS preflight", second.stdout)

    def test_fails_when_the_origin_is_not_allowed(self):
        result = self.run_smoke(self.url, "--origin", "http://not-allowed.example")
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("FAIL CORS preflight", result.stdout)
        self.assertIn("ALLOWED_ORIGINS", result.stdout)
        # The API is up: only the browser at that origin is refused.
        self.assertEqual(result.stdout.count("OK  "), 4, result.stdout)


class SmokeAgainstNothingTest(unittest.TestCase):
    def test_fails_when_the_backend_does_not_answer(self):
        url = f"http://127.0.0.1:{free_port()}"
        result = subprocess.run(
            [sys.executable, str(SMOKE), url],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
        )
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("FAIL GET /health", result.stdout)
        self.assertIn("cannot reach", result.stdout)

    def test_fails_on_a_url_that_is_not_http(self):
        result = subprocess.run(
            [sys.executable, str(SMOKE), "127.0.0.1:8000"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=120,
        )
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("FAIL GET /health", result.stdout)


class LoadIndicatorTest(unittest.TestCase):
    def write_csv(self, folder, body):
        path = Path(folder) / "indicators.csv"
        path.write_text(HEADER + body, encoding="utf-8")
        return path

    def test_reads_id_unit_and_min_spread(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.write_csv(
                folder,
                "example_indicator,Example indicator,example_unit,higher,"
                "example method,hostile_closed_environments,2.5,A,"
                "cardiovascular,Assumption\n",
            )
            self.assertEqual(
                smoke.load_indicator(path),
                ("example_indicator", "example_unit", 2.5),
            )

    def test_whole_number_min_spread_becomes_a_float(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.write_csv(
                folder,
                "example_indicator,Example indicator,bpm,both,example method,"
                "gravity_fields,4,A,cardiovascular,Assumption\n",
            )
            indicator_id, unit, value = smoke.load_indicator(path)
            self.assertEqual((indicator_id, unit), ("example_indicator", "bpm"))
            self.assertIsInstance(value, float)
            self.assertEqual(value, 4.0)

    def test_missing_file_is_an_error(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(smoke.Precondition):
                smoke.load_indicator(Path(folder) / "missing.csv")

    def test_row_without_a_number_is_an_error(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.write_csv(
                folder,
                "example_indicator,Example indicator,bpm,both,example method,"
                "gravity_fields,Assumption,A,cardiovascular,Assumption\n",
            )
            with self.assertRaises(smoke.Precondition):
                smoke.load_indicator(path)

    def test_repo_config_has_an_indicator_to_use(self):
        indicator_id, unit, value = smoke.load_indicator()
        self.assertTrue(indicator_id)
        self.assertTrue(unit)
        self.assertGreater(value, 0)


if __name__ == "__main__":
    unittest.main()
