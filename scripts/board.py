"""HeMoSo board: GitHub Projects from the terminal (wraps the gh CLI).

Wambi runs `init` once on Saturday at 9:00; everyone (and every agent) uses
the other commands. Run from the repository root.

  python scripts/board.py init --owner <login> --repo <login>/<repo>
  python scripts/board.py upgrade [csv ...]           # bring an older board to this structure (CSVs fill work and req type by Ref)
  python scripts/board.py import <file.csv>          # seed tasks or requirements
  python scripts/board.py new "<title>" --person bio1 --work Research --block B1 [--priority P1] [--type task] [--req-type Functional] [--done-when "..."]
  python scripts/board.py move <issue-number> "<Status>"  # Backlog | Todo | In progress | Review | Blocked | Done
  python scripts/board.py list [--person bio1] [--status Review]
  python scripts/board.py pr bio1 --checkpoint "Checkpoint 1"  # Wambi: PR linked to the branch's Review cards
  python scripts/board.py sync                       # closed issues -> Done (Wambi, after each merge)
  python scripts/board.py export [file.csv]          # backup of the whole board (Wi-Fi or GitHub down)
  python scripts/board.py views                      # how to build the board views in the browser

Requires: gh logged in with the project scope (`gh auth refresh -s project`).
"""

from __future__ import annotations

import argparse
import hashlib
import csv
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

CONF = Path(__file__).with_name("board.json")

# ---------- what the board knows about this hackathon ----------

# branch: (label color, label description, Role option, Role color, Role description)
PEOPLE = {
    "bio1": ("1D7A3A", "Bio 1 · health content and pitch", "Bio 1 · Health content and pitch", "GREEN",
             "Health content the astronaut reads: the five questions per indicator, measurement steps. Then pitch script and slides. Owns config/content/"),
    "bio2": ("2E8B57", "Bio 2 · rules, thresholds and submission", "Bio 2 · Rules and submission", "GREEN",
             "When a change needs attention, what to check and do, thresholds with sources. Then submission page and AI disclosure. Owns config/rules/"),
    "phys": ("3CB371", "Phys · data, NASA sources and measurement", "Phys · Data, NASA and measurement", "GREEN",
             "NASA data and resources, docs/sources.md, how each value is measured in flight and its limits, any test data. Owns config/data/"),
    "eng1": ("1F4E9C", "Eng 1 (Wambi) · integrator, backend and requirements", "Eng 1 · Wambi · Backend, merges, requirements", "BLUE",
             "Backend, FORMATS.md with the team, requirements, merges into main, CHANGELOG, board; moves task and requirement cards"),
    "eng2": ("3A7BD5", "Eng 2 (Juli) · frontend and demo", "Eng 2 · Juli · Frontend and demo", "BLUE",
             "Frontend, demo path, accessibility, screenshots and video"),
}
# type: (label color, label description, Kind option, Kind color, Kind description)
TYPES = {
    "task": ("BFD4F2", "A unit of work with a clear done-when", "Task", "BLUE",
             "Work that fits in one block and has a checkable done-when. Closed by a commit with closes #N, Done when Wambi merges"),
    "requirement": ("5319E7", "Something the challenge or the submission requires", "Requirement", "PURPLE",
                    "Something the statement, the submission guide or the judging guide asks for. Never closed by commits; Wambi moves it when the demo shows it"),
    "bug": ("D73A4A", "Something that worked and broke, or the demo path fails", "Bug", "RED",
            "Something that worked and broke, or a step of the demo path that fails. P0 if it breaks the demo"),
    "finding": ("0E8A16", "Research that may change the solution (docs/findings/)", "Finding", "GREEN",
                "A research result in docs/findings/ that may change a value or text in config/. Reviewed by another biologist"),
    "question": ("FBCA04", "Needs a decision or an answer from the organizers", "Question", "YELLOW",
                 "Needs a team decision or an answer from mentors or organizers. Closed when answered and logged"),
}
PRIORITY_LABELS = {"P0": "B60205", "P1": "D93F0B", "P2": "C5DEF5"}
LABEL_COLORS = {"GRAY": "D4D4D4", "BLUE": "1D76DB", "GREEN": "0E8A16", "YELLOW": "FBCA04",
                "ORANGE": "D93F0B", "RED": "B60205", "PINK": "E99695", "PURPLE": "5319E7"}

