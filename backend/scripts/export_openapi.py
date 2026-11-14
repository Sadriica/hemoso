"""Export the app's OpenAPI schema to docs/openapi.json, or check it is current.

Run from backend/:

    uv run python scripts/export_openapi.py          # write the file
    uv run python scripts/export_openapi.py --check  # exit 1 when out of date
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app

OUT = BACKEND_DIR.parent / "docs" / "openapi.json"


def openapi_json() -> str:
    """The schema as it should be written: sorted keys, 2-space indent, trailing newline."""
    return json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n"


def write() -> Path:
    OUT.write_text(openapi_json(), encoding="utf-8")
    return OUT


def is_current() -> bool:
    if not OUT.exists():
        return False
    return OUT.read_text(encoding="utf-8") == openapi_json()


def main(argv: list[str]) -> int:
    if "--check" in argv:
        if is_current():
            print("openapi.json is up to date")
            return 0
        print(
            "openapi.json is out of date; run "
            "`uv run python scripts/export_openapi.py`",
            file=sys.stderr,
        )
        return 1
    path = write()
    print(f"wrote {path.relative_to(BACKEND_DIR.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
