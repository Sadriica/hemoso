# Frontend review · block B (Sat 14 15:00)

Snapshot reviewed: uncommitted block B on branch `eng2` (content loader,
domain, `AttentionBadge`, `Disclosure`, `Home`). opencode was still editing
`src/content/markdown.ts` during the review, so re-check that file.

Checked with: code reading of every file in `src/`, `pnpm lint`, `pnpm test`,
`pnpm build`, and a Playwright pass (skill `webapp-testing`) on `vite preview`
at 1280 × 800 and 320 × 700 with axe-core 4.10.2 (WCAG 2 A/AA, 2.1 AA, best
practice). Suspected bugs were confirmed with a throwaway test outside the repo.

## Result
| Check | Result |
| --- | --- |
| Lint | Pass |
| Unit tests | 63 of 63 pass, 12 files |
| Build | Pass, 235.6 kB JS (74.1 kB gzip) |
| Console errors | None, desktop and phone |
| axe | 0 violations, desktop and phone |
| 320 px width | No sideways scrolling |
| Keyboard | Skip link, person picker, tab, panel, Sources: all reachable, focus ring 3 px visible |
| Architecture rules | Screens do not call `fetch`, storage or `import.meta.glob`; no HTML injection; all texts in `strings.ts` |

The structure follows `frontend-architecture.md`: pure parsers, problems
collected instead of thrown, placeholder fallback, badge with icon and text.
The problems below are in content handling; each one would show up as soon as
Phys, Bio 1 and Bio 2 put real files in `config/`.

## Problems found (all confirmed)
| # | Severity | Where | Problem | Effect |
| --- | --- | --- | --- | --- |
| 1 | High | `domain/source.ts` | A source cell with several links separated by a space (the table rule in `STANDARDS.md` 6) returns null | The row is reported as having no source and every link is dropped |
| 2 | High | `content/entries.ts`, `screens/Home.tsx` | A demo row whose unit differs from the indicator is reported but kept; Home prints the value with the indicator's unit | `98.6` in °F shows as `98.6 °C` |
| 3 | High | `content/rules.ts` | An empty `attention_level` is accepted with no problem | The badge shows an icon and no text, so the state is carried by colour and icon only (REQ-15) |
| 4 | Medium | `domain/attention.ts` | With two `above` rules (for example 100 and 120), the first row in the file wins | A value of 130 gets the milder level if that row comes first |
| 5 | Medium | `content/entries.ts`, `screens/Home.tsx` | Values are stored as numbers, so `38.0` is shown as `38` | Breaks "report the precision the source gives" (`STANDARDS.md` 3) |
| 6 | Medium | `content/markdown.ts` | Lines in "Measurement steps" that are not `1. …` (bullets, wrapped lines) are dropped with no problem | Steps disappear silently |
| 7 | Medium | `content/markdown.ts` | A section marked "Assumption" loses that mark once the file has any source link | A statement without a source looks sourced |
| 8 | Medium | `content/*.ts` | Missing required columns are not reported (a file without `unit` gives empty units) | Silent empty values instead of a clear problem |
| 9 | Low | `content/rules.ts`, `content/indicators.ts` | `side` and `direction` are not trimmed, unlike other cells | `x, above` is rejected as unknown side ' above' |
| 10 | Low | `content/csv.ts` | A quoted cell with a line break is reported as a malformed row | Acceptable if `FORMATS.md` forbids line breaks in cells; otherwise support it |
| 11 | Low | `screens/Home.tsx` | Problems list uses the message as React key; repeated messages (same bad id on two rows) duplicate keys | React warning; one line may not update |
| 12 | Low | `screens/Home.tsx` | The badge shows the raw `attention_level` id (`example_level`) | Not plain language for the astronaut; needs a display name agreed in `FORMATS.md` |
| 13 | Low | `screens/Home.tsx` | Sources list shows "Assumption" next to real links when one file has a source and another does not | Unclear which statement is the assumption |
| 14 | Note | placeholder data | Demo values 1 to 10 never cross the threshold of 100 | The demo cannot show an attention state until real data or a placeholder row above 100 exists |
| 15 | Note | deploy | `import.meta.glob` reads `../config/`. A CLI deploy from `frontend/` does not upload `config/`, so Vercel builds always use placeholders | With the git integration keep "Include files outside the root directory" on; with the CLI, deploy from the repository root |

Items 1, 4, 10 and 12 need a decision with the content owners (`FORMATS.md`);
the others are code fixes.

