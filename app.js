// Frappe Sensei — web UI (MVP Day 6-7).
// Static page, no framework, no build step. The only network calls are:
//   1. fetch('rules/rules.json') — the 79 rules, same origin.
//   2. api.github.com + raw.githubusercontent.com — only when the user
//      gives a GitHub URL. No other network, no login, and user code is
//      never executed. An optional GitHub token, if the user pastes one,
//      is kept in this browser's localStorage only and sent to GitHub as
//      an Authorization header — never to any server of ours, because
//      this tool has no server.
import { checkFiles } from './checker/checker.js';

const $ = (id) => document.getElementById(id);

const BAD_EXAMPLE = {
  path: 'my_app/hooks.py',
  content: `# hooks.py
def validate_sales_order(doc, method):
    if doc.total < 0:
        frappe.throw(_('Total cannot be negative'))`,
};
const GOOD_EXAMPLE = {
  path: 'my_app/doctype/sales_order/sales_order.py',
  content: `# sales_order/sales_order.py
def validate(self):
    if self.total < 0:
        frappe.throw(_('Total cannot be negative'))`,
};

let rulesData = null;
let lastResult = null;
let lastFiles = [];
let activeTab = 'paste';
const uploadFiles = new Map(); // relative path -> content (folder uploads keep their relative path, so two files with the same name in different folders no longer overwrite each other)
const UPLOAD_WANTED = /\.(py|js|html|jinja|j2)$/i;
let githubFiles = []; // { path, checked }
let githubMeta = null; // { owner, repo, branch }
const GITHUB_FETCH_BATCH = 10; // raw files fetched in parallel per batch
let githubTotalFound = 0; // .py/.js/.html files in the repo/path
let githubTruncated = false; // GitHub's recursive tree can be truncated for very large repos
let lastFetchFailed = []; // GitHub-tab files that could not be fetched in the last run

const VERDICT_TEXT = {
  approve: 'Approve — no findings.',
  'approve with fixes': 'Approve with fixes — no blockers, but fix the major findings.',
  'needs rework': 'Needs rework — blocker findings must be fixed first.',
};
const VERDICT_CLASS = {
  approve: 'approve',
  'approve with fixes': 'fixes',
  'needs rework': 'rework',
};

function showError(message) {
  const el = $('error');
  el.textContent = message;
  el.hidden = !message;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadRules() {
  if (rulesData) return rulesData;
  let response;
  try {
    response = await fetch('rules/rules.json');
  } catch (e) {
    throw new Error('rules/rules.json could not be loaded. Open this page through a local server (python3 -m http.server) or GitHub Pages — opening index.html directly with file:// blocks the rules file.');
  }
  if (!response.ok) throw new Error(`rules/rules.json could not be loaded (HTTP ${response.status}).`);
  rulesData = await response.json();
  if (!Array.isArray(rulesData.rules) || rulesData.rules.length === 0) {
    throw new Error('rules/rules.json is empty or invalid.');
  }
  return rulesData;
}

// --- Tabs -----------------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    $(`panel-${tab.dataset.tab}`).classList.add('active');
    activeTab = tab.dataset.tab;
  });
});

// --- Paste tab ------------------------------------------------------------
$('load-bad').addEventListener('click', () => {
  $('paste-filename').value = BAD_EXAMPLE.path;
  $('paste-code').value = BAD_EXAMPLE.content;
});
$('load-good').addEventListener('click', () => {
  $('paste-filename').value = GOOD_EXAMPLE.path;
  $('paste-code').value = GOOD_EXAMPLE.content;
});

// --- Upload tab -----------------------------------------------------------
// Single files are keyed by their name; folder uploads are keyed by their
// relative path (file.webkitRelativePath), so same-named files in different
// folders no longer overwrite each other.
$('file-input').addEventListener('change', async (event) => {
  for (const file of event.target.files) {
    uploadFiles.set(file.name, await file.text());
  }
  event.target.value = '';
  renderUploadList();
});
$('folder-input').addEventListener('change', async (event) => {
  const picked = [...event.target.files].filter((f) => UPLOAD_WANTED.test(f.name));
  if (picked.length === 0) {
    showError('That folder has no .py / .js / .html files in it.');
  } else {
    showError('');
  }
  for (const file of picked) {
    uploadFiles.set(file.webkitRelativePath || file.name, await file.text());
  }
  event.target.value = '';
  renderUploadList();
});
function renderUploadList() {
  const list = $('upload-list');
  list.innerHTML = '';
  $('upload-empty').hidden = uploadFiles.size > 0;
  $('upload-details').hidden = uploadFiles.size === 0;
  $('upload-summary').textContent = `${uploadFiles.size} file${uploadFiles.size === 1 ? '' : 's'} added — click to view the list.`;
  for (const name of uploadFiles.keys()) {
    const li = document.createElement('li');
    li.textContent = name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn secondary';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => { uploadFiles.delete(name); renderUploadList(); });
    li.appendChild(remove);
    list.appendChild(li);
  }
}

