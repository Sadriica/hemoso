# Board setup in the browser (prompt for a browser agent)

GitHub does not let scripts create views or edit workflows. Wambi pastes the
prompt below into a browser agent that can click in his own Chrome session right after `python scripts/board.py init`
and the two imports. It takes about 10 minutes; doing it by hand takes 15 to 20.

Before pasting:
1. Be signed in to GitHub in that Chrome profile with the account that owns the board.
2. Replace `<BOARD_URL>` with the `url` in `scripts/board.json`.
3. Stay at the computer: the agent stops and asks if something does not match.

---

```text
You are setting up a GitHub Projects (v2) board for a hackathon team. Work only
in this tab: <BOARD_URL>. I am signed in. Do not create, edit, close or delete
any issue or card, and do not change any card's field values. Only configure
views, field visibility and workflows as listed below. If the page does not
match what I describe, stop and tell me what you see instead of guessing.

How GitHub Projects works here:
- Each view is a tab at the top. "+ New view" adds one. Double-click a tab
  name to rename it. The small arrow next to the tab name opens the view menu
  with Layout (Table / Board / Roadmap), Fields, Group by, Sort by, Slice by,
  and in Board layout "Column by".
- In Table layout, the "+" at the far right of the header adds or hides
  fields. A column's "..." menu has "Hide field".
- A changed view shows a dot and a "Save" button next to its tab. Click Save
  after finishing each view.
- The filter bar is the text box above the table or board.

The project fields I created (they already exist, do not create fields):
Status, Role, Kind, Block, Priority, Work type, Req type, Criterion, Source,
Ref, Done when, Paths, Depends on, Estimate h.
"Type" (GitHub's issue type) is NOT ours: never show it.

Step 1. Remove old fields if they exist: if the project has fields named
"Stage" or "Area", open the project settings ("..." top right > Settings),
open each of those two fields and delete it. Delete nothing else.

Step 2. Rename the first tab ("View 1") to "Board" and configure it:
- Layout: Board
- Column by: Status (column order: Backlog, Todo, In progress, Review, Blocked, Done)
- Fields shown on cards: Labels, Role, Work type, Kind, Priority, Block, Ref
- Sort by: Priority, ascending
- Slice by: Role
- Save.

Step 3. New view "By person":
- Layout: Table
- Visible fields, in this order: Title, Status, Work type, Kind, Priority,
  Block, Done when, Estimate h. Hide every other field.
- Group by: Role
- Sort by: Block, then Priority
- Save.

Step 4. New view "By work type":
- Layout: Table
- Visible fields: Title, Role, Status, Priority, Block, Done when
- Group by: Work type
- Sort by: Block, then Priority
- Save.

Step 5. New view "By block":
- Layout: Table
- Visible fields: Title, Role, Work type, Status, Priority, Criterion, Estimate h
- Group by: Block
- Sort by: Priority
- If the group header offers a sum for "Estimate h", turn it on.
- Save.

Step 6. New view "Requirements":
- Layout: Board
- Filter: kind:Requirement
- Column by: Status
- Fields shown on cards: Req type, Role, Source, Priority, Criterion, Done when
- Slice by: Req type
- Save.

Step 7. New view "Needs attention":
- Layout: Table
- Filter: status:Blocked,Review
- Visible fields: Title, Role, Work type, Status, Priority, Labels
- Save.

Step 8. Workflows ("..." top right > Workflows). For each one, open it, set it
as below, and click "Save and turn on" (or "Turn on"). A red "!" means it points
to a status that no longer exists: choose the status again and save.
- Item added to project: when Issue is added, set Status to Todo
- Item closed: when Issue is closed, set Status to Done
- Pull request merged: set Status to Done
- Item reopened: set Status to In progress
- Auto-close issue: when Status is Done, close the issue
- Auto-add to project: repository = this project's linked repository,
  filter "is:issue"
Leave every other workflow as it is.

Step 9. Check and report. Open each view once and tell me:
- the tab names in order,
- for "Board": the column names and how many cards are in each,
- for "Requirements": how many cards per Req type in the slice panel,
- each workflow's state (on / off / red "!"),
- anything you could not do and why.
```

---

After the agent finishes, Wambi opens the board once to confirm and posts the
board URL in the team chat.
