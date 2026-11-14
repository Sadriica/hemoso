# Content formats (written Saturday 9:00 to 10:00)

The agreement between biologists and engineers: which files the solution reads,
their exact format, and who owns each one. **Empty until the team chooses the
solution on Saturday** (task T-06). Engineers write the code to read these
files as they are; nobody changes a format alone.

Fill each section below in the meeting. Keep it short: one table per file.

## 1. Files and owners
| File in `config/` | What it holds | Owner | Checked by |
| --- | --- | --- | --- |
| | | | |

Default folders, changeable in the meeting: Bio 1 `config/content/`, Bio 2
`config/rules/`, Phys `config/data/`. If they change, update the paths in the
agent files and in `scripts/precheck.py` the same hour.

## 2. Identifiers
The ids every file uses (measurements, systems, states…), with unit and
direction. Use them exactly; do not invent others.

| id | Name | Unit | Notes |
| --- | --- | --- | --- |
| | | | |

## 3. One section per file
For each file: purpose, columns or keys in order, one valid example, the rules
that make it valid, and where each value's source goes.

## 4. How content is checked
The command or test that validates these files, and which failures block a
merge (missing file, unknown id, statement without source).
