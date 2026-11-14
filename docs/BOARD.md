# Project board

Every piece of work lives as a GitHub issue on one GitHub Projects board,
"HeMoSo · Space Apps 2026". Agents read and move cards with
`python scripts/board.py`; people can also use the browser.

## Who moves what

| Move | Who | When |
| --- | --- | --- |
| Create a card | Anyone (their agent) | New work appears; with `board.py new` |
| Backlog → Todo | Wambi | At each checkpoint, for the next block |
| Todo → In progress | The card's owner (their agent) | When starting it; 2 cards in progress per person at most |
| In progress → Review | The card's owner (their agent) | When the work is pushed and ready to check |
| Any → Blocked | The card's owner | When stuck; post the blocker in the chat and in `team/<person>/README.md` |
| Review → Done | Only Wambi | Through the checkpoint pull request (`board.py pr <branch>`), then `board.py sync` |
| Requirement status | Only Wambi | At each checkpoint, by what the demo actually shows |
| CHANGELOG | Only Wambi | At each merge |

## Status (board columns; GitHub's built-in field)
| Status | Meaning | Who moves it here |
| --- | --- | --- |
| Backlog | Known, not planned for the current block | Whoever creates it; requirements start here |
| Todo | Planned for the current or next block | Wambi, at checkpoints |
| In progress | The owner is working on it now (2 per person at most) | The owner |
| Review | Pushed to the owner's branch; waiting for a second person or `@reviewer` | The owner |
| Blocked | Cannot move; reason in a comment and in `team/<person>/README.md` | The owner |
| Done | Tasks: merged into `main`. Requirements: shown in the demo and checked by Wambi | GitHub (issue closed by the merge) or Wambi |

GitHub's built-in workflows ("..." top right > Workflows), checked once after `init`.
A red "!" means a workflow points to a status that no longer exists: open it,
pick the status again and save.

| Workflow | Setting |
| --- | --- |
| Item added to project | On · Status: Todo (the script then sets Backlog for requirements) |
| Item closed | On · Status: Done |
| Pull request merged | On · Status: Done |
| Item reopened | On · Status: In progress |
| Auto-close issue | On (a card moved to Done closes its issue) |
| Auto-add to project | On · filter `is:issue` (issues created in the browser join the board) |

## Fields (every option has a color and a description on the board)
| Field | Values | What it answers |
| --- | --- | --- |
| Status | Backlog, Todo, In progress, Review, Blocked, Done | Where is it? |
| Role | Bio 1 · Health content and pitch, Bio 2 · Rules and submission, Phys · Data, NASA and measurement, Eng 1 · Wambi · Backend, merges, requirements, Eng 2 · Juli · Frontend and demo | Who owns it? |
| Kind | Task, Requirement, Bug, Finding, Question | What kind of card is it? |
| Block | B0 Sat 9-10, B1 Sat 10-12, B2 Sat 13:30-17, B3 Sat 17-1, Night Sun 1-8, B4 Sun 9-12, Submit Sun 12-14 | When must it be done? |
| Priority | P0 must, P1 should, P2 nice | What gets cut first (P2, then P1)? |
| Work type | Research, Content, Data, Backend, Frontend, Testing, Requirements, Pitch, Submission, Ops | What kind of work is it? (see below) |
| Req type | Functional, Non-functional, Submission rule | Requirements only: what kind of requirement? (see below) |
| Criterion | Impact, Creativity, Validity, Relevance, Presentation, Team ops | Which judging criterion does it feed? |
| Source | Team plan, Challenge statement, Submission guide, Judging guide, Participant FAQ, Local event, Our design | Why does it exist? (mainly requirements) |
| Ref | `T-07`, `REQ-12`, `F-bio1-03` | Its id in the task list, requirements or findings |
| Done when | One checkable sentence | How do we know it is finished? |
| Paths | Files it touches | Where is the work? |
| Depends on | `T-02`, `#14` | What must happen first? |
| Estimate h | Number | Does the block fit? (summed in the "By block" view) |

Assignees: `scripts/board.json` has a `logins` map (branch → GitHub login).
Wambi fills it on Saturday so every card is assigned to its owner.

## Work types
| Work type | What it covers | Usual owners |
| --- | --- | --- |
| Research | Reading and checking sources (papers, NASA data, guides). Output: a finding in `docs/findings/` or notes in `team/` | Bio 1-3 |
| Content | What the astronaut reads, in `config/` (formats in `FORMATS.md`) | Bio 1, Bio 2 |
| Data | Test or example data and its sources | Phys |
| Backend | Backend code and its tests | Wambi |
| Frontend | Screens and the demo path | Juli |
| Testing | Tests, cross-reviews, end-to-end demo checks, accessibility checks | Wambi, Bio 2, Juli |
| Requirements | Reading the statement and guides; `docs/requirements.md` | Wambi |
| Pitch | Script, slides, video, screenshots | Bio 1, Juli |
| Submission | The Space Apps project page | Bio 2 |
| Ops | Repo, board, merges, setup, questions, logistics | Wambi, Bio 2 |

## Requirement types (Req type)
| Req type | Meaning | Examples |
| --- | --- | --- |
| Functional | Something the solution must do | Data entry by keyboard and clicks |
| Non-functional | How well the solution must do it: usability, plain language, sources, reliability | Every medical statement has a source |
| Submission rule | Not about the product: what the submission or the event requires | Everything submitted in English; the deadline |

