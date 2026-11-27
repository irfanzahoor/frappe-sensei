# Frappe Sensei — MVP Review Rules (Phase 1)

35 deterministic, statically checkable rules. The checker reads code only — it never runs it, and nothing is stored.

Source: `frappe_core_skills` v2.3.0 — [irfanzahoor/frappe_core_skills](https://github.com/irfanzahoor/frappe_core_skills). The machine-readable form of these rules is `rules/rules.json`.

Severity follows `agents/frappe-reviewer.md`: **blocker** = wrong placement, JS-only validation, missing permission check, SQL injection risk, `frappe.db.commit()` in a request; **major** = untranslated strings, `raise Exception`, N+1 query, `["*"]` fields, duplicate handlers; **minor** = style, missing `flt`/`cint`, field behaviour set in JS that belongs in the DocType.

## All 35 rules

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

## Out of scope for Phase 1

These were read in the v2.3.0 skills but are **not** in these 35 rules, because they are not deterministic static code checks:

- **frappe-studio / frappe-flow / frappe-insights** — all five new v2.3.0 skills were fetched and read. Studio, Flow and Insights are config and product guidance (export to git, one agent one job, never share salary data on a public dashboard), not code patterns the checker can flag. No rule was invented from them.
- **frappe-data** — backup-before-delete, preview-before-import and test-on-staging are process rules, not code patterns. Its one code rule (never raw SQL deletes / writes) is already covered by FR-022.
- **v16-only hook rules** — `has_permission` must return an explicit `True` on v16, and `extend_doctype_class` is preferred over `override_doctype_class`. Both live in hooks configuration, not in a code snippet the checker can reliably flag, so they are left out.
- **Silent return in validate** — named in `frappe-core` ("never silent `return`"), but a bare `return` is often legitimate control flow, so flagging it would produce false positives. Left out.
- **Field-layout rules** (Section/Column/Tab Break, `insert_after` naming a real field) — these need the live DocType field list, not just the submitted code. Planned for Phase 2, when the checker can read a DocType JSON.
- **AI fix suggestions, private repositories, login, and any code execution** — out of scope for the whole MVP, not just Phase 1.

## How a rule gets added or changed

1. Edit `rules/rules.json` only — it is the single source of truth. Never edit this table by hand; regenerate it from `rules.json`.
2. Every rule needs a `source` file in `frappe_core_skills` (skill file, reference, agent or command) and a `pattern` concrete enough to implement in JavaScript (regex, AST node, or file-structure check).
3. Keep the ID sequence FR-001 to FR-035 in order: category first, then severity (blocker, major, minor). New rules go at the end with the next free ID; never reuse or renumber an old ID.
4. Keep severity aligned with `agents/frappe-reviewer.md`. Do not upgrade a minor to a blocker to make a report look stronger.
5. Validate before pushing: `python3 -m json.tool rules/rules.json` must pass, the count must be exactly the number in this file's table, and every rule must have all 11 fields (`id`, `category`, `severity`, `title`, `description`, `pattern`, `example_bad`, `example_good`, `fix`, `source`, `versions`).
