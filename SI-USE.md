# SI use in this repository

The Space Apps Project Submission Guide requires teams to say where and how
Super Intelligence (SI) tools were used, and to acknowledge SI-generated code
and data in descriptive text and metadata. The guide says:

> "Code and data: Must acknowledge SI generation in descriptive text and
> metadata." — [Project Submission Guide, "Use of Super Intelligence (SI)"](https://www.spaceappschallenge.org/resources/project-submission-guide/)

The solution idea is the team's own base idea, from Wambi (see
[docs/DECISIONS.md](docs/DECISIONS.md), "Where the idea came from"). SI was not
used for the base idea. SI helped with reading and summarising sources,
requirements and planning, wording, and code.

The table lists the SI-assisted code and data in this repository, one row per
finished card. It is copied from
[team/eng1/notes/si-use-log.md](team/eng1/notes/si-use-log.md) and regenerated
with `python scripts/si_use.py`. The table grows with each finished card.

<!-- SI-USE-TABLE:START -->
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
| Sat 12:50–13:30 | T-06 (#6) | scripts/check_content.py, scripts/test_check_content.py | Assistant wrote the content check from FORMATS.md and its tests; review added BOM, semicolon and decimal-comma cases | Wambi |
| Sat 12:50–13:45 | REQ-27 (#43) | backend/ (FastAPI app, storage, tests, uv.lock, supabase/schema.sql) | Assistant wrote the entries API and storage; review found a SQLite thread bug under concurrent requests and added CORS, BOM handling and the Supabase schema | Wambi |
| Sat 13:50–14:10 | T-08, REQ-18 (#8, #29) | AGENTS.md, README.md, backend/README.md, config/README.md, docs/DECISIONS.md, docs/DEPLOY.md, docs/README.md, docs/SETUP.md, docs/STACK.md | Assistant updated the docs to the current architecture and read each library licence from the installed package metadata | Wambi |
| Sat 14:05–14:35 | REQ-29 support (#45) | backend/app/seed.py, backend/tests/test_seed.py | Assistant wrote the loader for the synthetic demo data; review found a crash on rows with an extra cell and added header and column checks | Wambi |
| Sat 14:05–14:40 | REQ-27 (#43) | docs/API.md, docs/openapi.json, backend/scripts/export_openapi.py, backend/tests/test_openapi.py, scripts/precheck.py | Assistant wrote the API contract from the code and checked every example against a running server | Wambi |
| Sat 14:15–14:45 | T-06, T-08 (#6, #8) | audit of every change since 12:00, read only | A second assistant audited the afternoon's changes independently; each finding was confirmed before it was fixed | Wambi |
| Sat 14:20–14:50 | T-06, T-08, REQ-14, REQ-27 (#6, #8, #25, #43) | FORMATS.md, scripts/check_content.py, scripts/test_check_content.py, docs/DECISIONS.md, scripts/precheck.py, backend/README.md, docs/PRIVACY.md | Assistant fixed the confirmed audit findings | Wambi |
| Sat 14:10–14:55 | REQ-32 support (#48) | backend/Dockerfile, backend/Dockerfile.dockerignore, docs/DEPLOY.md | Assistant wrote the backend container and checked the image tags; review moved the build to the repository root so config/ is included. Not built here: the Docker daemon is off | Wambi |
| Sat 14:35–15:00 | REQ-27 (#43) | backend/app/models.py, backend/tests/conftest.py, backend/tests/test_api.py, docs/API.md | An end-to-end run found two bugs (tests reading the real config/, NaN giving a 500); assistant fixed both with tests | Wambi |
| Sat 15:05–15:25 | T-07 (#7) | scripts/new_config.py, scripts/test_new_config.py, scripts/check_content.py | Assistant wrote the script that creates each person's empty config files with headers taken from the content check | Wambi |
| Sat 15:05–15:20 | T-06 (#6), REQ-05 (#16) | FORMATS.md, scripts/check_content.py, scripts/test_check_content.py, AGENTS.md, docs/STACK.md | Assistant added the notify column and the escalation check Bio 2 asked for, with tests; aligned rule 8 with SI-USE.md | Wambi |
| Sat 15:00–15:20 | REQ-27, REQ-32 support (#43, #48) | backend/app/*, backend/tests/*, backend/Dockerfile, backend/README.md, docs/API.md, docs/openapi.json, docs/DEPLOY.md | A second assistant audited main; another fixed the backend findings (input limits, strict types, CSV spaces, Supabase key header, 502 on storage errors, BuildKit note) | Wambi |
| Sat 15:05–15:25 | T-08 (#8) | scripts/precheck.py, scripts/test_precheck.py | Assistant fixed precheck so a person who pulls main is checked only on their own commits, and the secret scan covers pushed history; tested on the real bio1 branch | Wambi |
| Sat 15:05–15:30 | T-08 (#8) | scripts/board.py, status.py, requirements_report.py, check_content.py, check_sources.py, now.py, new_finding.py, their tests, .github/workflows/checks.yml | Assistant fixed the script findings of the audit (Windows encoding, missing gh, BOM, safe titles) and runs the script tests on Windows, macOS and Linux | Wambi |
<!-- SI-USE-TABLE:END -->