STATUS = [
    ("Backlog", "GRAY", "Known, not planned for the current block. Wambi pulls it to Todo at a checkpoint"),
    ("Todo", "BLUE", "Planned for the current or next block. The owner starts it"),
    ("In progress", "YELLOW", "The owner is working on it now. 2 per person at most"),
    ("Review", "PURPLE", "Pushed to the owner's branch; waiting for the other biologist, the other engineer or @reviewer"),
    ("Blocked", "RED", "Cannot move. Reason in a comment and in team/<person>/README.md. P0 blocked > 30 min: tell the timekeeper"),
    ("Done", "GREEN", "Tasks: merged into main. Requirements: shown in the demo and checked by Wambi"),
]
BLOCKS = [
    ("B0 Sat 9-10", "GRAY", "Setup: repo, board, setup.sh; check the challenge page; questions to the local lead"),
    ("B1 Sat 10-12", "BLUE", "Choose the solution, write FORMATS.md, break it into cards. Checkpoint 1 at 12:00 (tag cp1); lunch 12:00"),
    ("B2 Sat 13:30-17", "GREEN", "First working version of each part. Checkpoint 2 at 17:00 (cp2)"),
    ("B3 Sat 17-1", "YELLOW", "Complete content and tests; dinner 19:00. Requirements re-checked"),
    ("Night Sun 1-8", "PURPLE", "Shifts A (Juli, Bio 1, Phys) and B (Wambi, Bio 2): fixes and polish only. Checkpoint 3 at 8:00 (cp3)"),
    ("B4 Sun 9-12", "ORANGE", "Freeze features. Demo recording, screenshots, pitch rehearsal, final texts"),
    ("Submit Sun 12-14", "RED", "Internal freeze 13:30 (tag submission); official close 23:59 local. Mentors at 14:00"),
]
PRIORITIES = [
    ("P0 must", "RED", "The demo or the submission breaks without it. Never cut"),
    ("P1 should", "ORANGE", "Makes the project clearly better. Cut second"),
    ("P2 nice", "GRAY", "Only if there is time. Cut first"),
]
# Work type: what kind of work the card is. (name, color, description, label slug)
WORK_TYPES = [
    ("Research", "GREEN", "Reading and checking sources: papers, NASA data, guides. Output: a finding in docs/findings/ or notes in team/", "research"),
    ("Content", "GREEN", "Text the astronaut reads, in config/ (formats in FORMATS.md)", "content"),
    ("Data", "YELLOW", "Test or example data and its sources (config/data/)", "data"),
    ("Backend", "BLUE", "Backend code and its tests (backend/)", "backend"),
    ("Frontend", "BLUE", "React screens and the demo path (frontend/)", "frontend"),
    ("Testing", "ORANGE", "Tests, cross-reviews, end-to-end demo checks, accessibility checks", "testing"),
    ("Requirements", "PURPLE", "Reading the statement and guides and keeping docs/requirements.md and requirement cards", "requirements"),
    ("Pitch", "PINK", "Script, slides, video and screenshots (submission/)", "pitch"),
    ("Submission", "RED", "The Space Apps project page: texts, links, NASA data, AI disclosure", "submission"),
    ("Ops", "GRAY", "Repo, board, merges, setup, questions to organizers, logistics", "ops"),
]
# Old Area values (CSV column "area") -> work type
AREA_TO_WORK = {"Scenario": "Data", "Validation": "Testing"}
# Requirement type, only for Kind = Requirement. (name, color, description, label slug)
REQ_TYPES = [
    ("Functional", "BLUE", "Something the solution must do: a screen, a calculation, a piece of content the user sees", "functional"),
    ("Non-functional", "PURPLE", "How well the solution must do it: usability, plain language, sources, reliability", "non-functional"),
    ("Submission rule", "RED", "Not about the product: what the submission or the event requires (English, video, links, deadline, NASA data, AI disclosure)", "rule"),
]

SOURCES = [
    ("Team plan", "GRAY", "Our work plan for the weekend"),
    ("Challenge statement", "PURPLE", "The official text of the challenge"),
    ("Submission guide", "RED", "What the project page must contain"),
    ("Judging guide", "ORANGE", "How judges score projects"),
    ("Participant FAQ", "YELLOW", "Space Apps participant rules"),
    ("Local event", "BLUE", "Medellín schedule and rules"),
    ("Our design", "GREEN", "Decisions the team takes during the event (docs/DECISIONS.md)"),
]
CRITERIA = [
    ("Impact", "GREEN", "How much it could improve astronaut health monitoring"),
    ("Creativity", "PINK", "How new or original the approach is"),
    ("Validity", "BLUE", "Scientifically sound, sourced and working"),
    ("Relevance", "PURPLE", "How directly it answers the challenge statement"),
    ("Presentation", "ORANGE", "How clearly the team shows and explains it"),
    ("Team ops", "GRAY", "Enables the work; not judged directly"),
]
WORK_CRITERION = {"Research": "Validity", "Content": "Validity", "Data": "Validity", "Backend": "Impact",
                  "Frontend": "Presentation", "Testing": "Validity", "Requirements": "Relevance",
                  "Pitch": "Presentation", "Submission": "Relevance", "Ops": "Team ops"}
