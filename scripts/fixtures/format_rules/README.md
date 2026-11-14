# Shared format vectors

One JSON file per rule of `FORMATS.md`, written in plain data so the Python and
the TypeScript side of the same rule can be checked against the same cases. The
rules are implemented twice: `scripts/format_rules.py` (used by
`scripts/check_content.py`) and the frontend (`frontend/src/domain/attention.ts`,
`frontend/src/domain/source.ts`, `frontend/src/content/csv.ts`). Both suites read
these files; `scripts/test_format_rules.py` reads them today.

Every file has the same shape:

```json
{
  "rule": "attention_for",
  "source": "FORMATS.md section 3, ... (the sentence the cases come from)",
  "notes": "what is not defined by the format, and how the case resolves it",
  "cases": [
    {"name": "one matching row", "input": {"rows": [], "value": 101}, "expected": {}}
  ]
}
```

| File | `rule` | Input | Expected |
| --- | --- | --- | --- |
| `attention.json` | `attention_for` | `rows` (the attention rows of one indicator, in file order) and `value` | the winning row's `attention_level` and `notify`, or `null` when no row matches |
| `sources.json` | `parse_sources` | `cell`, one source cell | list of links, `["Assumption"]`, or `"invalid"` |
| `baseline.json` | `baseline_state` | `median`, `spread`, `value`, optional `boundary` | `no_data`, `in_range`, `outside_range` or `needs_review` |
| `csv.json` | `read_csv` | `text`, a whole CSV file | rows as lists of cells, or `"error"` |

`"invalid"` is the Python `None` and the TypeScript `null`; `"error"` means the
reader raises on that text. A case marked `"undefined_by_formats": true` covers
behaviour `FORMATS.md` does not state: the file's `source` and `notes` say where
it comes from instead, so a change there is a decision, not a bug fix.

Ids are placeholders (`example_indicator`, `example_level`). The only numbers
from a real decision are the nine cases of `baseline.json`, taken unchanged from
`docs/findings/phys-02-baseline-state-rule.md`.

## From a Vitest test

```ts
import attention from '../../../scripts/fixtures/format_rules/attention.json'
import { attentionFor } from './attention'

for (const testCase of attention.cases) {
  it(testCase.name, () => {
    const got = attentionFor(testCase.input.value, testCase.input.rows)
    const winner = got.kind === 'attention'
      ? { attention_level: got.level, notify: got.rule.notify }
      : null
    expect(winner).toEqual(testCase.expected)
  })
}
```

Importing JSON needs `resolveJsonModule` in `tsconfig.json`; Vite and Vitest
resolve `.json` imports on their own. One test file per vector file, so a rule
that changes shows which side broke.

## Changing a rule

Change the rule in `FORMATS.md`, then the case here, then both implementations
and their tests; a case is never edited on its own.
