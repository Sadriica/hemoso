"""Where are we in the weekend, and what is still open for this block?

  python scripts/now.py                    # now
  python scripts/now.py --at "Sat 15:20"   # any moment (to plan or test)
  python scripts/now.py --no-board         # without reading the board

Prints the current block, the next checkpoint and how long until it, the next
event (meals, shifts), and the P0 cards of the current block that are not Done.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

SAT = datetime(2026, 11, 14)
SUN = datetime(2026, 11, 15)


def at(day: datetime, hhmm: str) -> datetime:
    hh, _, mm = hhmm.partition(":")
    return day.replace(hour=int(hh), minute=int(mm) if mm else 0)


# (block option on the board, start, end, goal)
BLOCKS = [
    ("B0 Sat 9-10", at(SAT, "9:00"), at(SAT, "10:00"), "Setup: repo, board, setup.sh; check the challenge page"),
    ("B1 Sat 10-12", at(SAT, "10:00"), at(SAT, "12:00"), "Choose the solution, write FORMATS.md, break it into cards"),
    ("B2 Sat 13:30-17", at(SAT, "13:30"), at(SAT, "17:00"), "First working version of each part"),
    ("B3 Sat 17-1", at(SAT, "17:00"), at(SUN, "1:00"), "Complete content and tests"),
    ("Night Sun 1-8", at(SUN, "1:00"), at(SUN, "8:00"), "Fixes and polish only; sleep shifts"),
    ("B4 Sun 9-12", at(SUN, "9:00"), at(SUN, "12:00"), "Features frozen: demo, screenshots, pitch rehearsal"),
    ("Submit Sun 12-14", at(SUN, "12:00"), at(SUN, "14:00"), "Internal freeze 13:30 (official close 23:59 local), mentors at 14:00"),
]
CHECKPOINTS = [
    (at(SAT, "12:00"), "Checkpoint 1 (tag cp1)"),
    (at(SAT, "17:00"), "Checkpoint 2 (tag cp2)"),
    (at(SUN, "8:00"), "Checkpoint 3 (tag cp3)"),
    (at(SUN, "13:00"), "Final checkpoint (tag submission)"),
]
EVENTS = [
    (at(SAT, "7:00"), "Registration"),
    (at(SAT, "8:15"), "Opening"),
    (at(SAT, "9:00"), "Hackathon starts: create the repo and the board"),
    (at(SAT, "12:00"), "Lunch"),
    (at(SAT, "19:00"), "Dinner"),
    (at(SUN, "1:00"), "Shift A sleeps (Juli, Bio 1, Phys); shift B works"),
    (at(SUN, "4:30"), "Shift change: B sleeps (Wambi, Bio 2); A works"),
    (at(SUN, "8:00"), "Breakfast"),
    (at(SUN, "12:00"), "Lunch"),
    (at(SUN, "13:30"), "Internal freeze: project submitted (official close 23:59 local)"),
    (at(SUN, "14:00"), "Presentation to mentors"),
    (at(SUN, "18:00"), "Closing"),
    (at(SUN, "23:59"), "Official close of submissions (local time)"),
]


def parse_at(text: str) -> datetime:
    parts = text.split()
    if len(parts) != 2:
        sys.exit(f"Bad --at '{text}': use 'Sat 15:20' or 'Sat 9'.")
    day, hhmm = parts
    d = day.lower()
    if d.startswith("sat"):
        base = SAT
    elif d.startswith("sun"):
        base = SUN
    else:
        sys.exit(f"Unknown day '{day}' in --at: use Sat or Sun.")
    return at(base, hhmm)


def current_block(t: datetime):
    for b in BLOCKS:
        if b[1] <= t < b[2]:
            return b
    return None


def fmt(td: timedelta) -> str:
    mins = int(td.total_seconds() // 60)
    return f"{mins // 60} h {mins % 60:02d} min" if mins >= 60 else f"{mins} min"


def label(t: datetime) -> str:
    return f"{'Sat' if t.day == 14 else 'Sun'} {t:%H:%M}"


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--at", help='Moment to check, e.g. "Sat 15:20"')
    p.add_argument("--no-board", action="store_true")
    a = p.parse_args()
    t = parse_at(a.at) if a.at else datetime.now().replace(second=0, microsecond=0)

    in_weekend = t.date() in (SAT.date(), SUN.date())
    print(f"Now: {label(t) if in_weekend else t.strftime('%a %d %b %H:%M')}")
    if t < BLOCKS[0][1]:
        print(f"Before the start. Work starts in {fmt(BLOCKS[0][1] - t)} (Sat 9:00).")
    blk = current_block(t)
    if blk:
        print(f"Block: {blk[0]} · {blk[3]} · ends in {fmt(blk[2] - t)}")
    elif t >= BLOCKS[0][1] and t < BLOCKS[-1][2]:
        print("Between blocks (meal or checkpoint).")
    nxt = next((c for c in CHECKPOINTS if c[0] > t), None)
    if nxt:
        print(f"Next checkpoint: {nxt[1]} at {label(nxt[0])}, in {fmt(nxt[0] - t)}."
              f" Status messages and pushes 15 min before ({label(nxt[0] - timedelta(minutes=15))}).")
    ev = next((e for e in EVENTS if e[0] > t), None)
    if ev:
        print(f"Next event: {ev[1]} at {label(ev[0])}, in {fmt(ev[0] - t)}.")

    if a.no_board or not blk:
        return
    sys.path.insert(0, str(Path(__file__).parent))
    try:
        import board
        conf = board.load_conf()
        rows = []
        for it in board.items(conf):
            if board.field_value(it, "Block") != blk[0]:
                continue
            if str(board.field_value(it, "Priority") or "").startswith("P0") and \
                    str(board.field_value(it, "Status") or "") != "Done":
                rows.append((board.field_value(it, "Role") or "-", board.field_value(it, "Status") or "-",
                             (it.get("content") or {}).get("title", "")))
    except SystemExit as e:
        print(f"(board not read: {e})")
        return
    if not rows:
        print(f"All P0 cards of {blk[0]} are Done.")
        return
    print(f"\nP0 cards of {blk[0]} not Done ({len(rows)}):")
    for role, status, title in sorted(rows):
        print(f"  {status:<12} {role:<38} {title}")


if __name__ == "__main__":
    main()