`docs/board/requirements.csv` starts empty. Wambi fills it on Saturday from the
official challenge page and the guides (task T-05); the `class` column says
whether each row is a challenge obligation, an optional consideration, a
delivery rule or an event operation. The solution's own requirements come after
the team chooses it.

## Labels
| Label | Meaning |
| --- | --- |
| `bio1`, `bio2`, `phys`, `eng1`, `eng2` | Owner (a card can have two owners) |
| `type:task` | Work with a clear "done when" |
| `type:requirement` | Something the challenge or the submission requires (`docs/requirements.md`) |
| `type:bug` | Something broke, or the demo path fails |
| `type:finding` | Research that may change HeMoSo (`docs/findings/`) |
| `type:question` | Needs a decision or an answer from the organizers |
| `P0`, `P1`, `P2` | Priority, also visible in the repository's issue list |
| `work:research`, `work:content`, `work:data`, `work:backend`, `work:frontend`, `work:testing`, `work:requirements`, `work:pitch`, `work:submission`, `work:ops` | Work type |
| `req:functional`, `req:non-functional`, `req:rule` | Requirement type (requirements only) |

## Card body
`board.py` writes the same body on every card:
- A summary table: owner, kind, requirement type (requirements), block, priority, work type and judging criterion, each with its meaning, plus the ref and the estimate.
- **Done when**, **Paths**, **Depends on**, **Source**.
- **How this card moves**: the flow for that kind of card.
Progress and blockers go in comments, one line each, in English.

## Rules
1. One card per unit of work that fits in one block. Larger work is split.
2. 2 cards in progress per person at most.
3. Every commit mentions its card: `docs(requirements): add the submission rules (#12)`.
   The commit that finishes it says `closes #12`. At each checkpoint Wambi
   merges every branch through a pull request (`board.py pr <branch>`), which
   lists and links the cards in Review; merging it closes them and moves them to Done.
4. Requirements are never closed by commits: Wambi moves them.
5. P0 cards never wait in Blocked for more than 30 minutes without the
   timekeeper knowing.
6. Card titles, bodies and comments are in English and follow `STANDARDS.md`
   (no AI mentions, no signatures).

## Saturday 9:00 · Wambi creates the board (about 5 minutes)
```bash
gh auth refresh -s project                     # once, adds the project scope
python scripts/board.py init --owner <github-login> --repo <github-login>/hemoso
git add scripts/board.json .github/ISSUE_TEMPLATE && git commit -m "chore(board): add board config and issue templates" && git push
python scripts/board.py import docs/board/seed-tasks.csv     # 15 plan-level cards; solution cards come from T-07
python scripts/board.py import docs/board/requirements.csv   # after Wambi writes them (T-05)
```
Then fill `"logins"` in `scripts/board.json` and commit it.

### Views and workflows (browser, about 10 minutes)
Fastest: paste the prompt in `team/eng1/notes/board-browser-setup.md` into a
browser agent signed in to GitHub; it builds the views and fixes the workflows,
then reports what it did. By hand: `python scripts/board.py views` prints the steps.

Why the fields do not show at first: GitHub adds every new project field
hidden in existing views, including its own Labels column. Open the "+" at
the right of a table header: the list under "Project fields" (Role, Kind,
Block, Priority, Work type, Req type, Criterion, Source, Ref, Done when, Paths,
Depends on, Estimate h) is ours. "Type" above it is GitHub's issue type and we
do not use it; our card type is Kind. Each view keeps its own fields and only
remembers them after "Save".

GitHub does not let scripts create views. For each one: "+ New view", pick
the layout, then use the view menu (arrow on its tab) for Fields, Column by,
Group by, Sort by and Slice by. Double-click the tab to rename it; click Save.

| View | Layout | Setup | For |
| --- | --- | --- | --- |
| Board | Board (rename "View 1") | Column by Status · cards show Labels, Role, Work type, Kind, Priority, Block, Ref · sort by Priority · slice by Role | Everyone, all day |
| By person | Table | Group by Role · fields Title, Status, Work type, Kind, Priority, Block, Done when, Estimate h · sort by Block, Priority | Status messages and shift changes |
| By work type | Table | Group by Work type · fields Title, Role, Status, Priority, Block, Done when · sort by Block, Priority | Research vs content vs testing vs front vs back at a glance |
| By block | Table | Group by Block · fields Title, Role, Work type, Status, Priority, Criterion, Estimate h · sort by Priority | Checkpoints: does the block fit? what to cut? |
| Requirements | Board | Filter `kind:Requirement` · column by Status · slice by Req type · cards show Req type, Role, Source, Priority, Criterion, Done when | Wambi and the pitch |
| Needs attention | Table | Filter `status:Blocked,Review` · fields Title, Role, Work type, Status, Priority, Labels | Timekeeper and reviewer |

## Everyday commands (people or agents)
```bash
python scripts/board.py list --person bio1               # my cards
python scripts/board.py list --status Review             # what needs review
python scripts/board.py move 12 "In progress"
python scripts/board.py move 12 Review
python scripts/board.py new "Measurement steps for sleep duration" --person bio1 --work Content --block B3 --priority P2 --done-when "Steps reviewed by Bio 2, each with a source"
python scripts/board.py pr bio1 --checkpoint "Checkpoint 1"   # Wambi: PR linked to bio1's Review cards
python scripts/board.py sync                              # Wambi, after each merge
```
