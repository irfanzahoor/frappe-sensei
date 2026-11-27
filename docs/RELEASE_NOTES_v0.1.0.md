# Frappe Sensei v0.1.0 — Release Notes

**Status: prepared, not yet tagged.** The v0.1.0 tag goes on after the live-site test
(paste / GitHub tab / Copy on https://irfanzahoor.github.io/frappe-sensei/),
once GitHub Pages is enabled.

## What it is

A live web tool that reviews Frappe / ERPNext code against the
`frappe_core_skills` rules — the same report the `/frappe-review` command
gives, in the browser, with no login and no backend.

Paste code, upload `.py` / `.js` files, or give a public GitHub link, and
get a verdict (approve / approve with fixes / needs rework), a
severity-ordered findings table (blocker / major / minor), and a report
you can copy or download as Markdown.

Live URL: **https://irfanzahoor.github.io/frappe-sensei/**
(goes live once GitHub Pages is enabled: Settings → Pages → Deploy from
a branch → `main` / root).

## 43 checks, 5 categories

Placement (7), Framework APIs (14), Server vs Client (4), Security (10),
Performance (8) — FR-001 to FR-035 derived from `frappe_core_skills`
v2.3.0 (22 skills); FR-036 to FR-043 added after the v0.1.0 tag from the
Impertio-Studio/Frappe_Claude_Skill_Package review (61 skills, rule ideas
only, written in our own wording). Full list: [`docs/RULES.md`](RULES.md).

### Added after v0.1.0 — 8 rules from the Impertio review (2026-11-27)

- **FR-036 (blocker):** `.save()` inside `validate` / `before_save` /
  `on_update` — infinite recursion.
- **FR-037 (major):** assigning `self.<field>` in `on_update` is lost.
- **FR-038 (major):** overridden `validate()` without `super().validate()`.
- **FR-039 (blocker):** `frappe.throw()` / `raise` inside a permission hook.
- **FR-040 (major):** `return True` inside a `has_permission` hook.
- **FR-041 (minor):** `cur_frm` in a client script.
- **FR-042 (major):** `eval()` / `exec()` in Python code.
- **FR-043 (minor):** `frappe.enqueue()` without `queue=`.
- None of the 8 fires on ERPNext `sales_order.py` (still 8 findings) or
  on the 6 FMC files (still 4, the known FR-023 cross-file delegates).

### Added after v0.1.0 — FR-040 corrected + 16 rules from the official frappe/skills review (2026-11-27)

- **FR-040 corrected (major):** the Impertio round above got this rule
  backwards — it flagged any `return True` in a `has_permission`
  hook. The framework authors say the opposite (frappe/skills
  `skills/frappe-app-dev/SKILL.md` line 84 and deep-app-audit A28):
  a hook must return `True` for users it does not restrict, because
  Frappe treats a missing return (`None`) as a denial. FR-040 now
  flags a hook that can fall through to `None`. FR-039's good example
  was fixed in the same round (it used to end with `return None`).
- **FR-044 (blocker):** shell injection — `os.system` / `os.popen` /
  `subprocess` with `shell=True` / `execute_in_shell`.
- **FR-045 (major):** unsafe deserialization — `pickle` / `yaml.load`
  without `SafeLoader` / `marshal` / `dill` / `shelve`.
- **FR-046 (blocker):** SSTI — `render_template` / `Template` with a
  non-literal first argument.
- **FR-047 (blocker):** delete / truncate with no filter (whole table
  cleared), with a comment exemption for deliberate clears.
- **FR-048 (major):** DDL in app code (`sql_ddl` / `ALTER` / `CREATE` /
  `DROP` / `add_index` / `truncate`), exempt in patches and
  `on_doctype_update`.
- **FR-049 (blocker):** direct write to a ledger doctype (GL Entry,
  Stock Ledger Entry, Payment Ledger Entry, Bin, Serial and Batch
  Bundle). Reads are fine.
- **FR-050 (blocker):** monkey-patching `frappe` / `erpnext` / `hrms`,
  exempt in tests and `unittest.mock.patch` blocks.
- **FR-051 (major):** `frappe.enqueue()` in a lifecycle or whitelisted
  method without `enqueue_after_commit=True`.
- **FR-052 (major):** `frappe.qb.get_query()` without
  `ignore_permissions=False`.
- **FR-053 (major):** misspelled lifecycle method name, or a bad
  `doc_events` key in `hooks.py`.
- **FR-054 (major):** request state read inside a lifecycle method.
- **FR-055 (major):** `return <value>` inside `before_install`.
- **FR-056 (major):** dotted path in `hooks.py` / `patches.txt` that
  does not resolve against the submitted files (single-file paste
  cannot resolve — skipped there).
- **FR-057 (major):** database or site state read at module level in
  `hooks.py`.
- **FR-058 (major):** raw-SQL write without clearing the document
  cache in the same function.
- **FR-059 (major):** `frappe.set_user()` without restoration in a
  `finally`, or `frappe.session.user` assignment.
- None of the 16 new rules fires on ERPNext `sales_order.py` (still 8
  findings) or on the 6 FMC files (still 4, the known FR-023
  cross-file delegates). Tests: 147 passed, 0 failed (59 rules
  bad+good, 3 verdict, 38 earlier regression, 44 new regression).
- **Live site note:** the live site at
  https://irfanzahoor.github.io/frappe-sensei/ still serves the
  v0.1.0 build (Pages has not rebuilt since 0f17cf5 — API pushes do
  not trigger Pages builds). The 59 checks show there only after the
  next Pages build, triggered by a real file-change push.

## What changed since the first build

### Fix round 1 — FR-023 and FR-032 narrowed (2026-11-27)

- **FR-023** no longer flags whitelisted methods inside a DocType
  controller class (`self` methods, including `*Controller` bases such
  as `SellingController`), unless they fetch another document by a
  passed-in name. `check_permission` and `only_has_select_perm` now
  count as permission checks.
- **FR-032** fires only when the iterable is a direct `get_all` /
  `get_list` / `db.sql` call, or a variable assigned from one — not on
  child-table rows already in memory.
- ERPNext `sales_order.py`: 19 findings → 9.

### Fix round 2 — Copy button and FMC false positives (2026-11-27)

Running the tool on FMC (`irfanzahoor/fmc`, 6 files) gave 50 findings:
8 blocker FR-023, 41 major, 1 minor. Verification showed they were
almost all false positives:

- **FR-023** now follows a permission check into a helper the
  whitelisted method calls — directly or transitively (up to 4 levels,
  across files in the same submission, alias-aware) — and exempts a
  function that only reads `frappe.get_roles()` with no DB access.
- **FR-013** no longer fires on a document-creation form
  (`frappe.get_doc({...}).insert()`).
- **FR-031** fires on `.save()` / `.submit()` in a loop only, not on
  `.insert()` (bulk creation).
- **FR-030 / FR-031** are skipped in demo / seed / test files.
- **`# noqa`** on a line suppresses the finding, for every rule.
- FMC 6 files: 50 findings → 4 (the 4 whose helper files were not in
  that submission; 0 when the whole repo is checked).
- **Copy button:** 3-step fallback — clipboard API, then a hidden
  textarea, then a visible report textbox with a Select-all button.
  "Copied" is shown only when a copy actually succeeded, plus a
  "Show report" button for a manual copy at any time.

### Fix round 3 — FR-013 method calls (2026-11-27)

- **FR-013** now fires only on a plain field access (`.field` or
  `["field"]`). A method call after `get_doc` (`.set_status()`,
  `.save()`, `.insert()`, `.submit()`) is an action on the document,
  not a single-field read, and no longer fires.
- ERPNext `sales_order.py`: 9 findings → 8 (the FR-013 on
  `get_doc("Quotation", quotation).set_status(update=True)` is gone;
  the FR-030 N+1 on the same line stays, correctly).

## Tests

84 checker tests passing, 0 failing (43 rules bad+good, 3 verdict
checks, 38 regression tests). Run: `node checker/checker.test.mjs`.

## Honest remaining gaps

- **GitHub Pages is not enabled yet.** The live URL above returns 404
  until the owner enables it. No tag until the live site is tested.
- **GitHub tab has never been tested live end-to-end** — the
  unauthenticated GitHub API quota (60/hour) was exhausted during
  development. Retry on `irfanzahoor/fmc` from the live site.
- **Copy / Download buttons have never had a real browser click test**
  — no browser is available on the build machine. Confirm on the live
  site in a real browser.
- **Bad/good paste examples** were verified by driving the checker in
  Node, not by clicking through in a browser.
- A whitelisted method whose permission check lives in a helper file
  that was not submitted still flags — check the whole app when a
  blocker looks wrong.
- FR-007 (Custom Field not a fixture) can still false-positive on a
  comment that merely talks about custom fields.
