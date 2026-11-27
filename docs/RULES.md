# Frappe Sensei — Review Rules

59 deterministic, statically checkable rules. The checker reads code only — it never runs it, and nothing is stored.

Source: `frappe_core_skills` v2.3.0 — [irfanzahoor/frappe_core_skills](https://github.com/irfanzahoor/frappe_core_skills) — for FR-001 to FR-035. FR-036 to FR-043 come from the Impertio-Studio/Frappe_Claude_Skill_Package review (61 skills, 2026-11-27); only the rule ideas were borrowed, in our own wording — their licence is inconsistent (README/package.json say MIT, LICENSE.md is LGPL v3), so no text was copied. FR-044 to FR-059 come from the official [frappe/skills](https://github.com/frappe/skills) review (12 skills, 2026-11-27); only the rule ideas were borrowed, in our own wording — that repo has no licence file, so no text was copied. FR-040 was corrected in the same round (see below): its source is now frappe/skills, not Impertio. The machine-readable form of these rules is `rules/rules.json`.

Severity follows `agents/frappe-reviewer.md`: **blocker** = wrong placement, JS-only validation, missing permission check, SQL injection risk, `frappe.db.commit()` in a request; **major** = untranslated strings, `raise Exception`, N+1 query, `["*"]` fields, duplicate handlers; **minor** = style, missing `flt`/`cint`, field behaviour set in JS that belongs in the DocType.

Totals: 59 rules — 16 blocker, 32 major, 11 minor. Categories: Placement 9, Framework APIs 22, Server vs Client 4, Security 15, Performance 9.

## All 59 rules

| ID | Severity | Category | Title | Source |
|----|----------|----------|-------|--------|
| FR-001 | blocker | placement | Own DocType logic in hooks.py or public/js | skills/frappe-core/SKILL.md |
| FR-002 | blocker | placement | Another app's files edited directly | skills/frappe-core/SKILL.md |
| FR-003 | blocker | placement | Other app's DocType logic placed in hooks.py directly | skills/frappe-core/SKILL.md |
| FR-004 | blocker | placement | set_query outside setup/onload | skills/frappe-core/references/review-checklist.md |
| FR-005 | major | placement | Duplicate frappe.ui.form.on blocks | skills/frappe-core/references/review-checklist.md |
| FR-006 | major | placement | Duplicate controller methods | skills/frappe-core/SKILL.md |
| FR-007 | minor | placement | Custom Field for another app not shipped as a fixture | skills/frappe-core/SKILL.md |
| FR-008 | major | apis | raise Exception instead of frappe.throw | skills/frappe-core/SKILL.md |
| FR-009 | major | apis | Untranslated user-facing string | agents/frappe-reviewer.md |
| FR-010 | major | apis | f-string inside _() | skills/frappe-core/SKILL.md |
| FR-011 | minor | apis | print() left in Python code | skills/frappe-core/references/review-checklist.md |
| FR-012 | minor | apis | console.log or alert() left in JS | skills/frappe-core/references/review-checklist.md |
| FR-013 | major | apis | get_doc used for a single field | skills/frappe-core/SKILL.md |
| FR-014 | major | apis | fields=["*"] in get_all / get_list | agents/frappe-reviewer.md |
| FR-015 | major | apis | import statement in a Server Script | skills/frappe-server-scripts/SKILL.md |
| FR-016 | major | apis | Bare except clause | skills/frappe-core/references/review-checklist.md |
| FR-017 | minor | apis | Doc values used without flt / cint / getdate | agents/frappe-reviewer.md |
| FR-018 | blocker | server-client | Validation or business rule only in JS | agents/frappe-reviewer.md |
| FR-019 | major | server-client | Form calls a method that is not whitelisted | skills/frappe-core/SKILL.md |
| FR-020 | minor | server-client | Field behaviour set in JS instead of the DocType | agents/frappe-reviewer.md |
| FR-021 | minor | server-client | frappe.call in refresh for rarely-changing data | skills/frappe-performance/SKILL.md |
| FR-022 | blocker | security | User input formatted into SQL (SQL injection) | skills/frappe-security/SKILL.md |
| FR-023 | blocker | security | Whitelisted method without a permission check | skills/frappe-security/SKILL.md |
| FR-024 | blocker | security | allow_guest on a method that writes or returns private data | skills/frappe-security/SKILL.md |
| FR-025 | major | security | ignore_permissions without an explanatory comment | skills/frappe-core/SKILL.md |
| FR-026 | major | security | Hardcoded secret in code, fixture or JS | skills/frappe-security/SKILL.md |
| FR-027 | major | security | User content in Jinja without escaping, or \|safe on user content | skills/frappe-security/SKILL.md |
| FR-028 | major | security | User input inserted as HTML in JS | skills/frappe-security/SKILL.md |
| FR-029 | blocker | performance | frappe.db.commit() in a controller, hook or request | skills/frappe-core/SKILL.md |
| FR-030 | major | performance | Database call inside a loop (N+1) | skills/frappe-performance/SKILL.md |
| FR-031 | major | performance | Bulk update done doc-by-doc with save() | skills/frappe-performance/SKILL.md |
| FR-032 | major | performance | Aggregation done in Python instead of SQL | skills/frappe-performance/SKILL.md |
| FR-033 | minor | performance | Slow work in a request without frappe.enqueue | skills/frappe-performance/SKILL.md |
| FR-034 | minor | performance | Master data read without caching | skills/frappe-performance/SKILL.md |
| FR-035 | minor | performance | Name-only list fetched without pluck | skills/frappe-performance/SKILL.md |
| FR-036 | blocker | apis | self.save() inside validate / before_save / on_update | Impertio — docs/reference/controllers/anti-patterns.md (Recursive Save) |
| FR-037 | major | apis | Field assigned in on_update is never saved | Impertio — docs/reference/controllers/anti-patterns.md (Changes after on_update) |
| FR-038 | major | apis | Overridden validate() without super().validate() | Impertio — skills/source/syntax/frappe-syntax-controllers/SKILL.md |
| FR-039 | blocker | security | frappe.throw() or raise inside a permission hook | Impertio — skills/source/errors/frappe-errors-permissions/SKILL.md |
| FR-040 | major | security | has_permission hook that can fall through to None | frappe/skills — skills/frappe-app-dev/SKILL.md (Code section) + skills/deep-app-audit/quality/A-customization/A28-permission-hooks-only-narrow.md |
| FR-041 | minor | apis | cur_frm used in client script | Impertio — skills/source/errors/frappe-errors-clientscripts/SKILL.md |
| FR-042 | major | security | eval() or exec() in Python code | Impertio — skills/source/syntax/frappe-syntax-serverscripts/references/anti-patterns.md |
| FR-043 | minor | performance | frappe.enqueue() without queue= | Impertio — skills/source/impl/frappe-impl-scheduler/SKILL.md |
| FR-044 | blocker | security | Shell command built from app code (os.system / subprocess shell=True) | frappe/skills — skills/deep-app-audit/security/B-injection/B08-command-shell-injection.md |
| FR-045 | major | security | Unsafe deserialization (pickle / yaml.load / marshal / dill / shelve) | frappe/skills — skills/deep-app-audit/security/B-injection/B10-header-log-ldap-redis-deserialization.md |
| FR-046 | blocker | security | Server-side template injection (render_template with a non-literal template) | frappe/skills — skills/deep-app-audit/security/B-injection/B05-ssti-jinja-templates.md |
| FR-047 | blocker | apis | Delete or truncate with no filter (whole table cleared) | frappe/skills — skills/deep-app-audit/quality/B-correctness/B21-destructive-call-needs-a-filter.md + skills/frappe-code-review/SKILL.md §1 |
| FR-048 | major | apis | DDL in app code (sql_ddl / ALTER / CREATE / DROP / add_index / truncate) | frappe/skills — skills/deep-app-audit/quality/B-correctness/B03-ddl-ends-the-transaction.md |
| FR-049 | blocker | apis | Direct write to a ledger doctype (GL Entry / Stock Ledger / Bin / ...) | frappe/skills — skills/deep-app-audit/quality/A-customization/A41-no-direct-ledger-writes.md |
| FR-050 | blocker | apis | Monkey-patching frappe / erpnext / hrms at import time | frappe/skills — skills/deep-app-audit/quality/A-customization/A01-no-monkey-patching.md |
| FR-051 | major | apis | frappe.enqueue() in a lifecycle or whitelisted method without enqueue_after_commit=True | frappe/skills — skills/deep-app-audit/quality/B-correctness/B04-enqueue-after-commit.md |
| FR-052 | major | security | frappe.qb.get_query() without ignore_permissions=False | frappe/skills — skills/frappe-app-dev/SKILL.md (Code section) + skills/deep-app-audit/security/B-injection/B03-query-builder-misuse.md |
| FR-053 | major | apis | Misspelled lifecycle method name (after_save / before_delete / on_saved ...) | frappe/skills — skills/deep-app-audit/quality/B-correctness/B33-use-a-lifecycle-name-the-framework-calls.md |
| FR-054 | major | apis | Request state read inside a lifecycle method (frappe.local.request / form_dict) | frappe/skills — skills/deep-app-audit/quality/B-correctness/B31-no-request-state-in-lifecycle-code.md |
| FR-055 | major | apis | return with a value inside before_install | frappe/skills — skills/deep-app-audit/quality/A-customization/A39-install-hooks-return-nothing.md |
| FR-056 | major | placement | Dotted path in hooks.py / patches.txt does not resolve | frappe/skills — skills/deep-app-audit/quality/A-customization/A14-dotted-paths-must-resolve.md |
| FR-057 | major | placement | Database or site state read at module level in hooks.py | frappe/skills — skills/deep-app-audit/quality/A-customization/A24-hooks-py-is-static-data.md |
| FR-058 | major | performance | Raw-SQL write without clearing the document cache | frappe/skills — skills/deep-app-audit/quality/B-correctness/B43-clear-the-document-cache-after-a-raw-write.md |
| FR-059 | major | security | frappe.set_user() without restoration, or frappe.session.user assignment | frappe/skills — skills/deep-app-audit/security/D-auth-identity/D08-impersonation-set-user.md |

## Rule changes — FR-040 corrected + 16 new rules from the official frappe/skills review (2026-11-27)

The official [frappe/skills](https://github.com/frappe/skills) review (12 skills, verified by cloning) added 16 deterministic rules, FR-044 to FR-059, taking the tool from 43 to 59 checks. Only the rule ideas were taken; every title, description, example and fix is written in our own words, because the repo has no licence file. The review also corrected one of our own rules:

- **FR-040 corrected (2026-11-27):** the old rule was inverted — it flagged any `return True` inside a `has_permission` hook, on the (wrong) idea that a permission hook can only deny, never grant. The framework authors say the opposite: `skills/frappe-app-dev/SKILL.md` line 84 — "A `has_permission` hook must return `True` or `False`. Frappe treats `None` as a denial, so return `True` for users the hook does not restrict" — and deep-app-audit `A28-permission-hooks-only-narrow.md` lists a handler that "ends without an explicit `return True`" as a finding. So the rule now flags a `has_permission` hook in `hooks.py` that can fall through to `None`: no `return True` anywhere in the function, a bare `return`, or a last top-level statement that is not a `return` (a return nested inside an `if` does not end the function). An `if`/`else` chain where every branch ends in a `return` is safe and does not fire. Severity stays major. The old bad/good tests were replaced: a hook that returns `True` for unrestricted users is now GOOD; a hook that falls through to `None` is BAD.
- **FR-039 knock-on fix:** its old good example ended with `return None` and its fix said "return False to deny and None to defer" — that contradicts the corrected FR-040. The example now ends with `return True` and the fix says to return `True` for users the hook does not restrict.
- **FR-044 (blocker):** `os.system` / `os.popen` / `subprocess` with `shell=True` / `frappe.utils.execute_in_shell` — a shell command built from app code. A subprocess call with a list of arguments and `shell=False` does not fire; string literals are stripped before checking.
- **FR-045 (major):** unsafe deserialization — `pickle.loads` / `pickle.load`, `yaml.load` without `SafeLoader`, `marshal`, `dill`, `shelve`. `json.loads` and `yaml.load(..., Loader=yaml.SafeLoader)` are safe.
- **FR-046 (blocker):** server-side template injection — `frappe.render_template` / `render_template` / `render_jinja` / `jinja2.Template` with a non-literal first argument. A literal string template is safe. Different from FR-027, which is about escaping data inside a template, not the template itself.
- **FR-047 (blocker):** `frappe.db.delete()` with no filter, an empty `{}` filter or a variable filter; `frappe.db.truncate(`; raw `DELETE` / `TRUNCATE` without `WHERE`. A comment on the same line or the line above (a deliberate full-table clear) exempts it, like FR-025. A `DELETE` with `WHERE` does not fire.
- **FR-048 (major):** DDL in app code — `sql_ddl`, `ALTER` / `CREATE` / `DROP TABLE`, `add_index`, `frappe.db.truncate(`. Exempt inside a patch file (a path containing `/patches/`) or inside `on_doctype_update`.
- **FR-049 (blocker):** direct write to a ledger doctype — `insert` / `update` / `delete` / `set_value` / raw SQL on "GL Entry", "Stock Ledger Entry", "Payment Ledger Entry", "Bin" or "Serial and Batch Bundle". Reads (`get_value`, `get_all`, `get_list`) do not fire.
- **FR-050 (blocker):** monkey-patching — assigning to an attribute of `frappe` / `erpnext` / `hrms` at import time, or `setattr(frappe...)`. Exempt in test files and inside `unittest.mock.patch` blocks. Assignments to `frappe.local`, `frappe.flags` and `frappe.conf` are not patching and do not fire.
- **FR-051 (major):** `frappe.enqueue(` / `frappe.enqueue_doc(` inside a lifecycle method or a whitelisted method without `enqueue_after_commit=True`. Complements FR-043 (`queue=`).
- **FR-052 (major):** `frappe.qb.get_query(` without `ignore_permissions=False` — the query builder defaults to ignoring permissions.
- **FR-053 (major):** a misspelled lifecycle method name in a controller class (`after_save`, `before_delete`, `on_saved`, `after_submit`, `before_load`, `on_submitted`, and other wrong names from B33's list of 24) — the framework never calls it, so the code silently never runs. Near-misses (edit distance ≤ 2 from a real lifecycle name, e.g. `on_load` vs `onload`) also fire. Bad `doc_events` keys in `hooks.py` fire too. Ordinary helper methods do not fire.
- **FR-054 (major):** `frappe.local.request` / `frappe.form_dict` / `frappe.request` read inside a lifecycle method, or `frappe.form_dict` read inside a non-whitelisted function. Reading `form_dict` inside a whitelisted method is the normal pattern and does not fire.
- **FR-055 (major):** `return <value>` inside `def before_install` — any return with a value aborts the install when falsy. A bare `return` is safe. A return with a comment on the same line (an intentional refusal with a stated reason) is exempt.
- **FR-056 (major):** a dotted path in `hooks.py` or `patches.txt` that does not resolve against the submitted files (module file + function name). A lone `hooks.py` with no other `.py` files is skipped — a single-file paste cannot resolve dotted paths. Paths starting with `frappe.`, `erpnext.` or `hrms.` are skipped (other apps, not submitted). The JS twin (A38, `frappe.call` targets) was not included in this rule — `frappe.call` targets are usually whitelisted method paths, not module functions, so resolving them the same way would flag valid code.
- **FR-057 (major):** `frappe.db` / `get_all` / `get_doc` / `get_installed_apps` / `frappe.local` / `frappe.conf` calls, or `if` / `for` / `while`, at module level in `hooks.py` — values computed at import time with the wrong site (or no site). The same call inside a function does not fire. Different from FR-001/FR-003, which cover logic in `hooks.py`, not computed values.
- **FR-058 (major):** a raw-SQL `UPDATE` / `INSERT` / `DELETE` via `frappe.db.sql` with no `frappe.clear_document_cache` / `frappe.clear_cache` in the same function. `set_value` / `save` clear the cache themselves, so they never reach this check. A `SELECT` does not fire.
- **FR-059 (major):** `frappe.set_user(` without restoration in a `finally` block that calls `set_user(` again, or `frappe.session.user = ...` assignment.

None of the 16 new rules fires on ERPNext `sales_order.py` (still 8 findings) or on the 6 FMC files (still 4 findings, the known FR-023 cross-file delegates) — both re-runs were done before pushing. Tests: 147 passed, 0 failed (59 rules bad+good, 3 verdict, 38 earlier regression, 44 new regression for FR-040 and FR-044–FR-059).

## Rule changes — 8 new rules from the Impertio review (2026-11-27)

The [Impertio-Studio/Frappe_Claude_Skill_Package](https://github.com/Impertio-Studio/Frappe_Claude_Skill_Package) review (61 skills, verified by cloning) contributed 8 more deterministic rules, FR-036 to FR-043, taking the tool from 35 to 43 checks. Only the rule ideas were taken; every title, description, example and fix is written in our own words, because the package's licence is inconsistent (its README/package.json say MIT, its LICENSE.md is LGPL v3).

- **FR-036 (blocker):** `.save()` on `self`/`doc` inside `validate`, `before_save` or `on_update` re-enters the same hook forever. A flags-based recursion guard (`self.flags`) in the method exempts it.
- **FR-037 (major):** assigning `self.<field>` in `on_update` is lost — the document is already saved. `self.flags.*` assignments and `self.db_set(...)` calls are exempt.
- **FR-038 (major):** an overridden `validate()` in a DocType controller class with no `super().validate()` call. Scoped to controller classes (inheriting from `Document` directly or through a `*Controller` base); a `validate` in a plain class does not fire.
- **FR-039 (blocker):** `frappe.throw()` or `raise` inside a `has_permission` or `permission_query_conditions` function in `hooks.py` — it breaks all access to the DocType.
- **FR-040 (major):** `return True` inside a `has_permission` function in `hooks.py` — a permission hook can only deny, never grant.
- **FR-041 (minor):** `cur_frm` in a `.js` file — undefined in list/report contexts; use the `frm` parameter.
- **FR-042 (major):** `eval()` / `exec()` in Python code. String literals are stripped before checking, so a message mentioning `eval` does not fire.
- **FR-043 (minor):** `frappe.enqueue(...)` with no `queue=` keyword argument. Multi-line calls are joined before checking.

None of the 8 fires on ERPNext `sales_order.py` (still 8 findings) or on the 6 FMC files (still 4 findings, the known FR-023 cross-file delegates) — both re-runs were done before pushing.

## Rule changes — FR-023 and FR-032 narrowed (2026-11-27)

Day 8 testing on ERPNext core `sales_order.py` showed both rules were
over-broad, so their `pattern` fields in `rules/rules.json` were narrowed.
Severity, title and fix text are unchanged for both rules.

- **FR-023:** instance methods of a DocType controller class (first
  argument `self`, inside a class inheriting from `Document` directly
  or through a `*Controller` base such as `SellingController`) are now
  exempt, unless they fetch another document by a passed-in docname/id
  with no permission check. `check_permission` (call or
  `check_permission=` argument) and `only_has_select/write_perm` now
  also count as permission checks, alongside `has_permission` and
  `get_list`.
- **FR-032:** now fires only when the summed/counted iterable comes
  from a DB query — a direct `get_all` / `get_list` / `db.sql` call
  inside `sum()` / `len()`, or a variable assigned from such a call
  earlier in the same file. Sums over `self.get(...)`, `self.items` or
  a plain list no longer fire.


## Rule changes — Copy button + FMC false positives (2026-11-27)

A real run on FMC (`irfanzahoor/fmc`, version-16) produced 50 findings
(8 blocker, 41 major, 1 minor). Every one of the 8 FR-023 blockers was
a thin API wrapper delegating to a helper that checks permission, and
the seed-file findings were demo data by design. The rules were
narrowed, not weakened — a standalone whitelisted function with no
check anywhere in its call chain still fires:

- **FR-023:** a permission check in a helper the whitelisted method
  calls now counts, directly or transitively (up to 4 levels, across
  files in the same submission, resolving `from ... import X as Y`
  aliases). A helper in a file that was not submitted cannot be
  followed. A function that only reads `frappe.get_roles()` and
  performs no database read or write is also exempt. After the fix the
  FMC run drops from 50 findings to 4 on the 6 submitted files (the 4
  whose helpers live in files outside that submission), and to 0 when
  the helper files are included.
- **FR-013:** creating a document no longer fires. A dict first
  argument (`frappe.get_doc({...})`) or `.insert()` / `.save()` after
  the call means the document is being made, not read. Narrowed again
  2026-11-27: FR-013 now fires only on a plain field access (`.field`
  or `["field"]`); a method call after `get_doc` (`.set_status()`,
  `.save()`, `.insert()`, `.submit()`) does not fire.
- **FR-031:** fires on `.save()` / `.submit()` inside a loop only.
  `.insert()` inside a loop is bulk creation and no longer fires.
- **FR-030 / FR-031:** neither fires in demo, seed or test files
  (paths containing `/demo/`, `/tests/` or `/test_`, or a filename
  containing `seed`). Other rules still apply there.
- **All rules:** a `# noqa` comment on the flagged line suppresses the
  finding.

The Copy button in the web UI also changed the same day: it now tries
`navigator.clipboard.writeText`, then a hidden textarea with
`document.execCommand('copy')`, and if both fail it shows the report in
a visible, selectable textarea with a Select-all button. "Copied" is
shown only when a copy actually succeeded. A "Show report" button
reveals the markdown report at any time.

## Out of scope for Phase 1

These were read in the v2.3.0 skills but are **not** in these 59 rules, because they are not deterministic static code checks:

- **frappe-studio / frappe-flow / frappe-insights** — all five new v2.3.0 skills were fetched and read. Studio, Flow and Insights are config and product guidance (export to git, one agent one job, never share salary data on a public dashboard), not code patterns the checker can flag. No rule was invented from them.
- **frappe-data** — backup-before-delete, preview-before-import and test-on-staging are process rules, not code patterns. Its one code rule (never raw SQL deletes / writes) is already covered by FR-022.
- **v16-only hook rules** — `extend_doctype_class` is preferred over `override_doctype_class`, but that lives in hooks configuration, not in a code snippet the checker can reliably flag, so it is left out. The other v16 hook rule — a `has_permission` hook must return an explicit `True` — is now covered by FR-040 (corrected 2026-11-27; see above).
- **Silent return in validate** — named in `frappe-core` ("never silent `return`"), but a bare `return` is often legitimate control flow, so flagging it would produce false positives. Left out.
- **Field-layout rules** (Section/Column/Tab Break, `insert_after` naming a real field) — these need the live DocType field list, not just the submitted code. Planned for Phase 2, when the checker can read a DocType JSON.
- **AI fix suggestions, private repositories, login, and any code execution** — out of scope for the whole MVP, not just Phase 1.

## How a rule gets added or changed

1. Edit `rules/rules.json` only — it is the single source of truth. Never edit this table by hand; regenerate it from `rules.json`.
2. Every rule needs a `source` file in `frappe_core_skills` (skill file, reference, agent or command) and a `pattern` concrete enough to implement in JavaScript (regex, AST node, or file-structure check).
3. Keep the ID sequence FR-001 to FR-059 in order: category first, then severity (blocker, major, minor). New rules go at the end with the next free ID; never reuse or renumber an old ID.
4. Keep severity aligned with `agents/frappe-reviewer.md`. Do not upgrade a minor to a blocker to make a report look stronger.
5. Validate before pushing: `python3 -m json.tool rules/rules.json` must pass, the count must be exactly the number in this file's table, and every rule must have all 11 fields (`id`, `category`, `severity`, `title`, `description`, `pattern`, `example_bad`, `example_good`, `fix`, `source`, `versions`).
