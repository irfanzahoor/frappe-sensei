# Frappe Sensei — Checker Engine

The checker implements all 59 rules in `../rules/rules.json` (FR-001 to
FR-059) as a pure, dependency-free ES module. It reads code only — it never
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
unwhitelisted Python method, FR-056 pairs a `hooks.py` /
`patches.txt` with the module files its dotted paths name,
FR-002/FR-007/FR-015 use the file path to
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
  permission-aware read, and so do `has_permission`, `check_permission`
  (call or `check_permission=` argument) and `only_has_select/write_perm`.
  Instance methods of a DocType controller class (first argument `self`,
  inside a class inheriting from `Document` directly or through a
  `*Controller` base such as `SellingController`) are exempt, because the
  document permission context already applies — unless the method fetches
  another document by a passed-in docname/id with no permission check, in
  which case it still fires. Standalone module-level whitelisted
  functions are never exempt. (Narrowed 2026-11-27: the old version
  flagged controller `self` methods such as `has_unreserved_stock` in
  ERPNext `sales_order.py`.)
  A permission check in a helper the whitelisted method calls also
  counts — directly or transitively, up to 4 levels, across files in
  the same submission, resolving `from ... import X as Y` aliases.
  A helper in a file that was not submitted cannot be followed, so a
  thin wrapper whose helper lives elsewhere still flags; check the
  whole app when a blocker looks wrong. A function that only reads
  `frappe.get_roles()` and performs no database read or write is also
  exempt (it returns view names; the endpoints re-check permission).
  (Narrowed again 2026-11-27: the old version flagged all 8 FMC API
  wrappers, each of which delegates to a helper that checks
  permission.)
- **FR-013 (get_doc for a single field):** fires only on a plain field
  access (`.field` or `["field"]`). A method call after `get_doc`
  (`.set_status()`, `.save()`, `.insert()`, `.submit()`) is an action
  on the document, not a single-field read, and does not fire.
  Creating a document does not fire either: a dict first argument
  (`frappe.get_doc({...})`) means the document is being made, not
  read. (Narrowed again 2026-11-27: `get_doc("Quotation",
  quotation).set_status(update=True)` in ERPNext `sales_order.py`
  used to flag.)
- **FR-031 (bulk update doc-by-doc):** fires on `.save()` /
  `.submit()` inside a loop only. `.insert()` inside a loop is bulk
  creation (demo data, imports) and does not fire.
- **FR-030 / FR-031 (demo / seed / test exemption):** neither rule
  fires in files whose path contains `/demo/`, `/tests/` or `/test_`,
  or whose filename contains `seed`. Those files insert demo data in
  loops by design. Every other rule still applies there.
- **# noqa (all rules):** a `# noqa` comment on the flagged line
  suppresses the finding, for every rule. The author has deliberately
  marked that line as reviewed.
- **FR-030 / FR-031 (loop detection):** loops are tracked by Python
  indentation, not a full AST. Unusual formatting (one-line loops,
  semicolons) can be missed. Neither rule fires in demo / seed / test
  files (see above).
- **FR-032 (aggregation in Python):** fires only when the iterable
  being summed or counted comes from a database query — a direct
  `frappe.get_all` / `frappe.get_list` / `frappe.db.sql` call inside
  `sum()` / `len()`, or a variable assigned from such a call earlier in
  the same file. In-memory iterables (`self.get(...)`, `self.items`,
  `doc.items`, a plain list, or a list built from `self.get(...)`) do
  not fire. SQL-side aggregation (`select sum(...)`) is not flagged.
  (Narrowed 2026-11-27: the old version flagged any `sum()` / `len()`
  in a file that called `get_all` anywhere, e.g. sums over
  `self.get("items")` in ERPNext `sales_order.py`.)
- **FR-010 (f-string in `_()`):** also flags a named `{placeholder}`
  inside `_()` — correct form is `{0}` + `.format()`. The rule's
  `example_bad` uses that named-placeholder form.
- **FR-029 (`frappe.db.commit()`):** flags any `frappe.db.commit()`
  inside a Python function body. A commit at module top level, or in
  a file under `patches/`, is not flagged.
- **FR-036 (`.save()` in validate / before_save / on_update):** fires
  on a `.save()` call on `self` or `doc` inside one of those three
  controller methods. A flags-based recursion guard (`self.flags...`
  in the method body) exempts it — that is the guard the Impertio
  anti-patterns file itself recommends.
- **FR-037 (assignment in `on_update`):** fires on `self.<field> =`
  (and `+=` etc.) inside `on_update`. Assignments to `self.flags.*`
  and `self.db_set(...)` calls are exempt. A comparison
  (`self.x == 1`) does not fire.
- **FR-038 (validate without `super().validate()`):** scoped to
  DocType controller classes (inheriting from `Document` directly or
  through a `*Controller` base). A `validate` method in a plain class
  does not fire.
