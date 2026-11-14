"""Eng 1 (Wambi): requirement status from the board, for checkpoints and the pitch.

  python scripts/requirements_report.py           # print the report
  python scripts/requirements_report.py --write   # also write it into docs/requirements.md

With --write the report goes between the markers
<!-- status:start --> and <!-- status:end --> in docs/requirements.md
(added at the end the first time); the rest of the file is not touched.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import board  # noqa: E402

DOC = Path("docs/requirements.md")
START, END = "<!-- status:start -->", "<!-- status:end -->"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--write", action="store_true")
    a = p.parse_args()
    conf = board.load_conf()
    rows = []
    for it in board.items(conf):
        if board.field_value(it, "Kind") != "Requirement":
            continue
        title = (it.get("content") or {}).get("title", "")
        m = re.match(r"\[([^\]]+)\]\s*(.*)", title)
        rows.append({
            "ref": m.group(1) if m else "", "title": m.group(2) if m else title,
            "status": board.field_value(it, "Status") or "Backlog",
            "type": board.field_value(it, "Req type") or "-", "role": board.field_value(it, "Role") or "-",
            "prio": str(board.field_value(it, "Priority") or "-")[:2], "block": board.field_value(it, "Block") or "-",
        })
    rows.sort(key=lambda r: r["ref"])
    if not rows:
        sys.exit("No requirement cards on the board yet.")

    p0 = [r for r in rows if r["prio"] == "P0"]
    p0_done = sum(r["status"] == "Done" for r in p0)
    shown = sum(r["status"] in ("Review", "Done") for r in rows)
    by_type = Counter(r["type"] for r in rows)
    done_type = Counter(r["type"] for r in rows if r["status"] == "Done")
    open_p0 = [r for r in p0 if r["status"] != "Done"]

    out = [f"## Requirement status ({datetime.now():%a %H:%M})", "",
           f"- P0 done: **{p0_done} of {len(p0)}** ({round(100 * p0_done / max(len(p0), 1))} %)",
           f"- Shown in the demo (Review or Done): {shown} of {len(rows)}",
           "- By type: " + ", ".join(f"{t} {done_type[t]}/{n} done" for t, n in sorted(by_type.items())),
           "", "| Ref | Requirement | Type | Priority | Block | Owner | Status |",
           "| --- | --- | --- | --- | --- | --- | --- |"]
    out += [f"| {r['ref']} | {r['title']} | {r['type']} | {r['prio']} | {r['block']} | {r['role']} | {r['status']} |"
            for r in rows]
    if open_p0:
        out += ["", "**P0 still open:** " + ", ".join(f"{r['ref']} ({r['status']})" for r in open_p0)]
    report = "\n".join(out)
    print(report)

    if a.write:
        text = DOC.read_text(encoding="utf-8") if DOC.exists() else "# Requirements\n"
        block = f"{START}\n{report}\n{END}"
        text = re.sub(re.escape(START) + ".*?" + re.escape(END), lambda _: block, text, flags=re.S) if START in text \
            else text.rstrip() + "\n\n" + block + "\n"
        DOC.write_text(text, encoding="utf-8")
        print(f"\nWrote the status into {DOC}.")


if __name__ == "__main__":
    main()
