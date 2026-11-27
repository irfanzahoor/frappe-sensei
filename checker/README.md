# Frappe Sensei — Checker Engine

The checker implements all 35 rules in `../rules/rules.json` (FR-001 to
FR-035) as a pure, dependency-free ES module. It reads code only — it never
runs it, sends it anywhere, or stores it.

## Files

- `checker.js` — the engine. Exports `checkFiles(files, rulesData)` and
  `RULES` (the embedded rule table, used only when no rules data is passed).
- `checker.test.mjs` — the test runner (plain Node, no npm install).
- `test-cases/` — reserved for multi-file examples if a rule needs one.
  The inline examples in the test file are enough for Phase 1, so this
  folder is intentionally empty for now.

## How it works

`checkFiles(files, rulesData)` takes an array of `{ path, content }` and
returns:

```js
{
  findings: [
    { ruleId, severity, category, file, line, rule, fix, snippet }
  ],
  verdict: 'approve' | 'approve with fixes' | 'needs rework',
  summary: { blocker, major, minor, total }
}
```

- `line` is 1-based. `snippet` is the offending line, trimmed.
- Severity, category, title and fix for every finding come from
  `rules.json` when it is passed in. The embedded `RULES` table is a
  fallback copy for standalone use; `rules/rules.json` is the single
  source of truth.
- Python checks use line-based regex plus simple state (indentation
  tracking for loops, decorator + body parsing for whitelisted
  functions). JS checks use regex plus a backwards scan for the
  enclosing form handler (`setup`, `onload`, `refresh`, `validate` …).
- No `eval`, no `Function()`, no execution of user code in any form.

## Verdict rule

- Any blocker finding → `needs rework`
- Else any major finding → `approve with fixes`
- Else → `approve`

## Run the tests

```text
node checker/checker.test.mjs
```

For every rule it runs a bad example (must produce that ruleId) and a
good example (must not produce that ruleId), using the `example_bad` /
`example_good` snippets from `rules/rules.json`. Cross-file rules use
constructed file sets: FR-018 pairs a `.js` file with/without a `.py`
controller, FR-019 pairs a JS `frm.call` with a whitelisted /
unwhitelisted Python method, FR-002/FR-007/FR-015 use the file path to
fire. The runner also checks the verdict rule and exits non-zero on
any failure.

## Known limitations (Phase 1)

- **FR-002 (another app's files edited):** a path heuristic. A file is
  flagged only when its path contains `apps/frappe/`, `apps/erpnext/`,
  `apps/hrms/`, `apps/crm/` or `apps/helpdesk/`. A review submitted as
  loose snippets with no app path cannot trigger it.
- **FR-007 (Custom Field not a fixture):** flags any non-`fixtures/`
  `.py` / `.json` file that mentions a Custom Field / Property Setter.
  A comment that merely discusses custom fields can false-positive;
  the fixture path is the signal, not the code.
- **FR-012 / FR-028 (console.log, .html()):** string literals are
  stripped before checking, so a rule title or fix string that
  mentions `console.log` or `.html()` does not flag. Real code calls
  still flag.
- **FR-027 (Jinja escaping):** runs only on `.html` / `.jinja` /
  `.j2` template files, not on `.js` / `.py` files that mention
  `{{ }}` in a comment.
- **FR-015 (import in a Server Script):** fires only when the input is
  marked as a Server Script — a path containing `server_script` or
  content starting with a `Server Script` marker. Plain `.py` files
  are never flagged for imports.
- **FR-018 (JS-only validation):** a heuristic. A JS `validate`
  handler that throws is flagged unless a `.py` file in the same
  submission defines `validate` / `before_submit` / `before_insert`
  (paired by file stem, or any `.py` in the set). If only the JS file
  is submitted, it is flagged — the checker cannot prove server
  validation exists from JS alone.
- **FR-019 (method not whitelisted):** needs both sides. The JS call
  and the Python definition must be in the same submission; a lone
  Python method with no JS call is not flagged.
- **FR-023 (whitelisted method without a permission check):**
  `allow_guest=True` methods are exempt — a truly public read-only
  endpoint needs no permission check. A `get_list` call counts as a
  permission-aware read.
- **FR-030 / FR-031 (loop detection):** loops are tracked by Python
  indentation, not a full AST. Unusual formatting (one-line loops,
  semicolons) can be missed.
- **FR-032 (aggregation in Python):** flags `sum(` / `len(` outside
  string literals in a file that also calls `get_all` / `get_list`.
  SQL-side aggregation (`select sum(...)`) is not flagged.
- **FR-010 (f-string in `_()`):** also flags a named `{placeholder}`
  inside `_()` — correct form is `{0}` + `.format()`. The rule's
  `example_bad` uses that named-placeholder form.
- **FR-029 (`frappe.db.commit()`):** flags any `frappe.db.commit()`
  inside a Python function body. A commit at module top level, or in
  a file under `patches/`, is not flagged.

## Privacy

The checker runs entirely in the browser in the live tool. Submitted
code never leaves the page, is never executed, and is never stored.