- **FR-039 / FR-040 (permission hooks):** checked only in `hooks.py`
  itself, inside a `def` named `has_permission` or
  `permission_query_conditions`. A hook function defined in a separate
  permissions module is not seen — that is a known gap.
  - **FR-040 corrected (2026-11-27):** the old rule was inverted — it
    flagged any `return True` inside a `has_permission` hook. The
    framework authors say the opposite (frappe/skills
    `skills/frappe-app-dev/SKILL.md` line 84 and deep-app-audit
    A28): a hook must return `True` for users it does not restrict,
    because Frappe treats a missing return (`None`) as a denial. The
    rule now flags a hook that can fall through to `None`: no
    `return True` anywhere in the function, a bare `return`, or a
    last top-level statement that is not a `return` (a return nested
    inside an `if` does not end the function). An `if`/`else` chain
    where every branch ends in a `return` is safe and does not fire.
    `permission_query_conditions` is not checked by FR-040.
- **FR-044 (shell injection):** string literals are stripped before
  checking, so a message mentioning `os.system()` does not fire.
  `subprocess.run([...])` with a list of arguments and `shell=False`
  does not fire.
- **FR-045 (unsafe deserialization):** `yaml.load` with
  `Loader=yaml.SafeLoader` (or `safe_load`) does not fire.
- **FR-046 (SSTI):** a literal string first argument to
  `render_template` / `Template` is safe and does not fire. A
  variable, attribute, call or f-string as the first argument fires.
- **FR-047 (delete / truncate without a filter):** a comment on the
  same line or the line above (a deliberate full-table clear, e.g.
  log rotation) exempts the call, like FR-025. A variable filter
  fires — the checker cannot tell whether it is empty at runtime.
- **FR-048 (DDL in app code):** exempt inside a patch file (a path
  containing `/patches/`) or inside `on_doctype_update`.
- **FR-049 (ledger writes):** reads (`get_value`, `get_all`,
  `get_list`) on a ledger doctype do not fire; only writes do.
- **FR-050 (monkey-patching):** exempt in test files (a path
  containing `/test` or ending in `_test.py`) and inside
  `unittest.mock.patch` blocks. Assignments to `frappe.local`,
  `frappe.flags` and `frappe.conf` are not patching and do not fire.
- **FR-051 (enqueue without `enqueue_after_commit`):** fires only
  inside a lifecycle method of a controller class or a whitelisted
  method. An `enqueue` in an ordinary helper does not fire.
- **FR-052 (`get_query` without `ignore_permissions=False`):**
  string literals are stripped before checking, so a message
  mentioning `get_query` does not fire.
- **FR-053 (misspelled lifecycle name):** fires on a wrong name
  (from B33's list of 24) or a near-miss (edit distance ≤ 2 from a
  real lifecycle name) in a controller class, and on a bad
  `doc_events` key in `hooks.py`. Ordinary helper methods do not
  fire. A near-miss check can theoretically flag a deliberately
  named helper (e.g. a method called `on_save` on purpose) — that
  is a false positive by design of the distance rule; rename it.
- **FR-054 (request state in a lifecycle method):** `form_dict`
  inside a whitelisted method does not fire — that is the normal
  pattern. `form_dict` inside a non-whitelisted helper fires.
- **FR-055 (return in `before_install`):** a bare `return` is safe
  and does not fire. A `return <value>` with a comment on the same
  line (an intentional refusal with a stated reason) is exempt.
- **FR-056 (dotted path does not resolve):** needs the whole
  submission's file list. A lone `hooks.py` with no other `.py`
  files is skipped — a single-file paste cannot resolve dotted
  paths. Paths starting with `frappe.`, `erpnext.` or `hrms.` are
  skipped (other apps, not submitted). The JS twin (A38, `frappe.call`
  targets) is not implemented — `frappe.call` targets are usually
  whitelisted method paths, not module functions, so resolving them
  the same way would flag valid code.
- **FR-057 (module-level state in `hooks.py`):** fires only on lines
  outside any `def` in `hooks.py`. The same call inside a function
  does not fire.
- **FR-058 (raw-SQL write without a cache clear):** `set_value` /
  `save` clear the cache themselves, so they never reach this check.
  A `SELECT` does not fire. The cache clear must be in the same
  function as the write.
- **FR-059 (`set_user` without restoration):** a `finally` block
  restores the user only if it contains another `set_user(` call.
  A `try`/`except` with no `finally` still fires.
- **FR-041 (`cur_frm`):** string literals are stripped before
  checking, and `//` comment lines are skipped, so a message or a
  comment mentioning `cur_frm` does not fire.
- **FR-042 (`eval` / `exec`):** string literals are stripped before
  checking, so a message mentioning `eval()` does not fire.
- **FR-043 (`enqueue` without `queue=`):** multi-line calls are
  joined (up to 10 continuation lines) before checking for `queue=`.
  A positional queue argument does not count — the rule wants the
  keyword written out.

## Privacy

The checker runs entirely in the browser in the live tool. Submitted
code never leaves the page, is never executed, and is never stored.
