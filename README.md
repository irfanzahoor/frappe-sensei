# Frappe Sensei

**Live tool: https://irfanzahoor.github.io/frappe-sensei/**

> The link goes live once GitHub Pages is enabled (Settings → Pages → Deploy from a branch → `main` / root). Until then, run it locally — see below.

Live web tool that reviews Frappe / ERPNext code against the `frappe_core_skills` rules.

Paste code, upload a `.py` / `.js` file, or give a public GitHub link — and get the same report `/frappe-review` gives: a severity-ordered findings table (blocker / major / minor), a one-line verdict, and the commands to run.

## What it does

- **59 checks in 5 categories** — Placement, Framework APIs, Server vs Client, Security, Performance — taken from `frappe_core_skills` v2.3.0 (FR-001 to FR-035) plus 8 more from the Impertio-Studio/Frappe_Claude_Skill_Package review (FR-036 to FR-043) and 16 more from the official frappe/skills review (FR-044 to FR-059).
- **Three ways in:** paste code (with bad/good examples), upload files, or a public GitHub repo URL (up to 300 files).
- **Report:** verdict (approve / approve with fixes / needs rework), severity counts, severity and category filters, Copy report and Download report (`.md`).
- **Private by design:** it runs entirely in your browser. No login, no storage, your code is never executed and never sent anywhere except the public GitHub files you ask it to fetch.

## How to use

1. Open the live link above (once Pages is on), or run it locally:
   ```text
   git clone https://github.com/irfanzahoor/frappe-sensei.git
   cd frappe-sensei
   python3 -m http.server 8000
   ```
   Then open http://localhost:8000/ — opening `index.html` directly with `file://` will not work, because the browser blocks loading `rules/rules.json` that way.
2. Paste code, upload files, or give a GitHub URL — then **Review**.
3. Fix the blockers first, then the majors. Each finding names the rule and the suggested fix; full rule details are in [`docs/RULES.md`](docs/RULES.md).

## Status

v0.1.0 in preparation — see [`docs/RELEASE_NOTES_v0.1.0.md`](docs/RELEASE_NOTES_v0.1.0.md). 84 checker tests passing, 0 failing.

## Known limitations

- The GitHub tab uses the unauthenticated GitHub API (60 requests/hour) — if it says the rate limit is reached, wait a while and try again.
- A whitelisted method whose permission check lives in a helper file you did not submit still flags — check the whole app when a blocker looks wrong.
- Full list: [`checker/README.md`](checker/README.md).

## Rules source

Rules live in [irfanzahoor/frappe_core_skills](https://github.com/irfanzahoor/frappe_core_skills) (v2.3.0, 22 skills) for FR-001 to FR-035, and FR-036 to FR-043 come from the [Impertio-Studio/Frappe_Claude_Skill_Package](https://github.com/Impertio-Studio/Frappe_Claude_Skill_Package) review (61 skills) — rule ideas only, written in our own wording, because that package's licence is inconsistent (README/package.json say MIT, LICENSE.md is LGPL v3). This tool does not run your code — it only reads it, in your browser, and nothing is stored.

## License

MIT
