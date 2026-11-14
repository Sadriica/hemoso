# config/ · biologists and physics

Health content and data the solution reads. The file formats are in
`FORMATS.md` (a draft); its "What is missing, by person" section lists what
each person still has to send. `python scripts/check_content.py` checks these
files against `FORMATS.md` before every merge.

| Folder | Owner |
| --- | --- |
| `content/` | Bio 1 |
| `rules/` | Bio 2 |
| `data/` | Phys |

If `FORMATS.md` changes these folders, update the agent files and
`scripts/precheck.py` the same hour.
