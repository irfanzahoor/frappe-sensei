# Frappe Sensei

Live web tool that reviews Frappe / ERPNext code against the `frappe_core_skills` rules.

Paste code, upload a `.py` / `.js` file, or give a public GitHub link — and get the same report `/frappe-review` gives: a severity-ordered findings table (blocker / major / minor), a one-line verdict, and the commands to run.

## Status

MVP in progress. Plan: 35 checks in 5 categories — Placement, Framework APIs, Server vs Client, Security, Performance — taken from `frappe_core_skills` (`skills/frappe-core/SKILL.md`, `references/review-checklist.md`, `agents/frappe-reviewer.md`).

## Rules source

Rules live in [irfanzahoor/frappe_core_skills](https://github.com/irfanzahoor/frappe_core_skills) (v2.3.0, 22 skills). This tool does not run your code — it only reads it, in your browser, and nothing is stored.

## License

MIT
