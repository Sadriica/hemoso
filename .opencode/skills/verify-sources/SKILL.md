---
name: verify-sources
description: "How to find, open, verify and cite a space-health source (NASA first) for a statement in the solution, and when to mark it as an Assumption."
---
# Verify and cite sources

## Search order
1. NASA: human spaceflight risks (https://www.nasa.gov/hrp/risks), Human
   Research Roadmap (https://humanresearchroadmap.nasa.gov/), NTRS
   (https://ntrs.nasa.gov/), OSDR (https://osdr.nasa.gov/) and the
   challenge's resources tab.
2. Peer-reviewed articles (PubMed, journals) for physiological magnitudes.
3. General physiology references (PhysioNet) only for normal ranges.

## Rules
1. Open the page before citing it and confirm it says exactly what you claim.
   A search result is not a source.
2. Cite with title and link: `- <Title>: <link>`.
3. If the source says something close but not the same, write what the source
   says, not what you wanted it to say.
4. If you find no source within 10 minutes, write the statement with
   `(Assumption, to be validated)` and record it in the person's log.
5. Never invent authors, years, titles, DOIs or numbers.
6. Add every new source to `docs/sources.md` (kept by Phys): give Phys the
   link, the value taken and the file where it is used.

## Script
`python scripts/check_sources.py` opens every link used in `config/` and `docs/findings/` and lists broken ones and the ones missing from `docs/sources.md` (`--add` appends them as rows to fill). Use `--offline` when the network is slow.
