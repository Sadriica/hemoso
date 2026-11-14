---
name: challenge-requirements
description: "How to turn the challenge statement and the Space Apps guides into requirements with an ID, a verification method and an owner."
---
# Challenge requirements

1. Read the full challenge statement, the submission guide and the judging guide
   (`docs/CHALLENGE.md` has the reading notes; check them against the pages).
2. Keep `docs/requirements.md` and `docs/board/requirements.csv` in step. Each row
   has a class: challenge, optional, delivery or operations. Optional
   considerations are never written as obligations.
3. One requirement per row, verifiable ("Each indicator states when to tell the
   flight surgeon, with a source"), not a wish ("good experience").
4. Add the submission requirements: everything in English, demo of 30 s at
   most or 7 slides at most, public repository link, NASA data, AI-use disclosure.
5. Add the 5 judging criteria and which part of the solution answers each one.
6. List open questions for the organizers.
7. From Saturday, add the solution's own requirements, each naming the general
   requirement it serves; each owner confirms their row.

## Script
`python scripts/requirements_report.py --write` writes the requirement status from the board (P0 done, by requirement type, P0 still open) into `docs/requirements.md` between status markers. Run it before each checkpoint and before the pitch.