## Test cases to add
Unit tests (Vitest, next to each file). Each case first fails on the current
code where it covers a problem above.

| Id | File | Case | Expected |
| --- | --- | --- | --- |
| TC-01 | `domain/source.test.ts` | `parseSource('https://a.org https://b.org')` | Two sources (needs a `parseSources` returning a list) |
| TC-02 | `domain/source.test.ts` | `'Assumption'`, `' Assumption '`, `'assumption'`, `'ftp://x'`, `''` | Assumption, Assumption, null, null, null |
| TC-03 | `content/entries.test.ts` | Row with unit `°F` for a `°C` indicator | Row skipped, one problem |
| TC-04 | `content/entries.test.ts` | Value `38.0` | Shown as `38.0` (keep the raw text for display) |
| TC-05 | `content/entries.test.ts` | Empty `person_id` | Row skipped, one problem |
| TC-06 | `content/rules.test.ts` | Empty `attention_level` | Rule skipped, one problem |
| TC-07 | `content/rules.test.ts` | `side` written ` above` | Accepted as `above` |
| TC-08 | `content/rules.test.ts` | Two rules with the same indicator, side and threshold | One problem for the duplicate |
| TC-09 | `domain/attention.test.ts` | Rules `above 100 watch` then `above 120 act`, value 130 | Decided rule (for example the most extreme threshold wins), whatever the file order |
| TC-10 | `domain/attention.test.ts` | Value equal to the threshold, both sides | `in_range` |
| TC-11 | `domain/attention.test.ts` | Mixed `below 50` and `above 100`, values 40, 75, 110 | below level, in range, above level |
| TC-12 | `content/indicators.test.ts` | File without the `unit` column | One problem naming the missing column, no indicators |
| TC-13 | `content/indicators.test.ts` | `direction` written ` higher` | Accepted |
| TC-14 | `content/csv.test.ts` | Header repeated (`id,id`) | Error naming the duplicate column |
| TC-15 | `content/csv.test.ts` | Quoted cell with a line break | Behaviour agreed in `FORMATS.md`, tested either way |
| TC-16 | `content/csv.test.ts` | BOM, trailing spaces after the last cell, file with only a header | Parses; empty list for header only |
| TC-17 | `content/markdown.test.ts` | Step written `- step` and a wrapped line under a step | One problem each, or the wrapped line joined to the step |
| TC-18 | `content/markdown.test.ts` | Section text says "Assumption" and Sources has a link | Both kept: the link and Assumption |
| TC-19 | `content/markdown.test.ts` | Same `###` level twice | One problem |
| TC-20 | `content/markdown.test.ts` | Source line `- NASA: Risk of X: https://a.org` | Title `NASA: Risk of X` |
| TC-21 | `content/load.test.ts` | `config/content/README.md` present | Not reported as an unknown indicator |
| TC-22 | `content/load.test.ts` | Real files present for all three CSVs and every `.md` | `usingPlaceholders` false, no problems |
| TC-23 | `domain/entries.test.ts` | Two entries same day, times `09:05` and `10:00`; and day 2 `00:00` vs day 1 `23:59` | Latest is `10:00`; day 2 wins |
| TC-24 | `screens/Home.test.tsx` | Rule with attention, content text for that level | Badge text is the level's display name, next step is the content text, never an empty badge |
| TC-25 | `screens/Home.test.tsx` | Two identical problem messages | Both listed, no React key warning |
| TC-26 | `screens/Home.test.tsx` | Indicator with no entries for the person | Badge "No data" and a next step that tells what to do |
| TC-27 | `screens/Home.test.tsx` | Source link | `href` equals the URL, text is the title |
| TC-28 | `App.test.tsx` | No demo entries at all | Picker shows a clear empty state, heading does not read "Status for " |
| TC-29 | `App.test.tsx` | Change person in the picker | Home shows that person's latest values only |
| TC-30 | `strings.test.ts` | Every text in `strings.ts` | ASCII English only; none of diagnosis, disease, risk percentage, AI (T-51) |

End-to-end (Playwright, `frontend/e2e/`, T-49): home loads with no console
errors; axe has no serious or critical issue on desktop and at 320 px; the whole
page works with Tab, Enter and the arrow keys; every Sources disclosure opens
and closes by keyboard; no sideways scrolling at 320 px.

## Next steps
1. When the block B session ends, run the test cases through opencode (prompt
   in the chat), then fix problems 2, 3, 5 to 9, 11 and 13.
2. Take 1, 4, 10 and 12 to the `FORMATS.md` owners.
3. Rerun this review on the next block.
