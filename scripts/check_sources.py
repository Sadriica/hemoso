"""Phys (and anyone): checks every link used in config/ and docs/findings/.

  python scripts/check_sources.py              # open every link and report broken ones
  python scripts/check_sources.py --offline    # only the file checks, no network
  python scripts/check_sources.py --add        # append missing links to docs/sources.md

Reports:
  - links that do not open (HTTP error, timeout) with the files that use them;
  - links used in the product or in findings that are not in docs/sources.md;
  - content files and findings with no link at all.
Exits with code 1 when there is a broken link.
"""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL = re.compile(r"https?://[^\s<>\"'|,)\]]+")
FILES = ["config/**/*.md", "config/**/*.csv", "config/**/*.json", "docs/findings/*.md"]
SOURCES = Path("docs/sources.md")


def collect() -> dict[str, set[str]]:
    used: dict[str, set[str]] = {}
    for pattern in FILES:
        for f in Path(".").glob(pattern):
            if f.name == "TEMPLATE.md":
                continue
            for u in URL.findall(f.read_text(encoding="utf-8", errors="ignore")):
                used.setdefault(u.rstrip(".;:"), set()).add(f.as_posix())
    return used


def opens(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (link check)"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return "" if r.status < 400 else f"HTTP {r.status}"
    except urllib.error.HTTPError as e:
        # Some publishers block scripts (403) but open fine in a browser.
        return "" if e.code in (401, 403, 429) else f"HTTP {e.code}"
    except Exception as e:  # noqa: BLE001
        return type(e).__name__


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--offline", action="store_true")
    p.add_argument("--add", action="store_true")
    a = p.parse_args()
    fail = False
    used = collect()
    print(f"{len(used)} distinct links in config/ and docs/findings/.")

    for f in list(Path("config").glob("**/*.md")) + list(Path("docs/findings").glob("*.md")):
        if f.name not in ("README.md", "TEMPLATE.md") and "http" not in f.read_text(encoding="utf-8"):
            print(f"WARN  {f} has no link yet")
    print("Note: a link that opens is not proof that it supports the claim; a reviewer checks that.")

    listed = set(URL.findall(SOURCES.read_text(encoding="utf-8"))) if SOURCES.exists() else set()
    missing = sorted(u for u in used if u not in listed)
    for u in missing:
        print(f"WARN  not in docs/sources.md: {u}  (used in {', '.join(sorted(used[u]))})")
    if a.add and missing:
        with SOURCES.open("a", encoding="utf-8") as fh:
            for u in missing:
                fh.write(f"| TODO title | {u} | TODO | {', '.join(sorted(used[u]))} | |\n")
        print(f"Appended {len(missing)} rows to {SOURCES}; fill the TODO cells.")

    if not a.offline:
        for u in sorted(used):
            err = opens(u)
            if err:
                print(f"FAIL  {err}: {u}  (used in {', '.join(sorted(used[u]))})")
                fail = True
    print("Done." if not fail else "Fix the FAIL lines.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
