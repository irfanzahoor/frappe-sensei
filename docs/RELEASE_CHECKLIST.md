# Frappe Sensei — Release Checklist (Day 8)

Date: 2026-11-27. Repo: `irfanzahoor/frappe-sensei`, branch `main`, **private**.
Commits at test time: `f594513` (README), `650c245` (35 rules),
`8c519b6` (checker), `8cb3e32` (web UI). This checklist is commit 5.

Do NOT release or launch until the owner steps at the bottom are done.

## 1. Checker regression — PASS

`node checker/checker.test.mjs` — **38 passed, 0 failed** (35 rules + 3 verdict checks).
Re-run on Day 8, same result as Day 3-5.

## 2. Local serving — PASS

`python3 -m http.server` in the repo root, all 5 files return 200:

| File | HTTP | Size |
|---|---|---|
| index.html | 200 | 6,727 bytes |
| app.js | 200 | 12,242 bytes |
| styles.css | 200 | 4,963 bytes |
| rules/rules.json | 200 | 26,152 bytes |
| checker/checker.js | 200 | 25,516 bytes |

## 3. GitHub tab (live tree fetch) — UNABLE TO TEST (rate limit)

Three consecutive calls to `api.github.com` returned **403 "API rate limit exceeded"**
(egress IPs 104.29.197.140 and 104.29.200.238 — the shared egress quota is exhausted).
This is the same failure as Day 6-7, not a code bug.

- The `GET /rate_limit` endpoint gave inconsistent answers (remaining 6, then 4;
  resets 09:02 / 09:12 / 09:17 UTC) because the egress IP rotates. The 403 response
  bodies are the reliable evidence: quota 0 on the IP that served the calls.
- Safe retry time: after about **09:17 UTC / 14:17 PKT on 2026-11-27** (the latest
  reset seen). Retry with the exact flow `app.js` uses:
  `GET /repos/{owner}/{repo}` then `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`.
- The code path itself is correct on reading: `app.js` handles 403 with the message
  "GitHub rate limit reached (60 requests/hour without a login). Wait a while and try again."
- **Better demo repo for the retry:** `irfanzahoor/frappe_core_skills` has **no**
  `.py` / `.js` files at all (markdown-only skills repo), so the GitHub tab would
  return 0 files there even with quota. Use `irfanzahoor/fmc` instead — a real app
  with `.py` files.
- What *did* work: `raw.githubusercontent.com` is NOT rate-limited the same way.
  A real file fetched fine (ERPNext `sales_order.py`, 38,987 bytes, HTTP 200) and
  the checker ran on it in 23 ms — see item 4.
- Cap raised after v0.1.0: the GitHub tab now checks up to **300 files** per run
  (was 50), fetched 10 at a time with live progress. A repo with more files
  shows a warning and the subfolder-URL workaround (paste a tree URL like
  `github.com/owner/repo/tree/branch/food_manufacturing/api`, or upload the rest).

## 4. Real-browser click-through — UNABLE TO TEST (no browser on this machine)

No Chromium, Firefox, Playwright, Puppeteer, or Playwright browser cache is
installed here. No browser stack was installed — that is out of scope for Day 8.
Next-best test, done in Node with the exact examples from `app.js`:

| Example | Verdict | Findings |
|---|---|---|
| Bad example (`my_app/hooks.py`, logic in hooks.py) | needs rework | 2 blockers: FR-001 + FR-003 at hooks.py:2 |
| Good example (`sales_order.py`, validate in controller) | approve | 0 findings |

DOM wiring was cross-checked by reading the code: all 25 element IDs used in
`app.js` exist in `index.html` (0 missing). The 4 IDs in `index.html` not used in
`app.js` (`findings-table`, `panel-paste`, `panel-upload`, `panel-github`) are
reached through class/query selectors, not missing wiring.

Real-file run (raw fetch, no browser): ERPNext core `sales_order.py`
(`develop`, 38,987 bytes) through the checker — **19 findings, verdict "needs rework",
23 ms**: FR-023 x10 blocker, FR-032 x2 major, FR-030 x5 major, FR-013 x1 major,
FR-009 x1 major. The FR-030 / FR-013 / FR-009 hits were observed, not verified
line by line. See the two false-positive patterns below.

