# Log · Eng 1 (Wambi)

One entry per decision. Newest first.

| Time | What | Why | Source | AI used |
| --- | --- | --- | --- | --- |
| Sat 14 12:45 | Architecture: the app works with a network connection. React frontend on Vercel under the team's domain, Supabase for data, FastAPI backend, probably on Railway | Team needs a public link (REQ-32) and stored history (REQ-27); the domain is ready | docs/DECISIONS.md | No: Wambi decided; the supervisor agent recorded it |
| Sat 14 12:45 | Merged eng1-formats (FORMATS.md draft, T-06) and eng1-si-ack (SI-USE.md, REQ-33) into eng1 | Both passed review, precheck and the script check | FORMATS.md, SI-USE.md | Yes: written by work agents, reviewed by the supervisor agent and Wambi |
| Sat 14 11:18 | Widened the commit-message check in `scripts/precheck.py`: it now also blocks "AI" as a word, "artificial intelligence", DeepSeek and GPT | Commit e80eda8 said "AI-use log" and passed the old check; AGENTS.md rules 8 and 9 forbid mentioning it | AGENTS.md | Yes: supervisor agent wrote and tested the change, Wambi asked for it |
| | | | | |
