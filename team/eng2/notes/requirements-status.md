# Eng 2 · requirement status

Status of the requirements assigned to Juli (@julimejia). The first seven
columns are copied from `docs/requirements.md` (Eng 1 keeps them); the last
four are added here. Wambi moves the requirement cards; this file is the
evidence for each move.

Updated Sat 14 Nov 17:00 on `eng2` at 3329dfd plus uncommitted H iteration 2
(274 tests, lint, `tsc -b` and build pass).

How "Dev" is set: the share of the "Done when" line that can be seen in the
code now. Work on `eng2` counts; a requirement is ready to close only when it
is on `main` and at the public link.

Summary: 8 requirements, 0 ready to close, average 51 %. REQ-02 is complete on
`eng2` and closes with the 17:00 merge.

| ID | Requirement | Class | Priority | Owner (GitHub) | Block | Done when | Dev | Seen now | Missing | Cards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | A visual tool astronauts use to assess their own health and act on its status: the screens | challenge | P0 | Juli (@julimejia) | B2 Sat 13:30-17 | On one screen the astronaut sees the status of each indicator they track and a clear next step; content comes from config/ (REQ-26) | 70 % | Home shows the real indicators from `config/data/indicators.csv` with reading, unit, day and time; "No threshold yet" and a CMO next step while no rule exists; every source link read; who to tell shown from `notify` (4d098f3) | Bio 2 thresholds and Bio 1 texts on `main`; merge to `main` | #11, T-53, T-47 |
| REQ-02 | Gather health indicators from user input: keyboard and clicks; camera or images are optional | challenge | P0 | Juli (@julimejia) | B2 Sat 13:30-17 | Every chosen indicator can be entered without special hardware; units shown at entry | 95 % | Entry screen: number field with the unit beside it, 1-to-5 radios for the two scales, 24-hour time, saved entry shows on Home (6005d58, 45539ea, 152965c) | Merge to `main` | #13, T-42 |
| REQ-12 | History view: each indicator against the person's own earlier values | context | P1 | Juli (@julimejia) | B3 Sat 17-1 | Each indicator has a history view comparing with that astronaut's own earlier values, reading the stored history (REQ-27) | 0 % | Backend history function on `main` (REQ-27) | History screen and chart with a text alternative | #23, T-45, T-46 |
| REQ-15 | Readable and usable without colour alone or a mouse | optional | P1 | Juli (@julimejia) | B3 Sat 17-1 | Every state has text or an icon besides colour; the demo path works by keyboard | 60 % | Badge with icon and text; control borders 3:1; 38 contrast checks pass; one Tab from the Entry tab reaches the first field | Keyboard demo path over Home and Entry with axe on every screen | #26, T-49 |
| REQ-28 | Interface works offline and shows what is waiting to be sent | context | P1 | Juli (@julimejia) | B3 Sat 17-1 | The app opens and works with the network off after the first load; pending items and the last sync time are visible | 65 % | Browser outbox (70cb8b6); sync client and status: waiting count, last sent, online or offline chip, "No server set up for this demo", no "Send now" without a server (ee11cee; layout fix uncommitted at 17:00) | Offline load after the first visit; warning M1; wording: "Nothing waiting to be sent" and "Not sent yet" repeat each other (T-51) | #44, T-43, T-44, T-48 |
| REQ-30 | The app interface is in English | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | Every screen, label and message of the app in English | 70 % | Every string in `src/strings.ts` is English | Wording pass; raw person id `demo_astronaut_1` on screen | #46, T-51 |
| REQ-31 | Demo video recorded with English subtitles and a public link | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | Video of 30 s or less recorded from the app, English subtitles burned in, hosted outside Space Apps, link opens with no password, permission or registration | 0 % | — | Recording, subtitles, public link; hide "Content problems" first | #47, T-52, T-16 |
| REQ-32 | Running app published at a public link | delivery | P0 | Juli (@julimejia) | B4 Sun 9-12 | The app opens at a public link in a private window with no login, on desktop and phone | 45 % | https://hemoso.vercel.app opens with no login; no sideways scroll at 320 px and 375 px (checked 17:00, uncommitted fix) | Serves the 12:00 build until `eng2` is on `main`; check on a real phone (T-50) | #48, T-50 |

