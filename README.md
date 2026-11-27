# Frappe Sensei

Live web tool that reviews Frappe / ERPNext code against the `frappe_core_skills` rules.

Paste code, upload a `.py` / `.js` file, or give a public GitHub link — and get the same report `/frappe-review` gives: a severity-ordered findings table (blocker / major / minor), a one-line verdict, and the commands to run.

## Status

MVP in progress. Plan: 35 checks in 5 categories — Placement, Framework APIs, Server vs Client, Security, Performance — taken from `frappe_core_skills` (`skills/frappe-core/SKILL.md`, `references/review-checklist.md`, `agents/frappe-reviewer.md`).

## Rules source

Rules live in [irfanzahoor/frappe_core_skills](https://github.com/irfanzahoor/frappe_core_skills) (v2.3.0, 22 skills). This tool does not run your code — it only reads it, in your browser, and nothing is stored.

## Try it

Open the live tool at `index.html` — paste code, upload `.py` / `.js` files, or give a public GitHub repo URL. It runs entirely in your browser: no login, no storage, and your code is never executed.

Run it locally:

```text
python3 -m http.server
```

Then open http://localhost:8000/ — opening `index.html` directly with `file://` will not work, because the browser blocks loading `rules/rules.json` that way.

GitHub Pages is not enabled yet. The repo is private, so Pages and public access are a launch decision for Irfaan — do not enable them here.

## License

MIT