## 5. Copy / download report — PASS at code level, click untested

`reportMarkdown()` was extracted from `app.js` and executed in Node with a mock
findings set (2 blocker + 1 major). Output is correct: verdict line, summary line
("2 blocker, 1 major, 0 minor, 3 total"), 3 table rows with rule id + fix, and the
"Rules from frappe_core_skills v2.3.0 — 35 checks." footer. Empty result returns
an empty string. The Copy button uses `navigator.clipboard` and Download uses a
Blob + anchor — both are browser-only, so the actual clicks still need a real
browser test after launch.

## 6. UI breakage / references — PASS

- No external JS library, no CDN, no analytics anywhere in `index.html`, `app.js`
  or `styles.css`. The only network calls are `rules/rules.json` (same origin),
  `api.github.com` and `raw.githubusercontent.com` (GitHub tab only).
- Relative paths are correct: `styles.css`, `app.js`, `checker/checker.js`,
  `rules/rules.json`, `docs/RULES.md` — all exist at those paths in the repo.
- `loadRules()` fails with a clear message if the page is opened with `file://`
  instead of a server / Pages.
- `checkFiles(files, rules)` in `app.js` passes the whole `rules.json` object;
  `checker.js` accepts that shape (falls back to its embedded table otherwise).
- No code is executed, no login, nothing stored — as designed.

## Known false-positive patterns (do NOT silently fix — decide first)

1. **FR-023 (whitelisted method without a permission check) — over-broad.**
   On ERPNext core `sales_order.py` it fires 10 blockers on controller methods
   such as `has_unreserved_stock`, which delegate to another class
   (`SalesOrderStockReservation`). These are `self` methods on a DocType
   controller, where the document permission context already applies. Suggested
   Phase-2 fix: exempt whitelisted methods defined inside a DocType controller
   class, or downgrade FR-023 to major.
2. **FR-032 (aggregation in Python instead of SQL) — over-broad.**
   Lines 421-422 sum `self.get("items")` — child-table rows already loaded in
   memory, not DB rows. Suggested Phase-2 fix: only fire when the iterable comes
   from `get_all` / `get_list` / `db.sql`.
3. **FR-007 (Custom Field not a fixture)** — already documented in Day 3-5 and in
   `index.html`: a comment merely talking about custom fields can false-positive.
4. **FR-018 / FR-030 / FR-002** — heuristics, already documented in `index.html`
   and `checker/README.md`.

## Owner steps — needed before launch

### (a) Repo visibility — decide first

- **Option 1 (recommended): make the repo public.** GitHub Pages is free on a
  public repo, and anyone can then open the tool. Settings → General → Danger Zone
  → Change visibility → Make public. Link: https://github.com/irfanzahoor/frappe-sensei/settings
- **Option 2: keep it private.** GitHub Pages on a private repo is only available
  on paid GitHub plans (Pro / Team / Enterprise). Irfaan's plan is not known here,
  so do not assume it — check Settings → Billing and plans first. If the plan does
  not include private Pages, the tool will not be reachable until the repo is public.
- Do not flip visibility silently — confirm the choice in chat first.

### (b) Enable GitHub Pages

Settings → Pages → Build and deployment → Source: **Deploy from a branch** →
Branch: **main**, folder: **/ (root)** → Save.
Link: https://github.com/irfanzahoor/frappe-sensei/settings/pages
Then verify: https://irfanzahoor.github.io/frappe-sensei/ loads and the Paste tab
works (load the bad example → "needs rework", load the good example → "approve").

## After the owner steps — release steps

1. Open the live URL, run the bad example and the good example in a real browser.
2. Retry the GitHub tab on `irfanzahoor/fmc` after the quota reset (see item 3).
3. Click Copy report and Download report in the browser and check the `.md` file.
4. If all three pass, tag the release (v0.1.0) and announce it — only with Irfaan's
   approval of the exact post text first. Never post directly.