// --- GitHub token (optional, stored only in this browser) ----------------
// Without a token GitHub allows 60 unauthenticated api.github.com requests
// per hour per IP, shared by everyone on that IP — that is the rate limit
// the user hit. With a token the limit is 5,000/hour. The token lives in
// localStorage only; it is never written to the repo and never sent
// anywhere except to api.github.com as an Authorization header.
const GITHUB_TOKEN_KEY = 'frappe-sensei-github-token';
const RATE_LIMIT_MESSAGE = 'GitHub rate limit reached (60 requests/hour without a login). Wait a while, paste a token above, or use the Upload folder tab instead — it has no limit.';
function getGithubToken() {
  try { return (localStorage.getItem(GITHUB_TOKEN_KEY) || '').trim(); } catch (e) { return ''; }
}
function setGithubTokenStatus() {
  const el = $('github-token-status');
  el.textContent = getGithubToken() ? 'Token saved in this browser.' : 'No token saved — limit is 60 requests/hour.';
}
function initGithubToken() {
  const input = $('github-token');
  input.value = getGithubToken();
  setGithubTokenStatus();
}
$('save-github-token').addEventListener('click', () => {
  const value = $('github-token').value.trim();
  try {
    if (value) localStorage.setItem(GITHUB_TOKEN_KEY, value);
    else localStorage.removeItem(GITHUB_TOKEN_KEY);
  } catch (e) { /* storage unavailable (private mode) — token still works for this page load */ }
  setGithubTokenStatus();
  showError('');
});
$('clear-github-token').addEventListener('click', () => {
  try { localStorage.removeItem(GITHUB_TOKEN_KEY); } catch (e) { /* ignore */ }
  $('github-token').value = '';
  setGithubTokenStatus();
});
initGithubToken();

