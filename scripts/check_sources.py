"""Phys (and anyone): checks every link used in config/ and docs/findings/.

  python scripts/check_sources.py              # open every link and report broken ones
  python scripts/check_sources.py --offline    # only the file checks, no network
  python scripts/check_sources.py --add        # append missing links to docs/sources.md

Reports:
  - FAIL: links the site says are gone (404, 410, a server error twice),
    with the files that use them; only these make the script exit with 1;
  - WARN: links the script cannot verify (the site blocks scripts or robots,
    TLS or a proxy refuses the connection, a timeout): open them in a browser;
  - links used in the product or in findings that are not in docs/sources.md;
  - content files and findings with no link at all.
Exits with code 1 only when a link is gone; a link the script cannot verify is
a warning, because a page that opens in a browser is not broken (Sun 15 Nov:
spaceappschallenge.org blocks robots and the CSA page rejects scripts, both open
fine in a browser).
"""

from __future__ import annotations

import argparse
import re
import socket
import ssl
import sys
import time
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


# Headers of a desktop browser: many publishers answer a bare script with 403.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
# The site answered, but it refuses scripts or needs a person: not proof of a dead link.
BLOCKED = {401, 403, 405, 406, 418, 429, 451, 999}
# The page is gone.
GONE = {404, 410}

OK, WARN, FAIL = "ok", "warn", "fail"


def classify(error: BaseException) -> tuple[str, str]:
    """(level, reason) for an error raised while opening a link."""
    if isinstance(error, urllib.error.HTTPError):
        code = error.code
        if code in GONE:
            return FAIL, f"HTTP {code}"
        if code in BLOCKED:
            return WARN, f"HTTP {code}, the site refuses scripts; open it in a browser"
        return FAIL, f"HTTP {code}"  # 5xx counts only after the retry in check_link
    reason = getattr(error, "reason", error)
    if isinstance(reason, socket.gaierror):
        # A sandbox or a proxy without DNS cannot resolve real hosts either.
        return WARN, "host not resolved here; open it in a browser"
    if isinstance(reason, (ssl.SSLError, ssl.CertificateError)):
        return WARN, "TLS handshake failed here; open it in a browser"
    if isinstance(reason, (TimeoutError, socket.timeout)) or isinstance(error, (TimeoutError, socket.timeout)):
        return WARN, "timeout; open it in a browser"
    text = str(reason)
    if "Tunnel connection failed" in text or "403" in text:
        return WARN, "a proxy refused the connection; open it in a browser"
    if isinstance(reason, ConnectionError) or isinstance(error, ConnectionError):
        return WARN, f"{type(reason).__name__}; open it in a browser"
    return WARN, f"{type(error).__name__}: {text[:80]}; open it in a browser"


def fetch(url: str) -> None:
    """Open the link like a browser (redirects followed); raises on failure."""
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    with urllib.request.urlopen(req, timeout=15) as r:
        r.read(1)


def check_link(url: str, opener=fetch, pause: float = 1.0) -> tuple[str, str]:
    """(level, reason) for one link; a failure is retried once before it counts."""
    result = (OK, "")
    for attempt in range(2):
        try:
            opener(url)
            return OK, ""
        except Exception as error:  # noqa: BLE001
            result = classify(error)
            if result[0] == WARN and "refuses scripts" in result[1]:
                return result  # the site answered; a retry will not change it
        if attempt == 0 and pause:
            time.sleep(pause)
    return result


def opens(url: str) -> str:
    """Kept for callers of the old API: '' when the link is not a FAIL."""
    level, reason = check_link(url)
    return reason if level == FAIL else ""


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

    unverified = 0
    if not a.offline:
        for u in sorted(used):
            level, reason = check_link(u)
            where = ", ".join(sorted(used[u]))
            if level == FAIL:
                print(f"FAIL  {reason}: {u}  (used in {where})")
                fail = True
            elif level == WARN:
                print(f"WARN  not verified ({reason}): {u}  (used in {where})")
                unverified += 1
    if unverified:
        print(f"{unverified} link(s) could not be verified from here: open each in a browser "
              "and note in the review that it opens.")
    print("Done." if not fail else "Fix the FAIL lines.")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
