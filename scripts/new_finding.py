"""Biologists: creates the next finding file from docs/findings/TEMPLATE.md and,
optionally, its card on the board.

  python scripts/new_finding.py bio2 "resting hr rises before symptoms"
  python scripts/new_finding.py bio2 "resting hr rises before symptoms" --claim "..." --board

Creates docs/findings/bio2-03-resting-hr-rises-before-symptoms.md (next number),
titled F-bio2-03. With --board it also creates a Finding card (work type
Research) in the current block.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

FOLDER = Path("docs/findings")


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return "-".join(s.split("-")[:6])


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("person", choices=["bio1", "bio2", "phys"])
    p.add_argument("topic", help="The claim in a few words")
    p.add_argument("--claim", default="", help="One sentence, with a number and unit when there is one")
    p.add_argument("--board", action="store_true", help="Also create its card on the board")
    a = p.parse_args()

    nums = [int(m.group(1)) for f in FOLDER.glob(f"{a.person}-*.md")
            if (m := re.match(rf"{a.person}-(\d+)-", f.name))]
    nn = f"{max(nums, default=0) + 1:02d}"
    path = FOLDER / f"{a.person}-{nn}-{slugify(a.topic)}.md"
    fid = f"F-{a.person}-{nn}"
    now = datetime.now()
    day = "Sat 14" if now.day == 14 else "Sun 15" if now.day == 15 else now.strftime("%a %d")

    text = (FOLDER / "TEMPLATE.md").read_text(encoding="utf-8")
    text = text.replace("# F-<person>-<nn> · <the claim in a few words>", f"# {fid} · {a.topic}")
    text = text.replace("<bio1 | bio2 | phys>", a.person)
    text = text.replace("Sat 14, <hh:mm>", f"{day}, {now:%H:%M}")
    if a.claim:
        text = text.replace("<One sentence, with a number and unit when there is one.>", a.claim)
    path.write_text(text, encoding="utf-8")
    print(f"Created {path} ({fid}).")

    if a.board:
        import board
        import now as clock
        blk = clock.current_block(now.replace(second=0, microsecond=0))
        conf = board.load_conf()
        url = board.create_item(conf, board.fields(conf), {
            "id": fid, "title": a.topic, "person": a.person, "type": "finding", "work": "Research",
            "block": blk[0] if blk else "B1", "priority": "P1", "paths": str(path),
            "done_when": "Evidence table filled, confidence set and reviewed by another biologist",
            "source": str(path)})
        print(f"Card: {url}")
    print("Fill Claim, Evidence, Confidence, What it changes and Limits (report-finding skill).")


if __name__ == "__main__":
    main()
