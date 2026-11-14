# Use of AI tools (SI) · running log

The submission guide asks to say where and how Super Intelligence (SI) tools were
used, and to acknowledge SI-generated code and data in descriptive text and
metadata. One row per finished card; the supervisor agent appends, Wambi checks.

| Time | Card | Files or data produced | Tool and how it helped | Reviewed by |
| --- | --- | --- | --- | --- |
| Sat 10:00–11:50 | T-05 (#5) | team/eng1/notes/challenge-resources.md, docs/CHALLENGE.md | Assistant read the challenge resources, four NASA evidence reports and NASA-STD-3001 and drafted the notes | Wambi |
| Sat 10:20–11:20 | T-05 (#5) | docs/requirements.md, docs/board/requirements.csv | Assistant drafted the general requirements from the statement and the guides; the team set owners | Wambi |
| Sat 10:40–11:20 | T-01, T-08 (#1, #8) | scripts/board.py, scripts/precheck.py | Assistant wrote fixes (retries, no duplicate cards, owner sync, path checks) | Wambi |
| Sat 11:00 | T-08 (#8) | team/eng1/notes/orca-supervisor-prompt.md | Assistant drafted the supervisor prompt for the work agents | Wambi |
| Sat 12:31–12:40 | T-06 (#6) | FORMATS.md (draft) | Assistant drafted the config file formats from the team's solution paragraph; Wambi's supervisor agent reviewed it twice and sent back seven fixes | Wambi |
| Sat 12:30–12:40 | REQ-33 (#49) | SI-USE.md, scripts/si_use.py, scripts/precheck.py | Assistant wrote the acknowledgement file and the script that copies this log into it; quote checked against the submission guide | Wambi |
| Sat 12:50–13:15 | T-08 (#8) | .github/workflows/checks.yml, docs/deploy/pages.yml | Assistant wrote the checks workflow and pinned each action to its current release; versions checked against GitHub | Wambi |
| Sat 12:50–13:20 | REQ-14 (#25) | scripts/precheck.py, scripts/test_precheck.py, .gitignore, docs/PRIVACY.md | Assistant added the secrets check before push, its tests and the privacy page | Wambi |
