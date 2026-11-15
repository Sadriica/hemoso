# Log · Eng 1 (Wambi)

One entry per decision. Newest first.

| Time | What | Why | Source | AI used |
| --- | --- | --- | --- | --- |
| Sun 05:52 | Pain reports and the mission start go through the API when the server has the routes: an outbox sends one POST per region to `/people/{id}/pain` (200/201 sent; 409 or 422 kept on the device and never retried; 404/405 kept and marked as waiting for the server), signing in merges `GET /people/{id}/pain` back into the device store under the key the route keeps one report per (person, region, mission day, time), and an account's mission start is read from `GET /profile` and written with `PUT /mission_start` while the device copy stays as the fallback. The demo astronaut makes no request | PR #143 is not merged, so the frontend has to work before and after the routes exist; the same person must see the same reports and the same Flight Day on the phone and on the PC (REQ-37) | docs/API.md on origin/eng2-pain-kind, PR #143, REQ-37 | Yes: written through work agents, reviewed by Wambi |
| Sat 14 12:45 | Architecture: the app works with a network connection. React frontend on Vercel under the team's domain, Supabase for data, FastAPI backend, probably on Railway | Team needs a public link (REQ-32) and stored history (REQ-27); the domain is ready | docs/DECISIONS.md | No: Wambi decided; the supervisor agent recorded it |
| Sat 14 12:45 | Merged eng1-formats (FORMATS.md draft, T-06) and eng1-si-ack (SI-USE.md, REQ-33) into eng1 | Both passed review, precheck and the script check | FORMATS.md, SI-USE.md | Yes: written by work agents, reviewed by the supervisor agent and Wambi |
| Sat 14 11:18 | Widened the commit-message check in `scripts/precheck.py`: it now also blocks "AI" as a word, "artificial intelligence", DeepSeek and GPT | Commit e80eda8 said "AI-use log" and passed the old check; AGENTS.md rules 8 and 9 forbid mentioning it | AGENTS.md | Yes: supervisor agent wrote and tested the change, Wambi asked for it |
| | | | | |
