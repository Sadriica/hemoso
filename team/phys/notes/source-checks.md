# Source check, Sun 15 Nov 11:43

`python scripts/check_sources.py` verifies links and reports the ones it cannot reach.
Seven links came back in WARN. Each was opened from this machine at **11:43**, one by
one.

| Link | Result at 11:43 | Reading |
| --- | --- | --- |
| https://www.accessdata.fda.gov/cdrh_docs/reviews/K223710.pdf | **200** | Opens. Cleared record for the blood analyser |
| https://www.med.upenn.edu/uep/astronaut.html | **200** | Opens. Unit that runs the PVT work |
| https://ntrs.nasa.gov/citations/20090029851 | **200** | Opens **without** `www.`. The `www.` form used in `config/content/reaction_*.md` fails the handshake here |
| https://academic.oup.com/milmed/article-pdf/169/8/631/21977888/milmed.169.8.631.pdf | **403** | Refuses scripts. Needs a browser |
| https://academic.oup.com/sleep/article/45/3/zsac006/6505235 | **403** | Refuses scripts. Needs a browser |
| https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse | **403** | Refuses scripts. Needs a browser |
| https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ | **TLS error** | This machine cannot establish the connection. Needs a browser |

## What this means

- **Two open** from here: the FDA record and the Penn page.
- **Three refuse automated requests** with 403. That is a bot guard, not a broken link;
  they open in a browser.
- **One fails on the handshake** (spaceappschallenge). It opened earlier in the event
  from a browser on this same network, and the organisers' site is the source of the
  challenge itself.
- **One is a path problem, not a link problem:** the NTRS record opens without `www.`
  and fails with it. Two content files use the `www.` form.

## Action

Ask Bio 1 to change `https://www.ntrs.nasa.gov/citations/20090029851` to
`https://ntrs.nasa.gov/citations/20090029851` in `config/content/reaction_lapses.md`
and `config/content/reaction_median_ms.md`. It is the same record; dropping `www.`
makes the checker verify it instead of skipping it.

Nothing else needs changing. A 403 is not a broken source.

## The two temperature lines, checked on the PDF (12:10)

NASA-STD-3001 Volume 1 Rev C, glossary, says:

> \"Hypothermia: A medical emergency ... Normal body temperature is around 98.6F (37C). Hypothermia occurs as your body temperature falls below 95F (35C).\"

So the \	emp_core_c below 35, urgent, flight_surgeon\ row is supported by the standard, and the 37 C cited in \demo_ranges.csv\ is the same sentence. Both lines stand as written.

What the standard does **not** contain: 38.0 C, and no fever line. Searches for \38.0\, \35 C\ as a decimal and \ever\ return nothing. That is why the fever row needs the NIH definition and not this document.