// --- GitHub tab -----------------------------------------------------------
function parseGitHubUrl(raw) {
  const m = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^/\s]+)(?:\/(.*))?)?\/?$/.exec(raw.trim());
  if (!m) return null;
  return { owner: m[1], repo: m[2], branch: m[3] || null, subpath: m[4] || '' };
}
async function githubJson(url) {
  const headers = { Accept: 'application/vnd.github+json' };
  const token = getGithubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (response.status === 403) {
    let body = '';
    try { body = await response.clone().text(); } catch (e) { /* ignore */ }
    if (/rate limit/i.test(body)) throw new Error(RATE_LIMIT_MESSAGE);
    throw new Error('GitHub returned 403 — the repo may be private, or the token may be wrong or lack access.');
  }
  if (response.status === 404) throw new Error('Repo not found on GitHub — check the URL, and note private repos cannot be checked this way without a token that can read them.');
  if (response.status === 401) throw new Error('GitHub rejected the token — check it and save it again, or clear it to go back to no-login mode.');
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
  return response.json();
}
$('github-fetch').addEventListener('click', async () => {
  showError('');
  const parsed = parseGitHubUrl($('github-url').value);
  if (!parsed) { showError('That does not look like a GitHub repo URL. Use https://github.com/owner/repo'); return; }
  $('github-fetch').disabled = true;
  try {
    const repo = await githubJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
    const branch = parsed.branch || repo.default_branch;
    const tree = await githubJson(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`);
    const wanted = /\.(py|js|html|jinja|j2)$/i;
    let paths = (tree.tree || [])
      .filter((e) => e.type === 'blob' && wanted.test(e.path))
      .map((e) => e.path);
    if (parsed.subpath) paths = paths.filter((p) => p.startsWith(parsed.subpath));
    githubTotalFound = paths.length;
    githubTruncated = tree.truncated === true;
    githubFiles = paths.map((path) => ({ path, checked: true }));
    githubMeta = { owner: parsed.owner, repo: parsed.repo, branch };
    $('github-check-all').disabled = githubFiles.length === 0;
    $('github-empty').hidden = githubFiles.length > 0;
    renderGithubList();
    updateGithubSummary();
    if (githubFiles.length === 0) showError('No .py / .js / .html files found in that repo (or path).');
  } catch (e) {
    showError(e.message);
  } finally {
    $('github-fetch').disabled = false;
  }
});
function renderGithubList() {
  const list = $('github-list');
  list.innerHTML = '';
  githubFiles.forEach((entry, i) => {
    const li = document.createElement('li');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = entry.checked;
    box.setAttribute('aria-label', `Include ${entry.path}`);
    box.addEventListener('change', () => { entry.checked = box.checked; updateGithubSummary(); });
    const span = document.createElement('span');
    span.textContent = entry.path;
    li.append(box, span);
    list.appendChild(li);
  });
}
$('github-check-all').addEventListener('click', () => {
  githubFiles.forEach((entry) => { entry.checked = true; });
  renderGithubList();
  updateGithubSummary();
});
function updateGithubSummary() {
  const el = $('github-summary');
  if (!githubMeta || githubFiles.length === 0) { $('github-details').hidden = true; el.textContent = ''; return; }
  const checked = githubFiles.filter((f) => f.checked).length;
  $('github-details').hidden = false;
  let text = `${githubTotalFound} file${githubTotalFound === 1 ? '' : 's'} found, ${checked} will be checked — click to view the list.`;
  if (githubTruncated) {
    text += ` GitHub truncated this file list (very large repo) — check a subfolder URL (paste a tree URL like github.com/${githubMeta.owner}/${githubMeta.repo}/tree/${githubMeta.branch}/food_manufacturing/api) to see the rest.`;
  }
  el.textContent = text;
}

async function gatherFiles() {
  if (activeTab === 'paste') {
    const content = $('paste-code').value;
    const path = $('paste-filename').value.trim() || 'snippet.py';
    if (!content.trim()) throw new Error('Paste some code first.');
    return [{ path, content }];
  }
  if (activeTab === 'upload') {
    if (uploadFiles.size === 0) throw new Error('Choose at least one file first.');
    return [...uploadFiles.entries()].map(([path, content]) => ({ path, content }));
  }
  // github
  const selected = githubFiles.filter((f) => f.checked);
  if (!githubMeta || selected.length === 0) throw new Error('Fetch a repo file list and tick at least one file first.');
  // Fetch in parallel batches of 10 so a whole app (no file limit) does
  // not take one sequential round trip per file. One bad file must not kill the run.
  lastFetchFailed = [];
  const files = [];
  let fetched = 0;
  for (let i = 0; i < selected.length; i += GITHUB_FETCH_BATCH) {
    const batch = selected.slice(i, i + GITHUB_FETCH_BATCH);
    const results = await Promise.all(batch.map(async (entry) => {
      const url = `https://raw.githubusercontent.com/${githubMeta.owner}/${githubMeta.repo}/${githubMeta.branch}/${entry.path}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return { path: entry.path, content: await response.text() };
      } catch (e) {
        return { path: entry.path, error: e };
      }
    }));
    for (const r of results) {
      if (r.error) lastFetchFailed.push(r.path);
      else files.push({ path: r.path, content: r.content });
    }
    fetched += batch.length;
    $('busy').textContent = `Fetching file ${Math.min(fetched, selected.length)} of ${selected.length}…`;
  }
  $('busy').textContent = 'Checking…';
  if (files.length === 0) throw new Error(`Could not fetch any of the selected files: ${lastFetchFailed.join(', ')}`);
  return files;
}

// --- Run ------------------------------------------------------------------
$('run-btn').addEventListener('click', async () => {
  showError('');
  $('busy').hidden = false;
  $('run-btn').disabled = true;
  try {
    const rules = await loadRules();
    const files = await gatherFiles();
    lastFiles = files;
    const started = performance.now();
    lastResult = checkFiles(files, rules);
    const elapsed = Math.round(performance.now() - started);
    renderResults(lastResult, files, elapsed);
    if (lastFetchFailed.length > 0) {
      showError(`Could not fetch ${lastFetchFailed.length} file${lastFetchFailed.length === 1 ? '' : 's'} — skipped: ${lastFetchFailed.join(', ')}`);
    }
  } catch (e) {
    showError(e.message);
  } finally {
    $('busy').hidden = true;
    $('busy').textContent = 'Checking…';
    $('run-btn').disabled = false;
  }
});
$('clear-btn').addEventListener('click', () => {
  $('paste-code').value = '';
  uploadFiles.clear();
  renderUploadList();
  githubFiles = [];
  githubMeta = null;
  githubTotalFound = 0;
  lastFetchFailed = [];
  $('github-summary').textContent = '';
  $('github-details').hidden = true;
  $('github-url').value = '';
  $('github-list').innerHTML = '';
  $('github-empty').hidden = false;
  $('github-check-all').disabled = true;
  lastResult = null;
  lastFiles = [];
  $('results').hidden = true;
  $('report-box').hidden = true;
  $('copy-report').textContent = 'Copy report';
  showError('');
});