SOURCE_PREFIX = {"CS": "Challenge statement", "Challenge": "Challenge statement", "SG": "Submission guide",
                 "Submission": "Submission guide", "JG": "Judging guide", "Judging": "Judging guide",
                 "FAQ": "Participant FAQ", "Participant": "Participant FAQ", "Medellín": "Local event",
                 "Local": "Local event", "Our": "Our design"}

SELECT_FIELDS = {
    "Status": STATUS,
    "Role": [(p[2], p[3], p[4]) for p in PEOPLE.values()],
    "Kind": [(t[2], t[3], t[4]) for t in TYPES.values()],
    "Block": BLOCKS,
    "Priority": PRIORITIES,
    "Work type": [w[:3] for w in WORK_TYPES],
    "Req type": [r[:3] for r in REQ_TYPES],
    "Criterion": CRITERIA,
    "Source": SOURCES,
}
TEXT_FIELDS = ["Ref", "Done when", "Paths", "Depends on"]
NUMBER_FIELDS = ["Estimate h"]


# ---------- gh helpers ----------

def gh(*args: str, as_json: bool = False, check: bool = True):
    proc = subprocess.run(["gh", *args], capture_output=True, text=True)
    if proc.returncode != 0:
        if not check:
            return None
        sys.exit(f"gh {' '.join(args[:3])}… failed:\n{proc.stderr.strip()}")
    out = proc.stdout.strip()
    return json.loads(out) if as_json and out else out


def load_conf() -> dict:
    if not CONF.exists():
        sys.exit("scripts/board.json not found: Wambi runs `python scripts/board.py init` first.")
    return json.loads(CONF.read_text())


def save_conf(conf: dict) -> None:
    CONF.write_text(json.dumps(conf, indent=2, ensure_ascii=False) + "\n")


def fields(conf: dict) -> dict:
    data = gh("project", "field-list", str(conf["number"]), "--owner", conf["owner"],
              "--format", "json", "-L", "50", as_json=True)
    return {f["name"]: f for f in data.get("fields", [])}


def option_id(field: dict, value: str) -> str:
    v = value.strip().lower()
    opts = field.get("options", [])
    for o in opts:
        if o["name"].lower() == v:
            return o["id"]
    for o in opts:
        if o["name"].lower().startswith(v):
            return o["id"]
    sys.exit(f"'{value}' is not an option of {field['name']}: {', '.join(o['name'] for o in opts)}")


def set_field(conf: dict, item_id: str, field: dict, value, strict: bool = True) -> None:
    if value in (None, ""):
        return
    if not strict and field.get("options") and not any(
            o["name"].lower().startswith(str(value).strip().lower()) for o in field["options"]):
        print(f"  skipped: '{value}' is no longer an option of {field['name']}")
        return
    base = ["project", "item-edit", "--id", item_id, "--project-id", conf["project_id"],
            "--field-id", field["id"]]
    if field.get("options"):
        gh(*base, "--single-select-option-id", option_id(field, str(value)))
    elif field["name"] in NUMBER_FIELDS:
        gh(*base, "--number", str(value))
    else:
        gh(*base, "--text", str(value)[:1000])


def items(conf: dict) -> list[dict]:
    data = gh("project", "item-list", str(conf["number"]), "--owner", conf["owner"],
              "--format", "json", "-L", "500", as_json=True)
    return data.get("items", [])


def field_value(item: dict, name: str):
    key = name.lower().replace(" ", "")
    for k, v in item.items():
        if k.lower().replace(" ", "") == key:
            return v
    return None


# ---------- board structure ----------

def describe_options(field: dict, spec: list) -> bool:
    """Set names, colors and descriptions of a single-select field (GraphQL).

    Options that already exist (same name, any case) keep their id, so card
    values and GitHub's built-in workflows (Item closed -> Done, ...) keep working.
    """
    existing = {o["name"].lower(): o["id"] for o in field.get("options", [])}
    opts = []
    for n, c, d in spec:
        oid = existing.get(n.lower())
        id_part = f"id:{json.dumps(oid)}," if oid else ""
        opts.append(f"{{{id_part}name:{json.dumps(n, ensure_ascii=False)},color:{c},"
                    f"description:{json.dumps(d, ensure_ascii=False)}}}")
    query = ("mutation($id:ID!){updateProjectV2Field(input:{fieldId:$id,singleSelectOptions:["
             + ",".join(opts) + "]}){projectV2Field{... on ProjectV2SingleSelectField{id}}}}")
    return gh("api", "graphql", "-f", f"query={query}", "-F", f"id={field['id']}", check=False) is not None