## Proposed, waiting for Wambi
Not counted in the summary until Wambi gives it a number in
`docs/requirements.md`. Proposal: `team/eng2/notes/face-login-proposal.md`.

| ID | Requirement | Class | Priority | Owner (GitHub) | Block | Done when | Dev | Seen now | Missing | Cards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-36 (proposed) | Sign in with the face, on the device only | optional | P2 | Juli (@julimejia) | B3 Sat 17-1 | A person can register their face once and then sign in by looking at the camera; matching runs in the browser with bundled models; no image or face data leaves the device; the person picker still works without a camera | 0 % | Proposal with a "Blocker: REQ-14" section and cards T-58, T-59 committed (3329dfd); T-58 depends on the REQ-14 exception | Wambi's number; a `docs/DECISIONS.md` row choosing Use (exception, REQ-14 done-when updated) or Rejected (stays out of the product) | T-58, T-59 |

Points to settle before T-58 starts:
| Point | Why it matters | Who decides |
| --- | --- | --- |
| REQ-14 says "no real personal data in the repository or the app" | A face descriptor of a real team member is biometric personal data, even kept only in `localStorage`. REQ-14 needs a written exception: real data allowed only for this feature, on the device, deletable, never committed or sent | Wambi (REQ-14 owner) |
| The descriptor stays in `localStorage` only | Never in the repository, the API, logs or the demo data; "Delete my face data" removes it | Juli (T-59) |
| The demo uses an adult team member who agrees | REQ-22: no person under 18 in any image or clip | Bio 1 (REQ-22) |
| A convenience picker, not a security control | A photo can fool it; the consent text and the README say so, so the pitch does not claim security | Juli, Bio 1 (pitch) |
| `@vladmandic/face-api` 1.7.15 (MIT) is the last release, from 5 Feb 2025, and unpacks to 23.6 MB with TensorFlow.js | Load only when "Sign in with face" opens; offline sign-in needs the models cached (T-48), otherwise the picker is the fallback | Wambi (`docs/DECISIONS.md` row) |
| P2 while P0 work is open | REQ-31 (0 %) and REQ-32 (40 %) are P0 and due Sunday morning | Juli |

## Blocked by other owners
| Our ID | Waits on | State at 16:35 |
| --- | --- | --- |
| REQ-01 | Bio 2 `config/rules/attention.csv` (REQ-05) | Header only, not on `main` |
| REQ-01 | Bio 1 `config/content/<indicator_id>.md` (REQ-26) | Nothing pushed since 09:38 |
| REQ-12 | Wambi backend history (REQ-27) and its host | History function on `main`; host still Open |
| REQ-28 | Wambi decision on REQ-13 | Still Open in `docs/DECISIONS.md` |
| REQ-28, REQ-32 | Wambi merges `eng2` into `main` | Checkpoint 17:00 |
| REQ-31 | Bio 1 demo format and script (REQ-17) | Block B4 |

## Warning M1 for Wambi
The idempotent backend (#24, answers 200 for a known entry and 409 for a
conflict) is only on `eng1`, and `eng2` merges into `main` first. If
`VITE_API_BASE_URL` is set on Vercel before #24 is on `main`, a retry can store
the same measurement twice. Either merge #24 with or before `eng2`, or leave
the variable unset until then. Without it the app sends nothing and shows
"No server set up for this demo"; entries wait in the browser and are sent
after the variable is set and the app is deployed again.

## Change log
| Time | Change |
| --- | --- |
| 17:00 | H iteration 2 checked, uncommitted: 274 tests; sync row separated with an online chip, no sideways scroll at 320 px; REQ-28 65 %, REQ-32 45 %, average 51 % |
| 16:55 | REQ-36 proposal committed in 3329dfd; T-58 waits on Wambi's REQ-14 decision |
| 16:50 | Added REQ-36 (proposed): sign in with the face, with the points to settle; 3a1a6e5 committed this file |
| 16:35 | File created from `frontend/sdd/progress.md`, in the column format of `docs/requirements.md` |
