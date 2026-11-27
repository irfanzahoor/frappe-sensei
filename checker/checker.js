// Frappe Sensei — JS checker engine (MVP Day 3-5).
// Pure, dependency-free ES module. No DOM, no Node-only APIs in the core,
// no eval / Function(), no code execution, no storage, no network.
// Reads code only and returns findings.
//
// Usage (browser):
//   import { checkFiles } from './checker.js';
//   const rules = await fetch('../rules/rules.json').then(r => r.json());
//   const result = checkFiles([{ path: 'sales_order.py', content: code }], rules);
// Usage (Node / tests): checkFiles(files, rulesData) — rulesData is the
// parsed rules/rules.json object ({ rules: [...] }). If omitted, the
// embedded RULES table below (id/severity/category/title/fix copied from
// rules.json) is used, so the checker works standalone.

export const RULES = [
  { id: 'FR-001', severity: 'blocker', category: 'placement', title: 'Own DocType logic in hooks.py or public/js', fix: "Move the logic into the DocType's own controller <name>.py / form script <name>.js." },
  { id: 'FR-002', severity: 'blocker', category: 'placement', title: "Another app's files edited directly", fix: 'Never edit another app\'s files; extend via doc_events in hooks.py plus an overrides module and fixtures.' },
  { id: 'FR-003', severity: 'blocker', category: 'placement', title: "Other app's DocType logic placed in hooks.py directly", fix: 'Put the logic in <app>/<module>/overrides/<name>.py and reference it from doc_events in hooks.py.' },
  { id: 'FR-004', severity: 'blocker', category: 'placement', title: 'set_query outside setup/onload', fix: 'Move frm.set_query into the setup (or onload) handler of the correct form script.' },
  { id: 'FR-005', severity: 'major', category: 'placement', title: 'Duplicate frappe.ui.form.on blocks', fix: 'Merge the handlers into a single frappe.ui.form.on block per DocType.' },
  { id: 'FR-006', severity: 'major', category: 'placement', title: 'Duplicate controller methods', fix: 'Merge the duplicate methods into one and extend the existing handler.' },
  { id: 'FR-007', severity: 'minor', category: 'placement', title: 'Custom Field for another app not shipped as a fixture', fix: 'Ship the Custom Field / Property Setter as a fixture filtered by module.' },
  { id: 'FR-008', severity: 'major', category: 'apis', title: 'raise Exception instead of frappe.throw', fix: "Replace raise Exception with frappe.throw(_('...'))." },
  { id: 'FR-009', severity: 'major', category: 'apis', title: 'Untranslated user-facing string', fix: 'Wrap every user-facing string in _() in Python or __() in JS.' },
  { id: 'FR-010', severity: 'major', category: 'apis', title: 'f-string inside _()', fix: 'Use _() with {0} placeholders and .format() instead of an f-string.' },
  { id: 'FR-011', severity: 'minor', category: 'apis', title: 'print() left in Python code', fix: 'Remove print() and use frappe.log_error for jobs and integrations.' },
  { id: 'FR-012', severity: 'minor', category: 'apis', title: 'console.log or alert() left in JS', fix: 'Remove console.log/alert() and use frappe.show_alert for user feedback.' },
  { id: 'FR-013', severity: 'major', category: 'apis', title: 'get_doc used for a single field', fix: 'Use frappe.db.get_value or frappe.get_cached_value for single fields.' },
  { id: 'FR-014', severity: 'major', category: 'apis', title: 'fields=["*"] in get_all / get_list', fix: 'List the fields you need explicitly in fields.' },
  { id: 'FR-015', severity: 'major', category: 'apis', title: 'import statement in a Server Script', fix: 'Remove the import and use the pre-loaded names (frappe.parse_json, frappe.utils.today, frappe.utils.flt).' },
  { id: 'FR-016', severity: 'major', category: 'apis', title: 'Bare except clause', fix: 'Catch a named exception and handle or re-raise it with frappe.throw.' },
  { id: 'FR-017', severity: 'minor', category: 'apis', title: 'Doc values used without flt / cint / getdate', fix: 'Wrap doc values with flt(), cint() or getdate() as appropriate.' },
  { id: 'FR-018', severity: 'blocker', category: 'server-client', title: 'Validation or business rule only in JS', fix: 'Enforce the rule on the server in validate / before_submit; keep JS for UX only.' },
  { id: 'FR-019', severity: 'major', category: 'server-client', title: 'Form calls a method that is not whitelisted', fix: 'Add @frappe.whitelist() to the controller method and check permissions before returning data.' },
  { id: 'FR-020', severity: 'minor', category: 'server-client', title: 'Field behaviour set in JS instead of the DocType', fix: 'Set fetch_from, depends_on and mandatory in the DocType field settings, not in JS.' },
  { id: 'FR-021', severity: 'minor', category: 'server-client', title: 'frappe.call in refresh for rarely-changing data', fix: "Load rarely-changing data once in onload or frm.doc.__onload instead of calling on every refresh." },
  { id: 'FR-022', severity: 'blocker', category: 'security', title: 'User input formatted into SQL (SQL injection)', fix: 'Use %s placeholders with values passed separately, or frappe.qb.' },
  { id: 'FR-023', severity: 'blocker', category: 'security', title: 'Whitelisted method without a permission check', fix: 'Check frappe.has_permission before returning or writing data in every whitelisted method.' },
  { id: 'FR-024', severity: 'blocker', category: 'security', title: 'allow_guest on a method that writes or returns private data', fix: 'Remove allow_guest from any method that writes or returns private data; keep it only for truly public read-only endpoints.' },
  { id: 'FR-025', severity: 'major', category: 'security', title: 'ignore_permissions without an explanatory comment', fix: 'Add a comment explaining why ignore_permissions is safe here, or remove it.' },
  { id: 'FR-026', severity: 'major', category: 'security', title: 'Hardcoded secret in code, fixture or JS', fix: 'Move secrets to site_config.json with bench set-config and read them with frappe.conf.' },
  { id: 'FR-027', severity: 'major', category: 'security', title: 'User content in Jinja without escaping, or |safe on user content', fix: 'Escape user content with |e and use |safe only on HTML your own code generated.' },
  { id: 'FR-028', severity: 'major', category: 'security', title: 'User input inserted as HTML in JS', fix: 'Build DOM with .text() or frappe.utils.escape_html() instead of .html(user_input).' },
  { id: 'FR-029', severity: 'blocker', category: 'performance', title: 'frappe.db.commit() in a controller, hook or request', fix: 'Remove frappe.db.commit() from controllers, hooks and requests; it is allowed only in long background jobs and patches.' },
  { id: 'FR-030', severity: 'major', category: 'performance', title: 'Database call inside a loop (N+1)', fix: 'Fetch in bulk before the loop, build a dict, then loop over the dict.' },
  { id: 'FR-031', severity: 'major', category: 'performance', title: 'Bulk update done doc-by-doc with save()', fix: 'Use frappe.db.set_value with filters or a QB update for bulk changes, only when skipping controller validation is acceptable.' },
  { id: 'FR-032', severity: 'major', category: 'performance', title: 'Aggregation done in Python instead of SQL', fix: 'Aggregate in SQL/QB with Sum or Count instead of loading rows into Python.' },
  { id: 'FR-033', severity: 'minor', category: 'performance', title: 'Slow work in a request without frappe.enqueue', fix: 'Move slow work to frappe.enqueue with a queue and timeout.' },
  { id: 'FR-034', severity: 'minor', category: 'performance', title: 'Master data read without caching', fix: 'Use frappe.get_cached_value or get_value with cache=True for rarely-changing masters.' },
  { id: 'FR-035', severity: 'minor', category: 'performance', title: 'Name-only list fetched without pluck', fix: "Use pluck='name' for simple lists of names." },
];