def ensure_fields(conf: dict) -> dict:
    flds = fields(conf)
    for name, spec in SELECT_FIELDS.items():
        if name not in flds and name != "Status":
            gh("project", "field-create", str(conf["number"]), "--owner", conf["owner"], "--name", name,
               "--data-type", "SINGLE_SELECT", "--single-select-options", ",".join(s[0] for s in spec))
    for name in TEXT_FIELDS:
        if name not in flds:
            gh("project", "field-create", str(conf["number"]), "--owner", conf["owner"], "--name", name, "--data-type", "TEXT")
    for name in NUMBER_FIELDS:
        if name not in flds:
            gh("project", "field-create", str(conf["number"]), "--owner", conf["owner"], "--name", name, "--data-type", "NUMBER")
    flds = fields(conf)

    # Colors and descriptions for every option. Replacing options clears the
    # field's values, so take a snapshot first and put the values back.
    done = conf.get("described")
    if not isinstance(done, dict):
        done = conf["described"] = {}
    sig = {n: hashlib.sha1(json.dumps(SELECT_FIELDS[n]).encode()).hexdigest()[:10] for n in SELECT_FIELDS}
    pending = [n for n in SELECT_FIELDS if n in flds and done.get(n) != sig[n]]
    if pending:
        snapshot = [(it["id"], {n: field_value(it, n) for n in pending}) for it in items(conf)]
        failed = []
        for name in pending:
            if describe_options(flds[name], SELECT_FIELDS[name]):
                done[name] = sig[name]
            else:
                failed.append(name)
        save_conf(conf)
        flds = fields(conf)
        for item_id, values in snapshot:
            for name, value in values.items():
                if done.get(name) == sig[name] and value:
                    set_field(conf, item_id, flds[name], value, strict=False)
        if failed:
            print("Could not set option colors and descriptions for: " + ", ".join(failed) + ".")
            if "Status" in failed:
                print("  Set Status by hand: board > Status column menu > Edit field: "
                      + ", ".join(s[0] for s in STATUS))
    return flds


def ensure_labels(repo: str) -> None:
    for name, p in PEOPLE.items():
        gh("label", "create", name, "--color", p[0], "--description", p[1], "--force", "-R", repo)
    for name, t in TYPES.items():
        gh("label", "create", f"type:{name}", "--color", t[0], "--description", t[1], "--force", "-R", repo)
    for name, color, desc, slug in WORK_TYPES:
        gh("label", "create", f"work:{slug}", "--color", LABEL_COLORS[color], "--description", desc[:100], "--force", "-R", repo)
    for name, color, desc, slug in REQ_TYPES:
        gh("label", "create", f"req:{slug}", "--color", LABEL_COLORS[color], "--description", desc[:100], "--force", "-R", repo)
    for (_, _, desc), (short, color) in zip(PRIORITIES, PRIORITY_LABELS.items()):
        gh("label", "create", short, "--color", color, "--description", desc[:100], "--force", "-R", repo)


def install_issue_templates() -> None:
    src = Path("docs/board/issue-templates")
    dst = Path(".github/ISSUE_TEMPLATE")
    if src.is_dir():
        dst.mkdir(parents=True, exist_ok=True)
        for f in src.glob("*.md"):
            shutil.copy(f, dst / f.name)