function renderResults(result, files, elapsedMs) {
  const section = $('results');
  section.hidden = false;
  const verdict = $('verdict');
  verdict.className = `verdict ${VERDICT_CLASS[result.verdict] || ''}`;
  verdict.textContent = `${result.verdict} — ${result.summary.total} finding${result.summary.total === 1 ? '' : 's'} in ${files.length} file${files.length === 1 ? '' : 's'} (${elapsedMs} ms). ${VERDICT_TEXT[result.verdict] || ''}`;
  $('summary').innerHTML = ['blocker', 'major', 'minor', 'total'].map((key) => {
    const n = result.summary[key];
    return `<span class="chip ${key}">${key}: ${n}</span>`;
  }).join('');
  renderFindings();
  // Keep an open report box in sync with the latest run instead of showing the previous run's report.
  if (!$('report-box').hidden) $('report-text').value = reportMarkdown();
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function renderFindings() {
  if (!lastResult) return;
  const sev = $('filter-severity').value;
  const cat = $('filter-category').value;
  const rows = lastResult.findings.filter((f) => (sev === 'all' || f.severity === sev) && (cat === 'all' || f.category === cat));
  const body = $('findings-body');
  body.innerHTML = rows.map((f) => `<tr>
    <td data-label="Severity"><span class="sev ${escapeHtml(f.severity)}">${escapeHtml(f.severity)}</span><span class="rule-id">${escapeHtml(f.ruleId)} · ${escapeHtml(f.category)}</span></td>
    <td data-label="File:line" class="file-cell">${escapeHtml(f.file)}:${f.line}</td>
    <td data-label="Rule">${escapeHtml(f.rule)}${f.snippet ? `<code class="snippet">${escapeHtml(f.snippet)}</code>` : ''}</td>
    <td data-label="Suggested fix">${escapeHtml(f.fix)}</td>
  </tr>`).join('');
  $('no-findings').hidden = rows.length > 0;
}
$('filter-severity').addEventListener('change', renderFindings);
$('filter-category').addEventListener('change', renderFindings);

// --- Report export --------------------------------------------------------
function reportMarkdown() {
  if (!lastResult) return '';
  const lines = ['# Frappe Sensei review', '', `Verdict: **${lastResult.verdict}**`, '',
    `Files checked: ${lastFiles.map((f) => f.path).join(', ')}`, '',
    `Summary: ${lastResult.summary.blocker} blocker, ${lastResult.summary.major} major, ${lastResult.summary.minor} minor, ${lastResult.summary.total} total`, '',
    '| Severity | File:line | Rule | Suggested fix |', '|---|---|---|---|'];
  for (const f of lastResult.findings) {
    lines.push(`| ${f.severity} | ${f.file}:${f.line} | ${f.ruleId} ${f.rule} | ${f.fix} |`);
  }
  lines.push('', 'Rules from frappe_core_skills v2.4.0 — 79 checks.');
  return lines.join('\n');
}
// --- Report export --------------------------------------------------------
// Copy tries three steps in order and reports truthfully:
// 1. navigator.clipboard.writeText (needs a secure context + permission),
// 2. a hidden textarea + document.execCommand('copy') (works on http and
//    older browsers), 3. if both fail, the report is shown in a visible,
//    selectable textarea so the user can copy it by hand. "Copied" is
//    shown only when a copy actually succeeded.
async function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* fall through to the next method */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) return true;
  } catch (e) { /* fall through to the manual box */ }
  return false;
}
function showReportBox() {
  $('report-text').value = reportMarkdown();
  $('report-box').hidden = false;
  return $('report-box');
}
$('copy-report').addEventListener('click', async () => {
  const btn = $('copy-report');
  const ok = await copyTextToClipboard(reportMarkdown());
  if (ok) {
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy report'; }, 2000);
  } else {
    btn.textContent = 'Copy failed — use the text box below';
    showReportBox();
    const ta = $('report-text');
    ta.focus();
    ta.select();
    setTimeout(() => { btn.textContent = 'Copy report'; }, 4000);
  }
});
$('show-report').addEventListener('click', () => {
  showReportBox();
  const ta = $('report-text');
  ta.focus();
  ta.select();
  $('report-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('select-report').addEventListener('click', () => {
  const ta = $('report-text');
  ta.focus();
  ta.select();
  $('select-report').textContent = 'Selected — press Ctrl+C';
  setTimeout(() => { $('select-report').textContent = 'Select all'; }, 2000);
});
$('hide-report').addEventListener('click', () => { $('report-box').hidden = true; });
$('download-report').addEventListener('click', () => {
  const blob = new Blob([reportMarkdown()], { type: 'text/markdown' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'frappe-sensei-report.md';
  link.click();
  URL.revokeObjectURL(link.href);
});