const OTHER_APP_RE = /(^|\/)apps\/(frappe|erpnext|hrms|crm|helpdesk)\//;
const DB_CALL_RE = /frappe\.(db\.get_value|db\.sql|get_doc|get_all|get_list)\s*\(/;
const WRITE_CALL_RE = /\.(insert|save|submit|delete|set_value)\s*\(/;
// A permission check, in any of the forms the skills accept.
const PERM_CHECK_RE = /has_permission|check_permission|only_has_(?:select|write|perm)|get_list\s*\(/;
// Names that look like function calls but are not helper calls: keywords,
// builtins, and Frappe API names (attribute calls are excluded by the
// regex itself, since they are preceded by a dot).
const SKIP_CALLS = new Set([
  'if', 'elif', 'else', 'for', 'while', 'return', 'def', 'class', 'import',
  'print', 'len', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set',
  'tuple', 'sorted', 'min', 'max', 'sum', 'abs', 'round', 'range',
  'enumerate', 'zip', 'isinstance', 'type', 'super', 'getattr', 'setattr',
  'hasattr', 'open', 'ValueError', 'Exception', 'PermissionError',
]);

// Names of functions a body calls (bare `name(` and `self.name(`).
function calledFunctionNames(bodyText) {
  const names = new Set();
  const bareRe = /(?:^|[^\w.])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let m;
  while ((m = bareRe.exec(bodyText)) !== null) {
    if (!SKIP_CALLS.has(m[1])) names.add(m[1]);
  }
  const selfRe = /\bself\.([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  while ((m = selfRe.exec(bodyText)) !== null) {
    if (!SKIP_CALLS.has(m[1])) names.add(m[1]);
  }
  return names;
}

// Does a permission check happen in a helper the body calls, directly or
// transitively (up to 4 levels)? `fnIndex` maps a function name to its
// definitions across the whole submission; `aliasMaps` maps a file path to
// its `from ... import X as Y` aliases. A helper in a file that was not
// submitted cannot be followed, so that case still flags.
function calleeChecksPermission(startBody, startFile, fnIndex, aliasMaps) {
  const visited = new Set();
  const queue = [{ body: startBody, file: startFile, depth: 0 }];
  while (queue.length) {
    const { body, file, depth } = queue.shift();
    if (depth >= 4) continue;
    for (const called of calledFunctionNames(body)) {
      const aliases = aliasMaps.get(file) || new Map();
      const real = aliases.get(called) || called;
      if (visited.has(real)) continue;
      visited.add(real);
      const defs = fnIndex.get(real) || fnIndex.get(called) || [];
      for (const def of defs) {
        if (PERM_CHECK_RE.test(def.bodyText)) return true;
        queue.push({ body: def.bodyText, file: def.file, depth: depth + 1 });
      }
    }
  }
  return false;
}

function linesOf(content) {
  return String(content || '').split('\n');
}
function indentOf(line) {
  const m = /^(\s*)/.exec(line);
  return m ? m[1].length : 0;
}
function isCommentPy(line) {
  return /^\s*#/.test(line);
}
function stripStrings(s) {
  // Remove single/double-quoted string literals (best effort, single line).
  return s.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
}

// --- JS helper: name of the form handler enclosing a line index ---------
// Looks backwards for the nearest `name(frm)` / `name: function` / `name(frm) {`
// inside a frappe.ui.form.on block. Returns the handler name or null.
function enclosingJsHandler(lines, idx) {
  for (let i = idx; i >= 0; i--) {
    const line = lines[i];
    const m = /(setup|onload|refresh|validate|before_save|after_save|on_submit|before_submit)\s*(?::\s*function)?\s*\(\s*frm/.exec(line);
    if (m) return m[1];
    // A new form.on block resets the search.
    if (i < idx && /frappe\.ui\.form\.on\s*\(/.test(line)) return null;
  }
  return null;
}

// --- Python helper: parse defs with decorators, class + params --------
// Returns [{ name, line (0-based), decorator, bodyLines: [{line, text}],
//   params: [first, ...], className, classBases, isDocumentClass }]
// A def inside `class X(Document):` has isDocumentClass true when the
// class bases mention Document. Header lines of a multi-line def are
// collected so params are parsed correctly and are not in the body.
function parsePyFunctions(lines) {
  const fns = [];
  let pendingDecorator = '';
  const classStack = []; // { name, bases, indent }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dec = /^\s*@([^\n]+)/.exec(line);
    if (dec) { pendingDecorator = dec[1].trim(); continue; }
    const cm = /^(\s*)class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(([^)]*)\))?\s*:/.exec(line);
    if (cm) {
      const ind = cm[1].length;
      while (classStack.length && classStack[classStack.length - 1].indent >= ind) classStack.pop();
      classStack.push({ name: cm[2], bases: cm[3] || '', indent: ind });
      pendingDecorator = '';
      continue;
    }
    const m = /^(\s*)def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(line);
    if (!m) { if (line.trim() && !line.trim().startsWith('#')) pendingDecorator = ''; continue; }
    const defIndent = m[1].length;
    let cls = null;
    for (let k = classStack.length - 1; k >= 0; k--) {
      if (classStack[k].indent < defIndent) { cls = classStack[k]; break; }
    }
    // Collect the def header (it may span lines) to parse params.
    let header = line;
    let j = i;
    let depth = (header.match(/\(/g) || []).length - (header.match(/\)/g) || []).length;
    while (depth > 0 && j + 1 < lines.length) {
      j++;
      header += '\n' + lines[j];
      depth += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
    }
    const paramsText = header.slice(header.indexOf('(') + 1, header.lastIndexOf(')'));
    const params = paramsText.split(',').map((p) => p.trim().split(/[:=]/)[0].trim()).filter(Boolean);
    const body = [];
    for (let k = j + 1; k < lines.length; k++) {
      const b = lines[k];
      if (b.trim() === '' || isCommentPy(b)) { body.push({ line: k, text: b }); continue; }
      if (indentOf(b) <= defIndent) break;
      body.push({ line: k, text: b });
    }
    fns.push({
      name: m[2],
      line: i,
      decorator: pendingDecorator,
      bodyLines: body,
      params,
      className: cls ? cls.name : null,
      classBases: cls ? cls.bases : '',
      // A DocType controller class inherits from Document directly, or
      // through an ERPNext controller base (SellingController,
      // BuyingController, TransactionController, ...), which themselves
      // inherit from Document. A bare `class Foo:` is not one.
      isDocumentClass: cls ? /\b(Document|WebsiteGenerator|[A-Za-z_][A-Za-z0-9_]*Controller)\b/.test(cls.bases) : false,
    });
    pendingDecorator = '';
  }
  return fns;
}

export function checkFiles(files, rulesInput) {
  const input = Array.isArray(files) ? files : [];
  const meta = new Map();
  const sourceRules = (rulesInput && Array.isArray(rulesInput.rules)) ? rulesInput.rules : RULES;
  for (const r of sourceRules) meta.set(r.id, r);
  // Severity/category/title/fix must come from rules.json when supplied;
  // the embedded table is only the fallback for standalone use.
  const findings = [];
  const seen = new Set();
  function add(ruleId, file, lineIdx, snippetOverride) {
    const rule = meta.get(ruleId);
    if (!rule) return;
    const lines = linesOf(input.find((f) => f.path === file)?.content || '');
    // A "# noqa" comment on the flagged line suppresses the finding, for
    // every rule. The author has deliberately marked that line as reviewed.
    if (/#\s*noqa\b/.test(lines[lineIdx] || '')) return;
    const key = ruleId + '|' + file + '|' + (lineIdx + 1);
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      ruleId,
      severity: rule.severity,
      category: rule.category,
      file,
      line: lineIdx + 1,
      rule: rule.title,
      fix: rule.fix,
      snippet: (snippetOverride ?? lines[lineIdx] ?? '').trim().slice(0, 200),
    });
  }

  const isPy = (p) => /\.py$/i.test(p);
  const isJs = (p) => /\.js$/i.test(p);
  const isTemplate = (p) => /\.(html|jinja|j2)$/i.test(p) || /\.html\./i.test(p);

  // --- Cross-file Python function index (for FR-023 delegation) -------
  // name -> [{ bodyText, file }] for every def in the submission, plus a
  // per-file alias map from `from ... import X as Y` / `from ... import X`.
  const pyFnIndex = new Map();
  const pyAlias = new Map();
  for (const f of input) {
    if (!isPy(f.path)) continue;
    const fns = parsePyFunctions(linesOf(f.content || ''));
    for (const fn of fns) {
      const bodyText = fn.bodyLines.map((b) => b.text).join('\n');
      if (!pyFnIndex.has(fn.name)) pyFnIndex.set(fn.name, []);
      pyFnIndex.get(fn.name).push({ bodyText, file: f.path });
    }
    const aliases = new Map();
    for (const line of linesOf(f.content || '')) {
      const im = /^\s*from\s+[\w.]+\s+import\s+(.+)$/.exec(line);
      if (im) {
        for (const part of im[1].split(',')) {
          const mm = /^\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?\s*$/.exec(part);
          if (mm) aliases.set(mm[2] || mm[1], mm[1]);
        }
      }
    }
    pyAlias.set(f.path, aliases);
  }

  for (const file of input) {
    const path = file.path || '';
    const content = file.content || '';
    const lines = linesOf(content);
    const base = path.split('/').pop() || '';
    const isHooks = base === 'hooks.py';
    const inFixtures = /(^|\/)fixtures\//.test(path);
    const isServerScript = /server_script/i.test(path) || /Server Script/i.test(content.slice(0, 300));

    // FR-002 — another app's files edited directly (path check).
    if (OTHER_APP_RE.test(path)) add('FR-002', path, 0);

    // FR-007 — Custom Field / Property Setter outside fixtures/.
    // Only .py / .json files can define one; .js rule-title strings and
    // comments must not trigger it.
    if (!inFixtures && (isPy(path) || /\.json$/i.test(path)) && /custom[_ ]?field|property[_ ]?setter/i.test(content)) {
      // Flag the first line that defines/creates one, unless that line is
      // about shipping it as a fixture (fixtures/ path, not just the word).
      const idx = lines.findIndex((l) => /custom[_ ]?field|property[_ ]?setter/i.test(l) && !/fixtures\//i.test(l));
      if (idx >= 0) add('FR-007', path, idx);
    }

    if (isPy(path)) {
      // FR-001 — def with a body in hooks.py (hook mappings only belong here).
      if (isHooks) {
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*def\s+[A-Za-z_]/.test(lines[i])) {
            // A def whose body does validation / business logic.
            const body = lines.slice(i + 1, i + 6).join('\n');
            if (/frappe\.throw|frappe\.msgprint|doc\.set\(|self\./.test(body) || /validate|business|total/.test(lines[i])) add('FR-001', path, i);
          }
        }
      }
      // FR-003 — doc_events value is an inline lambda in hooks.py, or a
      // def in hooks.py (business logic placed there directly).
      if (isHooks) {
        for (let i = 0; i < lines.length; i++) {
          if (/doc_events\s*=/.test(lines[i]) && /lambda/.test(lines.slice(i, i + 3).join('\n'))) add('FR-003', path, i);
          if (/^\s*def\s+[A-Za-z_]/.test(lines[i])) add('FR-003', path, i);
        }
      }
      // FR-006 — duplicate controller methods in one class.
      {
        const seenMethods = new Map();
        let classIndent = null;
        for (let i = 0; i < lines.length; i++) {
          const cm = /^(\s*)class\s+\w+/.exec(lines[i]);
          if (cm) { classIndent = cm[1].length; seenMethods.clear(); continue; }
          if (classIndent === null) continue;
          if (lines[i].trim() && indentOf(lines[i]) <= classIndent && !/^\s*class\s/.test(lines[i])) { classIndent = null; continue; }
          const dm = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/.exec(lines[i]);
          if (dm) {
            if (seenMethods.has(dm[1])) add('FR-006', path, i);
            else seenMethods.set(dm[1], i);
          }
        }
      }
      // Per-line Python checks.
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isCommentPy(line)) continue;
        if (/\braise\s+Exception\b/.test(line) || /\braise\s+['"]/.test(line)) add('FR-008', path, i);
        if (/\bfrappe\.(throw|msgprint)\(\s*['"]/.test(line)) add('FR-009', path, i);
        // FR-010: f-string inside _(), or a named {placeholder} inside _()
        // (good form is {0} + .format()). _() with {0} must not flag.
        if (/_\s*\(\s*f['"]/.test(line) || /_\s*\(\s*['"][^'"]*\{[A-Za-z_][A-Za-z0-9_]*\}/.test(line)) add('FR-010', path, i);
        if (/^\s*print\s*\(/.test(line)) add('FR-011', path, i);
        // FR-013: get_doc(...) followed by a single-field access. Creating
        // a document is NOT a single-field read: a dict first argument
        // (creation form) or .insert() / .save() after the call means the
        // document is being made, not read.
        {
          const gm = /frappe\.get_doc\(\s*(\{)?[^)]*\)\s*\.(\w+)/.exec(line);
          if (gm) {
            const isCreationForm = !!gm[1];
            const attr = gm[2];
            if (!isCreationForm && !/^(insert|save|submit)$/.test(attr)) add('FR-013', path, i);
          }
        }
        if (/frappe\.get_(all|list)\s*\([^)]*fields\s*=\s*(?:\[\s*['"]\*['"]\s*\]|['"]\*['"])/.test(line)) add('FR-014', path, i);
        if (isServerScript && /^\s*(import\s+\w+|from\s+[\w.]+\s+import\s+)/.test(line)) add('FR-015', path, i);
        if (/^\s*except\s*:/.test(line)) add('FR-016', path, i);
        if (/\b(?:float|int)\s*\(\s*(?:self|doc|frm\.doc|row)\./.test(line)) add('FR-017', path, i);
        else if (/(?:self|doc|row)\.\w+\s*[*+\-/]\s*(?:self|doc|row|flt|cint)/.test(line) && !/\b(?:flt|cint|getdate)\s*\(/.test(line)) add('FR-017', path, i);
        // FR-022: f-string / + / % formatting into frappe.db.sql()
        if (/frappe\.db\.sql\(\s*f['"]/.test(line)) add('FR-022', path, i);
        else if (/frappe\.db\.sql\(\s*['"][^'"]*['"]\s*%/.test(line)) add('FR-022', path, i);
        else if (/frappe\.db\.sql\(\s*f?['"][^'"]*\{[^}]*\}/.test(line) && /f['"]/.test(line)) add('FR-022', path, i);
        // FR-025: ignore_permissions without a comment on this line or above.
        if (/ignore_permissions\s*=\s*True/.test(line)) {
          const hasComment = /#/.test(line) || (i > 0 && /#/.test(lines[i - 1])) || (i > 1 && /#/.test(lines[i - 2]));
          if (!hasComment) add('FR-025', path, i);
        }
        // FR-026: hardcoded secret assigned to a secret-named variable.
        if (/^\s*(?:[A-Za-z0-9_]*?(?:api[_-]?key|password|secret|token)[A-Za-z0-9_]*)\s*=\s*['"][^'"]{12,}['"]/i.test(line) && !/frappe\.conf|getenv|os\.environ/.test(line)) add('FR-026', path, i);
        // FR-029: frappe.db.commit() inside a def (controller / hook / request).
        if (/frappe\.db\.commit\s*\(/.test(line) && !/patches\//.test(path)) {
          // Only flag when inside a function body (checked below by def scan);
          // a top-level commit in a patch file is allowed, so require a def
          // somewhere above in the file.
          if (lines.slice(0, i).some((l) => /^\s*def\s+/.test(l))) add('FR-029', path, i);
        }
        // FR-034: master data read without caching.
        if (/frappe\.db\.get_value\(\s*['"](?:Company|[^'"]*\sSettings)['"]/.test(line) && !/cache\s*=\s*True/.test(line)) add('FR-034', path, i);
        // FR-035: name-only list without pluck.
        if (/frappe\.get_all\(\s*[^)]*fields\s*=\s*\[\s*['"]name['"]\s*\]/.test(line) && !/pluck\s*=/.test(line)) add('FR-035', path, i);
      }
      // Loop-aware Python checks (FR-030, FR-031) — indentation tracking.
      // Demo / seed / test files insert demo data in loops by design, so
      // N+1 and bulk-save rules are not meaningful there. Only FR-030 and
      // FR-031 are skipped — every other rule still applies.
      const isDemoSeedTest = /(^|\/)(demo|tests?)\//i.test(path) || path.includes('test_') || /seed/i.test(base);
      {
        const loopStack = []; // { indent }
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.trim() === '' || isCommentPy(line)) continue;
          const ind = indentOf(line);
          while (loopStack.length && ind <= loopStack[loopStack.length - 1].indent) loopStack.pop();
          if (/^\s*(for|while)\b.*:\s*$/.test(line)) { loopStack.push({ indent: ind }); continue; }
          if (loopStack.length && !isDemoSeedTest) {
            if (DB_CALL_RE.test(line)) add('FR-030', path, i);
            // FR-031 fires on .save() / .submit() only. .insert() is bulk
            // CREATION (demo data, imports), not a bulk update.
            if (/\.(save|submit)\s*\(/.test(line)) add('FR-031', path, i);
          }
        }
      }
      // FR-032: sum()/len() over a DB-query result ONLY. The iterable must
      // be a direct get_all/get_list/db.sql call inside the sum()/len(),
      // or a variable assigned from such a call earlier in the same file.
      // In-memory iterables (self.get(...), self.items, doc.items, a plain
      // list, or a list built from self.get(...)) must NOT fire.
      {
        const dbVars = new Map(); // varName -> line index of assignment
        const DB_ASSIGN_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*[^#]*\b(?:frappe\.(?:get_all|get_list|db\.sql|db\.get_all))\s*\(/;
        for (let i = 0; i < lines.length; i++) {
          const m = DB_ASSIGN_RE.exec(lines[i]);
          if (m && !dbVars.has(m[1])) dbVars.set(m[1], i);
        }
        for (let i = 0; i < lines.length; i++) {
          const stripped = stripStrings(lines[i]);
          if (!/\b(?:sum|len)\s*\(/.test(stripped)) continue;
          // Join continuation lines until the call's parens balance.
          let callText = stripped;
          let depth = (stripped.match(/\(/g) || []).length - (stripped.match(/\)/g) || []).length;
          let k = i;
          while (depth > 0 && k + 1 < lines.length && k - i < 5) {
            k++;
            const next = stripStrings(lines[k]);
            callText += '\n' + next;
            depth += (next.match(/\(/g) || []).length - (next.match(/\)/g) || []).length;
          }
          // Direct DB call inside sum()/len().
          if (/frappe\.(?:get_all|get_list|db\.sql|db\.get_all)\s*\(/.test(callText)) { add('FR-032', path, i); continue; }
          // Iterable variable: `for x in <iter>` in a generator, else the
          // first argument of sum()/len().
          let iter = null;
          const forIn = /for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(callText);
          if (forIn) iter = forIn[1];
          else {
            const arg = /(?:sum|len)\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(callText);
            if (arg) iter = arg[1];
          }
          if (iter && dbVars.has(iter) && dbVars.get(iter) < i) add('FR-032', path, i);
        }
      }
      // FR-023 / FR-024 / FR-033 — per whitelisted function.
      {
        const fns = parsePyFunctions(lines);
        const hasEnqueue = /frappe\.enqueue\s*\(/.test(content);
        for (const fn of fns) {
          const isWhitelisted = /frappe\.whitelist/.test(fn.decorator);
          const isGuest = /allow_guest\s*=\s*True/.test(fn.decorator);
          const bodyText = fn.bodyLines.map((b) => b.text).join('\n');
          if (isWhitelisted && !isGuest) {
            // FR-023: no permission check before return/write. A permission
            // check is has_permission, check_permission (call or
            // check_permission= argument), only_has_select/write_perm, or a
            // permission-aware get_list() — in this function OR in a helper
            // it calls, directly or transitively (same submission). A
            // function that only reads frappe.get_roles() and performs no
            // DB read or write is also exempt: it returns view names, and
            // the endpoints re-check permission. Instance methods of a
            // DocType controller class (first arg self, inside a class
            // inheriting from Document) are exempt — the document
            // permission context already applies — UNLESS the method
            // fetches another document by a passed-in docname/id with no
            // permission check (directly or through a helper).
            const hasPermCheck = PERM_CHECK_RE.test(bodyText);
            if (!hasPermCheck) {
              const firstParam = (fn.params && fn.params[0]) || '';
              const isDocumentSelfMethod = !!fn.isDocumentClass && firstParam === 'self';
              let riskyFetch = false;
              if (isDocumentSelfMethod) {
                const otherParams = (fn.params || []).slice(1);
                const fetchRe = /frappe\.(?:get_doc|db\.get_value|db\.get_all|get_all|get_list|db\.sql)\s*\(/;
                if (otherParams.length && fetchRe.test(bodyText)) {
                  riskyFetch = otherParams.some((p) => new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(bodyText));
                }
              }
              const rolesOnly = /frappe\.get_roles\s*\(/.test(bodyText)
                && !/frappe\.(get_doc|get_all|get_list|db\.)/.test(bodyText)
                && !/\.(insert|save|submit|delete|set_value)\s*\(/.test(bodyText);
              const delegatedCheck = calleeChecksPermission(bodyText, path, pyFnIndex, pyAlias);
              // A read-only function that only returns a constant is exempt.
              if ((!isDocumentSelfMethod || riskyFetch) && !rolesOnly && !delegatedCheck && !/^\s*return\s*\{/.test(bodyText)) add('FR-023', path, fn.line);
            }
          }
          if (isWhitelisted && isGuest) {
            // FR-024: allow_guest + write, or returning a document field.
            if (WRITE_CALL_RE.test(bodyText) || /return\s+frappe\.get_doc|return\s+doc\./.test(bodyText)) add('FR-024', path, fn.line);
          }
          if (isWhitelisted) {
            // FR-033: slow work (bulk mail / external HTTP / looped writes)
            // with no frappe.enqueue() anywhere in the file.
            if (!hasEnqueue && /(frappe\.sendmail|requests\.(get|post)|urllib|for\s+\w+\s+in\s+\w+\s*:)/.test(bodyText) && /frappe\.sendmail|requests\.|http/.test(bodyText)) {
              // Only flag when the body actually sends mail or calls HTTP.
              if (/frappe\.sendmail|requests\.(get|post)/.test(bodyText)) add('FR-033', path, fn.line);
            }
          }
        }
      }
    }

    if (isJs(path)) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*\/\//.test(line)) continue;
        // FR-012: check on the line with string literals removed, so a
        // rule title / fix string mentioning console.log does not flag.
        if (/\bconsole\.(log|debug)\s*\(/.test(stripStrings(line)) || /\balert\s*\(/.test(stripStrings(line))) add('FR-012', path, i);
        if (/\bfrappe\.(throw|msgprint)\(\s*['"]/.test(line) || /\bfrappe\.show_alert\(\s*['"]/.test(line)) add('FR-009', path, i);
        // FR-004: set_query outside setup/onload.
        if (/frm\.set_query\s*\(/.test(line)) {
          const handler = enclosingJsHandler(lines, i);
          if (handler !== 'setup' && handler !== 'onload') add('FR-004', path, i);
        }
        // FR-020: field behaviour set in JS.
        if (/frm\.(toggle_reqd|set_df_property)\s*\(/.test(line)) add('FR-020', path, i);
        // FR-021: frappe.call inside refresh.
        if (/frappe\.call\s*\(/.test(line)) {
          const handler = enclosingJsHandler(lines, i);
          if (handler === 'refresh') add('FR-021', path, i);
        }
        // FR-026: hardcoded secret in JS.
        if (/(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]{12,}['"]/i.test(line) && !/frappe\.conf/.test(line)) add('FR-026', path, i);
        // FR-028: check on the line with string literals removed, so a
        // fix string mentioning .html() does not flag.
        if (/\.html\(\s*(?:frm\.doc|doc|user|frm|[^)]*(?:notes|remarks|input|content))\b/.test(stripStrings(line))) add('FR-028', path, i);
      }
      // FR-005: duplicate frappe.ui.form.on per DocType in one file.
      {
        const counts = new Map();
        for (let i = 0; i < lines.length; i++) {
          const m = /frappe\.ui\.form\.on\(\s*['"]([^'"]+)['"]/.exec(lines[i]);
          if (!m) continue;
          const n = (counts.get(m[1]) || 0) + 1;
          counts.set(m[1], n);
          if (n > 1) add('FR-005', path, i);
        }
      }
    }

    // FR-027 runs only on real template files, not on .js/.py files that
    // happen to mention {{ }} in a comment or string.
    if (isTemplate(path)) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // FR-027: {{ var }} with no |e filter, or {{ var | safe }}.
        const m = /\{\{\s*([^}]+?)\s*\}\}/g;
        let match;
        while ((match = m.exec(line)) !== null) {
          const expr = match[1];
          if (/\|\s*safe\b/.test(expr)) { add('FR-027', path, i); break; }
          if (!/\|\s*e\b/.test(expr) && /doc\.|user|remarks|notes|content|input/.test(expr)) { add('FR-027', path, i); break; }
        }
      }
    }
  }

  // --- Cross-file checks -------------------------------------------------
  // FR-018: JS validation with no matching server validate in the paired .py.
  {
    const pyByStem = new Map();
    for (const f of input) {
      if (isPy(f.path)) pyByStem.set(f.path.split('/').pop().replace(/\.py$/i, ''), f.content);
    }
    for (const f of input) {
      if (!isJs(f.path)) continue;
      const lines = linesOf(f.content);
      for (let i = 0; i < lines.length; i++) {
        // A validate handler that throws / blocks in JS.
        if (/validate\s*\(\s*frm/.test(lines[i]) || (/frappe\.throw\s*\(/.test(lines[i]) && /validate/.test(lines.slice(Math.max(0, i - 4), i + 1).join('\n')))) {
          const stem = f.path.split('/').pop().replace(/\.js$/i, '');
          const pairedPy = pyByStem.get(stem);
          const hasServerValidate = pairedPy ? /def\s+(validate|before_submit|before_insert)\s*\(/.test(pairedPy) : false;
          // Also accept any .py in the set that validates the same DocType.
          const anyServerValidate = hasServerValidate || [...pyByStem.values()].some((c) => /def\s+(validate|before_submit|before_insert)\s*\(/.test(c));
          if (!anyServerValidate) { add('FR-018', f.path, i); break; }
        }
      }
    }
  }
  // FR-019: frm.call / frappe.call target with no @frappe.whitelist() def.
  {
    const whitelisted = new Set();
    for (const f of input) {
      if (!isPy(f.path)) continue;
      const fns = parsePyFunctions(linesOf(f.content));
      for (const fn of fns) if (/frappe\.whitelist/.test(fn.decorator)) whitelisted.add(fn.name);
    }
    for (const f of input) {
      if (!isJs(f.path)) continue;
      const lines = linesOf(f.content);
      for (let i = 0; i < lines.length; i++) {
        const m = /(?:frm\.call|frappe\.call)\s*\(\s*(?:\{[^}]*method\s*:\s*['"]([^'"]+)['"]|['"]([^'"]+)['"])/.exec(lines[i]);
        if (!m) continue;
        const method = m[1] || m[2];
        const shortName = method.split('.').pop();
        if (method && !whitelisted.has(shortName) && !whitelisted.has(method)) add('FR-019', f.path, i);
      }
    }
  }

  // --- Verdict + summary --------------------------------------------------
  const summary = { blocker: 0, major: 0, minor: 0, total: findings.length };
  for (const f of findings) if (summary[f.severity] !== undefined) summary[f.severity]++;
  const verdict = summary.blocker > 0 ? 'needs rework' : summary.major > 0 ? 'approve with fixes' : 'approve';
  findings.sort((a, b) => {
    const rank = { blocker: 0, major: 1, minor: 2 };
    return rank[a.severity] - rank[b.severity] || a.file.localeCompare(b.file) || a.line - b.line;
  });
  return { findings, verdict, summary };
}

export default checkFiles;