VIEWS_HELP = """
Views (GitHub does not let scripts create views; about 5 minutes in the browser).
For each view: "+ New view" and pick the layout. Then open the view menu (the
small arrow on its tab) for "Fields", "Column by", "Group by", "Sort by" and
"Slice by". Double-click the tab to rename it. Click "Save" when the tab shows a dot.

1. "Board"  (rename "View 1" and switch its layout to Board, so it opens first)
   - Column by: Status
   - Fields on the cards: Labels, Role, Work type, Kind, Priority, Block, Ref
   - Sort by: Priority (ascending)
   - Slice by: Role  (left panel with one entry per person)
2. "By person"  (Table)
   - Group by: Role
   - Fields: Title, Status, Work type, Kind, Priority, Block, Done when, Estimate h
   - Sort by: Block, then Priority
3. "By work type"  (Table)
   - Group by: Work type  (Research, Content, Data, Backend, Frontend, Testing, ...)
   - Fields: Title, Role, Status, Priority, Block, Done when
   - Sort by: Block, then Priority
4. "By block"  (Table)
   - Group by: Block
   - Fields: Title, Role, Work type, Status, Priority, Criterion, Estimate h
   - Sort by: Priority
   - The group footer sums Estimate h: check each block fits.
5. "Requirements"  (Board)
   - Filter: kind:Requirement
   - Column by: Status
   - Slice by: Req type  (Functional, Non-functional, Submission rule)
   - Fields on the cards: Req type, Role, Source, Priority, Criterion, Done when
6. "Needs attention"  (Table)
   - Filter: status:Blocked,Review
   - Fields: Title, Role, Work type, Status, Priority, Labels

Workflows ("..." top right > Workflows). A red "!" means the workflow points to
a status that no longer exists: open it, pick the status again and save.
   - Item added to project: on, set Status to Todo (the script then sets Backlog for requirements)
   - Item closed: on, set Status to Done
   - Pull request merged: on, set Status to Done
   - Item reopened: on, set Status to In progress
   - Auto-close issue: on (moving a card to Done closes its issue)
   - Auto-add to project: on, filter "is:issue" (issues created in the browser join the board)
"""


# ---------- cards ----------

def classify_source(text: str) -> str:
    first = (text or "").strip().split(" ")[0].rstrip(":")
    return SOURCE_PREFIX.get(first, "Team plan")


def short_priority(p) -> str:
    return (str(p or "") or "P1").strip()[:2].upper()


def full_option(spec: list, value) -> str:
    v = str(value or "").strip().lower()
    if not v:
        return ""
    for name, *_ in spec:
        if name.lower() == v or name.lower().startswith(v):
            return name
    return str(value)


def work_of(row: dict) -> str:
    w = (row.get("work") or "").strip()
    if not w:
        area = (row.get("area") or "").strip()
        w = AREA_TO_WORK.get(area, area) or "Ops"
    return full_option(WORK_TYPES, w)


def req_type_of(row: dict, kind: str) -> str:
    if kind != "requirement":
        return ""
    return full_option(REQ_TYPES, row.get("req_type") or "Functional")


def labels_for(people: list[str], kind: str, row: dict) -> list[str]:
    slug = {w[0]: w[3] for w in WORK_TYPES}.get(work_of(row), "ops")
    labs = people + [f"type:{kind}", short_priority(row.get("priority")), f"work:{slug}"]
    rt = req_type_of(row, kind)
    if rt:
        labs.append("req:" + {r[0]: r[3] for r in REQ_TYPES}[rt])
    return labs


def body_for(row: dict, people: list[str], kind: str) -> str:
    block = full_option(BLOCKS, row.get("block", ""))
    prio = full_option(PRIORITIES, short_priority(row.get("priority")))
    work = work_of(row)
    rtype = req_type_of(row, kind)
    crit = row.get("criterion") or WORK_CRITERION.get(work, "Team ops")
    owners = ", ".join(PEOPLE[p][2] for p in people)
    lines = [
        "| | |", "| --- | --- |",
        f"| **Owner** | {owners} |",
        f"| **Kind** | {TYPES[kind][2]}: {TYPES[kind][4]} |",
        f"| **Block** | {block}: {dict((b[0], b[2]) for b in BLOCKS).get(block, '')} |",
        f"| **Priority** | {prio}: {dict((p[0], p[2]) for p in PRIORITIES).get(prio, '')} |",
        f"| **Work type** | {work}: {dict((w[0], w[2]) for w in WORK_TYPES).get(work, '')} |",
        f"| **Judging criterion** | {crit}: {dict((c[0], c[2]) for c in CRITERIA).get(crit, '')} |",
        f"| **Ref** | {row.get('id', '')} |",
    ]
    if rtype:
        lines.insert(4, f"| **Requirement type** | {rtype}: {dict((r[0], r[2]) for r in REQ_TYPES)[rtype]} |")
    if row.get("estimate_h"):
        lines.append(f"| **Estimate** | {row['estimate_h']} h |")
    parts = ["\n".join(lines)]
    for key, label in (("done_when", "Done when"), ("paths", "Paths"), ("depends_on", "Depends on"),
                       ("source", "Source"), ("notes", "Notes")):
        if row.get(key):
            parts.append(f"### {label}\n{row[key]}")
    if kind == "requirement":
        flow = ("Only Wambi moves this card. Backlog → Todo when it is planned; In progress while its tasks run; "
                "Review when the demo shows it; Done when Wambi has checked it in the demo.")
    else:
        flow = ("The owner moves it Todo → In progress → Review. Every commit mentions it: `(#N)`. "
                "The finishing commit says `closes #N`; it reaches Done when Wambi merges into main.")
    parts.append(f"### How this card moves\n{flow}")
    return "\n\n".join(parts)


