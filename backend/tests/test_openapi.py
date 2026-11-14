"""OpenAPI export: the checked-in docs/openapi.json matches the app."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
SCRIPT = BACKEND_DIR / "scripts" / "export_openapi.py"


def test_openapi_is_current():
    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--check"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
