---
name: report-finding
description: "How a biologist turns research into a one-page finding in docs/findings/ (claim, evidence, confidence, what it changes in the solution, limits) so every finding looks the same."
---
# Report a finding

Use it whenever research may change something in the solution: a threshold, a card
statement, a test value.

1. Copy `docs/findings/TEMPLATE.md` to
   `docs/findings/<person>-<nn>-<short-slug>.md` (next free number for that person).
2. Write ONE claim in one sentence, with number and unit (see `STANDARDS.md`, sections 3 and 5).
3. Fill the evidence table with sources you opened (skill `verify-sources`):
   short quote, type (NASA / peer-reviewed / reference), link.
4. Set the confidence with the rule in `STANDARDS.md`:
   High = NASA or two agreeing peer-reviewed sources; Medium = one
   peer-reviewed source; Low = no direct source (an Assumption).
5. "What it changes in the solution": the exact file and value, or "nothing yet".
6. Limits: what the evidence does not show.
7. Keep it to one page. Status `Draft`; ask another biologist to review it and
   set `Reviewed`; once the value is in `config/`, set `In product`.
8. Add the sources to `docs/sources.md` through Phys, and the decision to your `LOG.md`.

## Script
Create the file with `python scripts/new_finding.py <bioN> "<the claim in a few words>" --claim "<one sentence>" --board`: it picks the next number, fills the header and creates the Finding card.