def create_item(conf: dict, flds: dict, row: dict) -> str:
    people = [p.strip() for p in row["person"].split("+") if p.strip()]
    for p in people:
        if p not in PEOPLE:
            sys.exit(f"Unknown person '{p}'. Use: {', '.join(PEOPLE)}")
    kind = (row.get("type") or "task").strip()
    if kind not in TYPES:
        sys.exit(f"Unknown type '{kind}'. Use: {', '.join(TYPES)}")
    title = f"[{row['id']}] {row['title']}" if row.get("id") else row["title"]
    args = ["issue", "create", "-R", conf["repo"], "--title", title, "--body", body_for(row, people, kind)]
    for lab in labels_for(people, kind, row):
        args += ["--label", lab]
    for p in people:
        login = conf.get("logins", {}).get(p)
        if login:
            args += ["--assignee", login]
    url = gh(*args).splitlines()[-1]
    item = gh("project", "item-add", str(conf["number"]), "--owner", conf["owner"], "--url", url,
              "--format", "json", as_json=True)
    work = work_of(row)
    values = {
        "Status": row.get("status") or ("Backlog" if kind == "requirement" else "Todo"),
        "Role": PEOPLE[people[0]][2], "Kind": TYPES[kind][2],
        "Block": row.get("block"), "Priority": short_priority(row.get("priority")), "Work type": work,
        "Req type": req_type_of(row, kind),
        "Criterion": row.get("criterion") or WORK_CRITERION.get(work, "Team ops"),
        "Source": classify_source(row.get("source", "")) if kind == "requirement" else "Team plan",
        "Ref": row.get("id"), "Done when": row.get("done_when"), "Paths": row.get("paths"),
        "Depends on": row.get("depends_on"), "Estimate h": row.get("estimate_h"),
    }
    for name, value in values.items():
        if name in flds:
            set_field(conf, item["id"], flds[name], value)
    return url


# ---------- commands ----------

def cmd_init(a) -> None:
    install_issue_templates()
    ensure_labels(a.repo)
    proj = gh("project", "create", "--owner", a.owner, "--title", a.title, "--format", "json", as_json=True)
    conf = {"owner": a.owner, "repo": a.repo, "number": proj["number"], "project_id": proj["id"],
            "url": proj.get("url", ""),
            "logins": {"bio1": "", "bio2": "", "phys": "", "eng1": a.owner, "eng2": ""}}
    save_conf(conf)
    gh("project", "link", str(conf["number"]), "--owner", a.owner, "--repo", a.repo)
    ensure_fields(conf)
    print(f"Board created: {conf['url'] or conf['number']}")
    print("Fill the GitHub logins of the team in scripts/board.json (\"logins\") so cards get assignees.")
    print("Then commit scripts/board.json and .github/ISSUE_TEMPLATE/.")
    print("Views and workflows: paste team/eng1/notes/board-browser-setup.md into a browser agent, or follow:")
    print(VIEWS_HELP)


