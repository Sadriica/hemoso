# Log · Bio 2

One entry per decision. Newest first.

| Time | What | Why | Source | AI used |
| --- | --- | --- | --- | --- |
| Sat 15:18 | Three attention levels: `watch` (crew), `consult` (cmo), `urgent` (flight_surgeon) | `attention.csv` stores the actor in `notify`, so a fourth level would duplicate one of the three; the names also serve as the content headings | `FORMATS.md` section 3 (#6), `team/bio2/notes/attention-levels.md` | Yes |
| Sat 15:10 | Created `config/rules/attention.csv` and `config/rules/conditions.csv` with the header line only | The rows need an `indicator_id` from Phys (REQ-03); the files exist so the checker runs from today | `scripts/new_config.py bio2` | Yes |
| Sat 15:00 | Merged `origin/main` twice (checkpoint `cp1` and the `notify` column) | The rules format changed after the checkpoint; writing rows against the old format would be wasted work | `FORMATS.md`, commit `c1b6d54` | Yes |
| Sat 11:40 | No `config/rules/` file before `FORMATS.md` is agreed | The format fixes files, columns and owners; writing first creates a format nobody agreed to | AGENTS.md, `.opencode/agents/bio2.md` | Yes |
| Sat 11:35 | `scripts/board.json` read only from the `eng1` branch | It is Eng 1's file and is not in `main`; copying it would move another person's work | `scripts/board.py`, AGENTS.md | Yes |
| Sat 11:20 | Clone and `setup.sh bio2` with WSL git, author "Cami" <pamirestrepo@gmail.com> | Git for Windows was not installed on this machine; WSL git uses the same repository and commits stay authored by Cami | `docs/SETUP.md` | Yes |
