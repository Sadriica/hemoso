# Decision record

Every decision the team takes, with the reason, including what was rejected.
Before proposing a tool or approach, look here; after deciding, add a row.
Decisions: **Use** · **Plan B** · **Rejected** · **Out of scope** · **Open**.

## Team plan and tooling (decided before the event)
| Decision | What | Why |
| --- | --- | --- |
| Use | Only rules-compliant preparation in this repository before Saturday 9:00 | Space Apps: teams may study the challenges and prepare, but not start working on them before the event |
| Use | One branch and one folder per person | Work never collides; each agent knows its paths |
| Use | Merges into `main` through one pull request per branch at each checkpoint | Links and closes the cards; Eng 1 tests before merging |
| Use | GitHub's built-in Status field on the board | GitHub's automations (closed → Done) work on it |
| Rejected | A custom "Stage" status field | GitHub's automations ignore it; it duplicated Status |
| Use | Board views built from a browser prompt (Eng 1) | GitHub has no API to create views |
| Use | Team scripts in Python | Same behaviour on Linux, macOS and Windows |
| Rejected | Team scripts in shell (except `setup.sh`) | Windows users would need Git Bash for everything |
| Use | Lockfiles and frozen installs | Ranges in manifests do not pin versions |
| Use | Anything added must serve a requirement or a task | Keeps the weekend on the judged work |
| Use | No external AI services inside the solution | Team rule; also keeps it working offline |
| Use | Internal freeze Sunday 13:30; official close Sunday 23:59 local | Margin before the mentors at 14:00; the official close is the hard limit |
| Rejected | A general "no NASA logos" rule | Not in the guides as such. What applies: AI-generated content may not use or modify NASA branding, and the Space Apps brand guide for its marks |

| Use | Team name ReTardis, product name HeMoSo | ReTardis is the team registered on the Space Apps page; the submission uses it |
| Use | Five people: Bio 1 (content and pitch), Bio 2 (rules, thresholds and submission), Phys (data, NASA sources, measurement), Eng 1 (backend, merges, requirements), Eng 2 (frontend and demo) | The team changed from six to five on Saturday morning; Bio 3 and Bio 4 duties were redistributed |
| Use | Initial commit without requirements; Eng 1 writes them after checking the official page (T-05) | The first commit holds only the plan and tooling |
| Use | A separate development repository (hemoso-dev) for board, script, deploy and heavy tests only | Product work stays in this repository so its history shows who did what and when |
| Use | git credentials through  | HTTPS push with a password is refused by GitHub; this reuses the gh login |
| Use | Challenge resources read two levels deep, plus four evidence reports and NASA-STD-3001 Vol 1 Rev C () | Question 4 (when a result needs attention) has almost no in-flight thresholds in NASA sources; it must be sourced elsewhere or marked Assumption |

## Solution (from Saturday 9:00)
| Decision | What | Why | Serves |
| --- | --- | --- | --- |
| Open | The solution, its architecture and where it runs | Task T-06 | |