def cmd_import(a) -> None:
    conf = load_conf()
    flds = fields(conf)
    with open(a.file, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    for row in rows:
        print(create_item(conf, flds, row))
    print(f"{len(rows)} items created.")


def cmd_new(a) -> None:
    conf = load_conf()
    row = {"title": a.title, "person": a.person, "type": a.type, "work": a.work,
           "req_type": a.req_type, "block": a.block, "priority": a.priority, "done_when": a.done_when}
    print(create_item(conf, fields(conf), row))


def cmd_upgrade(a) -> None:
    """Bring a board made with an older board.py to this structure, keeping its values."""
    by_ref = {}
    for f in a.files:
        with open(f, encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                by_ref[r.get("id", "")] = r
    conf = load_conf()
    conf.setdefault("logins", {"bio1": "", "bio2": "", "phys": "", "eng1": conf["owner"], "eng2": ""})
    save_conf(conf)
    ensure_labels(conf["repo"])
    flds = ensure_fields(conf)
    n = 0
    for it in items(conf):
        c = it.get("content") or {}
        if not c.get("number"):
            continue
        issue = gh("issue", "view", str(c["number"]), "-R", conf["repo"], "--json", "labels,body,title",
                   as_json=True)
        labels = [l["name"] for l in issue.get("labels", [])]
        people = [l for l in labels if l in PEOPLE] or ["eng1"]
        kinds = [l.split(":", 1)[1] for l in labels if l.startswith("type:")]
        kind = kinds[0] if kinds and kinds[0] in TYPES else "task"
        body = issue.get("body") or ""

        def grab(label):
            m = re.search(rf"\*\*{label}:\*\*\s*(.+)", body) or re.search(rf"### {label}\n(.+)", body)
            return m.group(1).strip() if m else ""

        ref = re.match(r"\[([^\]]+)\]", issue.get("title", ""))
        est = field_value(it, "Estimate h") or ""
        if isinstance(est, float) and est.is_integer():
            est = int(est)
        rid = ref.group(1) if ref else ""
        src_row = by_ref.get(rid, {})
        row = {"id": rid, "person": "+".join(people), "type": kind,
               "block": field_value(it, "Block") or "", "priority": field_value(it, "Priority") or "P1",
               "work": src_row.get("work") or field_value(it, "Work type") or "",
               "area": src_row.get("area") or field_value(it, "Area") or "Ops",
               "req_type": src_row.get("req_type") or field_value(it, "Req type") or "",
               "estimate_h": est,
               "done_when": grab("Done when"), "paths": grab("Paths"), "depends_on": grab("Depends on"),
               "source": grab("Source")}
        gh("issue", "edit", str(c["number"]), "-R", conf["repo"], "--body", body_for(row, people, kind),
           "--add-label", ",".join(labels_for(people, kind, row)))
        old_stage = field_value(it, "Stage")
        status = field_value(it, "Status")
        values = {
            "Role": PEOPLE[people[0]][2], "Kind": TYPES[kind][2],
            "Work type": work_of(row), "Req type": req_type_of(row, kind),
            "Criterion": WORK_CRITERION.get(work_of(row), "Team ops"),
            "Source": classify_source(row["source"]) if kind == "requirement" else "Team plan",
            "Ref": row["id"], "Done when": row["done_when"], "Paths": row["paths"],
            "Depends on": row["depends_on"],
        }
        if not status or (old_stage and str(status).lower() != "done"):
            values["Status"] = old_stage or ("Backlog" if kind == "requirement" else "Todo")
        for name, value in values.items():
            if name in flds and value:
                set_field(conf, it["id"], flds[name], value)
        n += 1
    print(f"{n} items updated.")
    for old in ("Stage", "Area"):
        if old in flds:
            print(f"The old '{old}' field is no longer used: board > {old} column menu > Delete field.")
    print(VIEWS_HELP)


def find_item(conf: dict, number: int) -> dict:
    for it in items(conf):
        if (it.get("content") or {}).get("number") == number:
            return it
    sys.exit(f"Issue #{number} is not on the board.")


def cmd_move(a) -> None:
    conf = load_conf()
    flds = fields(conf)
    it = find_item(conf, a.number)
    oid = option_id(flds["Status"], a.status)
    status = next(o["name"] for o in flds["Status"]["options"] if o["id"] == oid)
    set_field(conf, it["id"], flds["Status"], status)
    if status == "Done":
        gh("issue", "close", str(a.number), "-R", conf["repo"])
    print(f"#{a.number} -> {status}")


def cmd_list(a) -> None:
    conf = load_conf()
    owned = None
    if a.person:
        data = gh("issue", "list", "-R", conf["repo"], "--label", a.person, "--state", "all",
                  "--json", "number", "-L", "500", as_json=True)
        owned = {d["number"] for d in data}
    rows = []
    for it in items(conf):
        c = it.get("content") or {}
        n = c.get("number")
        if owned is not None and n not in owned:
            continue
        status = field_value(it, "Status") or "-"
        if a.status and str(status).lower() != a.status.lower():
            continue
        rows.append((status, field_value(it, "Block") or "-", field_value(it, "Priority") or "-",
                     field_value(it, "Work type") or "-", field_value(it, "Kind") or "-", n, c.get("title", "")))
    order = {s[0].lower(): i for i, s in enumerate(STATUS)}
    rows.sort(key=lambda r: (order.get(str(r[0]).lower(), 99), str(r[1]), str(r[2])))
    for status, block, prio, work, kind, n, title in rows:
        print(f"{status:<12} {block:<16} {str(prio)[:2]:<3} {work:<12} {kind:<12} #{n:<4} {title}")


def cmd_sync(a) -> None:
    conf = load_conf()
    flds = fields(conf)
    closed = {d["number"] for d in gh("issue", "list", "-R", conf["repo"], "--state", "closed",
                                       "--json", "number", "-L", "500", as_json=True)}
    moved = 0
    for it in items(conf):
        n = (it.get("content") or {}).get("number")
        if n in closed and str(field_value(it, "Status") or "").lower() != "done":
            set_field(conf, it["id"], flds["Status"], "Done")
            moved += 1
    print(f"{moved} items moved to Done.")


def cmd_pr(a) -> None:
    """Open the checkpoint pull request of one branch, linked to its cards in Review."""
    conf = load_conf()
    data = gh("issue", "list", "-R", conf["repo"], "--label", a.branch, "--state", "open",
              "--json", "number,title,labels", "-L", "500", as_json=True)
    mine = {d["number"]: d for d in data
            if not any(l["name"] == "type:requirement" for l in d.get("labels", []))}
    review = []
    for it in items(conf):
        n = (it.get("content") or {}).get("number")
        if n in mine and str(field_value(it, "Status") or "").lower() == "review":
            review.append(mine[n])
    role = PEOPLE[a.branch][2] if a.branch in PEOPLE else a.branch
    lines = [f"Checkpoint merge of `{a.branch}` ({role}).", "", "Cards finished in this merge:"]
    lines += [f"- closes #{d['number']} {d['title']}" for d in review] or ["- none (work in progress only)"]
    lines += ["", "Checks before merging: tests pass, the content check passes, only owned paths changed."]
    title = f"{a.checkpoint}: {a.branch}"
    url = gh("pr", "create", "-R", conf["repo"], "--base", "main", "--head", a.branch,
             "--title", title, "--body", "\n".join(lines))
    print(url)
    print(f"After the checks: gh pr merge {a.branch} -R {conf['repo']} --merge  then  python scripts/board.py sync")


def cmd_export(a) -> None:
    """Copy of the whole board to CSV, in case GitHub or the Wi-Fi fails."""
    conf = load_conf()
    cols = ["number", "title", "url"] + list(SELECT_FIELDS) + TEXT_FIELDS + NUMBER_FIELDS
    rows = []
    for it in items(conf):
        c = it.get("content") or {}
        row = {"number": c.get("number", ""), "title": c.get("title", ""), "url": c.get("url", "")}
        for name in cols[3:]:
            v = field_value(it, name)
            row[name] = "" if v is None else v
        rows.append(row)
    rows.sort(key=lambda r: (r["number"] or 0))
    with open(a.file, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, cols)
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} cards written to {a.file}")


def cmd_views(a) -> None:
    print(VIEWS_HELP)


def main() -> None:
    p = argparse.ArgumentParser(description="HeMoSo board (GitHub Projects)")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("init"); s.add_argument("--owner", required=True); s.add_argument("--repo", required=True)
    s.add_argument("--title", default="HeMoSo · Space Apps 2026"); s.set_defaults(fn=cmd_init)
    s = sub.add_parser("upgrade"); s.add_argument("files", nargs="*"); s.set_defaults(fn=cmd_upgrade)
    s = sub.add_parser("import"); s.add_argument("file"); s.set_defaults(fn=cmd_import)
    s = sub.add_parser("new"); s.add_argument("title"); s.add_argument("--person", required=True)
    s.add_argument("--type", default="task")
    s.add_argument("--work", "--area", dest="work", required=True,
                   help="Research, Content, Data, Backend, Frontend, Testing, Requirements, Pitch, Submission, Ops")
    s.add_argument("--req-type", default="", help="For requirements: Functional, Non-functional, Submission rule")
    s.add_argument("--block", required=True); s.add_argument("--priority", default="P1")
    s.add_argument("--done-when", default=""); s.set_defaults(fn=cmd_new)
    s = sub.add_parser("move"); s.add_argument("number", type=int); s.add_argument("status"); s.set_defaults(fn=cmd_move)
    s = sub.add_parser("list"); s.add_argument("--person"); s.add_argument("--status"); s.set_defaults(fn=cmd_list)
    s = sub.add_parser("sync"); s.set_defaults(fn=cmd_sync)
    s = sub.add_parser("pr"); s.add_argument("branch"); s.add_argument("--checkpoint", default="Checkpoint")
    s.set_defaults(fn=cmd_pr)
    s = sub.add_parser("export"); s.add_argument("file", nargs="?", default="board-export.csv")
    s.set_defaults(fn=cmd_export)
    s = sub.add_parser("views"); s.set_defaults(fn=cmd_views)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
