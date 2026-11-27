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
  { id: 'FR-036', severity: 'blocker', category: 'apis', title: 'self.save() inside validate / before_save / on_update', fix: 'Never call .save() from validate, before_save or on_update; use self.db_set() for a single field, or move the work to a background job (frappe.enqueue with enqueue_after_commit=True).' },
  { id: 'FR-037', severity: 'major', category: 'apis', title: 'Field assigned in on_update is never saved', fix: 'Set the field in validate or before_save, or use self.db_set() in on_update.' },
  { id: 'FR-038', severity: 'major', category: 'apis', title: 'Overridden validate() without super().validate()', fix: 'Call super().validate() first in every overridden validate().' },
  { id: 'FR-039', severity: 'blocker', category: 'security', title: 'frappe.throw() or raise inside a permission hook', fix: 'Never throw or raise in a permission hook; return False to deny and True for users the hook does not restrict.' },
  { id: 'FR-040', severity: 'major', category: 'security', title: 'has_permission hook that can fall through to None', fix: 'End every has_permission hook with an explicit return True for users the hook does not restrict; return False only to deny.' },
  { id: 'FR-041', severity: 'minor', category: 'apis', title: 'cur_frm used in client script', fix: 'Use the frm parameter passed to every form event handler instead of cur_frm.' },
  { id: 'FR-042', severity: 'major', category: 'security', title: 'eval() or exec() in Python code', fix: 'Parse data with frappe.parse_json or json.loads instead of eval/exec; legitimate uses in Frappe apps are near-zero.' },
  { id: 'FR-043', severity: 'minor', category: 'performance', title: 'frappe.enqueue() without queue=', fix: "Always pass queue= explicitly — 'short', 'default' or 'long' — to frappe.enqueue()." },
  { id: 'FR-044', severity: 'blocker', category: 'security', title: 'Shell command built from app code (os.system / subprocess shell=True)', fix: 'Use subprocess.run with a list of arguments and shell=False, or a framework API; never build a shell string from user or document data.' },
  { id: 'FR-045', severity: 'major', category: 'security', title: 'Unsafe deserialization (pickle / yaml.load / marshal / dill / shelve)', fix: 'Use json.loads / frappe.parse_json for data, or yaml.load with Loader=yaml.SafeLoader. Never unpickle data you did not create yourself.' },
  { id: 'FR-046', severity: 'blocker', category: 'security', title: 'Server-side template injection (render_template with a non-literal template)', fix: 'Pass a literal template path or string to render_template; render user-controlled content as data with |e, never as the template itself.' },
  { id: 'FR-047', severity: 'blocker', category: 'apis', title: 'Delete or truncate with no filter (whole table cleared)', fix: 'Always pass a concrete filter to frappe.db.delete, and a WHERE clause to raw DELETE; use truncate only as a deliberate, commented full-table clear.' },
  { id: 'FR-048', severity: 'major', category: 'apis', title: 'DDL in app code (sql_ddl / ALTER / CREATE / DROP / add_index / truncate)', fix: 'Move schema changes into a patch (patches.txt + an execute() function) or into on_doctype_update; never run DDL from a whitelisted method or a lifecycle hook.' },
  { id: 'FR-049', severity: 'blocker', category: 'apis', title: 'Direct write to a ledger doctype (GL Entry / Stock Ledger / Bin / ...)', fix: 'Never write ledger rows directly. Post, cancel or amend through the source document (Sales Invoice, Stock Entry, Payment Entry) and let the framework write the ledger.' },
  { id: 'FR-050', severity: 'blocker', category: 'apis', title: 'Monkey-patching frappe / erpnext / hrms at import time', fix: 'Do not assign attributes on frappe, erpnext or hrms. Use a hook, an override module, or a wrapper function in your own app instead.' },
  { id: 'FR-051', severity: 'major', category: 'apis', title: 'frappe.enqueue() in a lifecycle or whitelisted method without enqueue_after_commit=True', fix: 'Pass enqueue_after_commit=True to every frappe.enqueue() / enqueue_doc() called from a lifecycle method or a whitelisted method.' },
  { id: 'FR-052', severity: 'major', category: 'security', title: 'frappe.qb.get_query() without ignore_permissions=False', fix: 'Pass ignore_permissions=False to frappe.qb.get_query in user-facing code, or use frappe.get_list, which applies permissions.' },
  { id: 'FR-053', severity: 'major', category: 'apis', title: 'Misspelled lifecycle method name (after_save / before_delete / on_saved ...)', fix: 'Rename the method to a lifecycle name the framework calls (on_update, on_submit, before_insert, after_insert, on_trash, after_delete, on_cancel, on_change, autoname, onload, ...), or rename it to a plain helper name and call it from a lifecycle method. The same applies to doc_events keys in hooks.py.' },
  { id: 'FR-054', severity: 'major', category: 'apis', title: 'Request state read inside a lifecycle method (frappe.local.request / form_dict)', fix: 'Read request data only in whitelisted methods and pass it in as an argument; lifecycle methods must work from the document alone.' },
  { id: 'FR-055', severity: 'major', category: 'apis', title: 'return with a value inside before_install', fix: 'Never return a value from before_install; raise with frappe.throw if the install must stop, or return nothing at all.' },
  { id: 'FR-056', severity: 'major', category: 'placement', title: 'Dotted path in hooks.py / patches.txt does not resolve', fix: 'Fix the dotted path to a module and function that exist in the app, or submit the whole app so the checker can resolve it.' },
  { id: 'FR-057', severity: 'major', category: 'placement', title: 'Database or site state read at module level in hooks.py', fix: 'Keep hooks.py to static data only. Move per-site conditions into the handler body, or into a before_enable hook.' },
  { id: 'FR-058', severity: 'major', category: 'performance', title: 'Raw-SQL write without clearing the document cache', fix: 'Call frappe.clear_document_cache(doctype, name) — or frappe.clear_cache(doctype=...) — in the same function after a raw SQL write.' },
  { id: 'FR-059', severity: 'major', category: 'security', title: 'frappe.set_user() without restoration, or frappe.session.user assignment', fix: 'Restore the original user in a finally block after every set_user, or use frappe.only_for / a permission check instead of switching users.' },
  { id: 'FR-060', severity: 'blocker', category: 'security', title: 'Untyped or container-typed whitelisted parameter passed to an ORM query', fix: 'Type every whitelisted parameter (str, int, list[str]) and validate it before the query; accept only scalar values for filter keys, and build filters from a fixed allowlist of fields.' },
  { id: 'FR-061', severity: 'major', category: 'security', title: 'Whitelisted write method declared as GET', fix: 'Declare write methods with methods=["POST"]; never put a write behind a GET endpoint (v16 accepts state-changing calls only over POST).' },
  { id: 'FR-062', severity: 'blocker', category: 'security', title: 'Whitelisted parameter named ignore_* reaches the ORM, or **kwargs forwarded to the ORM', fix: 'Never accept ignore_* as a request parameter; decide server-side, from the user\'s roles, whether a permission check is skipped, and pass a literal False otherwise.' },
  { id: 'FR-063', severity: 'major', category: 'apis', title: 'Check-then-insert race: exists() followed by an insert of the same doctype', fix: 'Insert first and catch frappe.UniqueValidationError, or put a unique index on the field and let the database enforce it; never trust a separate exists() check.' },
  { id: 'FR-064', severity: 'major', category: 'performance', title: 'db_set(..., commit=True) or frappe.db.auto_commit_on_many_writes', fix: 'Drop commit=True and let the request commit once at the end; if a value must be visible to another request immediately, do the work in a background job instead.' },
  { id: 'FR-065', severity: 'major', category: 'security', title: 'TLS verification disabled (verify=False / CERT_NONE / unverified context)', fix: 'Leave TLS verification on; if a local or self-signed certificate is needed, pass its CA bundle to verify= instead of turning verification off.' },
  { id: 'FR-066', severity: 'major', category: 'security', title: 'Weak hash (md5 / sha1) used for a password, token or secret, or compared with ==', fix: 'Hash passwords with frappe.utils.password or passlib, sign tokens with hmac.new(..., hashlib.sha256), and compare secrets only with hmac.compare_digest. Keep md5/sha1 only for cache keys and checksums.' },
  { id: 'FR-067', severity: 'major', category: 'security', title: 'Token or secret generated with random.* / uuid.uuid1 / time.time()', fix: 'Generate tokens with secrets.token_hex / secrets.token_urlsafe, or frappe.generate_hash(); use uuid.uuid4 for random ids.' },
  { id: 'FR-069', severity: 'major', category: 'apis', title: 'Self-referential assignment in validate / before_save (value compounds on every save)', fix: 'Compute the field from its inputs (row.base_qty, the rate, the document) instead of from its own current value; if a running total is needed, reset it to 0 first and sum the rows.' },
  { id: 'FR-070', severity: 'major', category: 'apis', title: 'except block that only passes, continues or logs around a write', fix: 'Re-raise after logging, or roll back and return an explicit error to the caller; never swallow a failed write.' },
  { id: 'FR-071', severity: 'major', category: 'security', title: 'permission_query_conditions hook that can return "" / None (no restriction)', fix: 'Return a real condition for every user, including the administrator ("1=1" when unrestricted); never return an empty string or fall off the end of the hook.' },
  { id: 'FR-072', severity: 'major', category: 'security', title: 'Direct write to docstatus or status with set_value / db_set', fix: 'Change status through the document\'s own method (doc.submit(), doc.cancel(), or the DocType\'s status method) so validate and the workflow run; use set_value only for plain data fields.' },
  { id: 'FR-074', severity: 'major', category: 'security', title: 'Mass assignment: doc.update() with request data, or get_doc(json.loads(...))', fix: 'Copy only the fields the endpoint allows into a new dict (an explicit allowlist), validate each one, then update the document with that dict.' },
  { id: 'FR-075', severity: 'major', category: 'security', title: 'Open redirect: redirect_to / flags.redirect with a request value and no validation', fix: 'Allow only relative paths or URLs on a fixed allowlist of hosts; validate with urlparse and reject anything that does not start with / or the app\'s own domain.' },
  { id: 'FR-076', severity: 'major', category: 'security', title: 'Server-side request forgery: requests / urlopen / httpx with a request-controlled URL', fix: 'Build the URL server-side from a fixed allowlist of hosts or from frappe.conf; never let a request parameter choose the host or scheme.' },
  { id: 'FR-078', severity: 'major', category: 'apis', title: 'Controller class name does not match its DocType file', fix: 'Name the controller class after the DocType: remove the spaces from the DocType name (Sales Order becomes SalesOrder) and use exactly that name in the file named after the DocType.' },
  { id: 'FR-079', severity: 'major', category: 'apis', title: 'Another document created or saved inside validate() / before_save()', fix: 'Move document creation and saves of other documents to on_update, on_submit, or a background job; validate() and before_save() should only check and normalise this document.' },
  { id: 'FR-080', severity: 'major', category: 'performance', title: 'External HTTP call inside validate() / before_save() blocks every save', fix: 'Fetch external data in a background job or cache it and read the cached value in validate(); never call the network from a lifecycle method that runs on every save.' },
  { id: 'FR-081', severity: 'minor', category: 'server-client', title: 'Synchronous frappe.call (async: false) freezes the Desk UI', fix: 'Drop async: false and use the callback (or await frappe.xcall) — frappe.call is asynchronous by default and the UI stays responsive.' },
  { id: 'FR-082', severity: 'major', category: 'security', title: 'Secret value written to a log or print output', fix: 'Log only that a secret is set or that an operation failed, never the secret itself; mask it first if it must appear in a message.' },
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

// FR-082 helper: does a log/print call argument contain a secret VALUE?
// A message that merely mentions a secret name is a string literal and
// is stripped first, so it does not fire. F-string interpolations
// ({...}) are values, not text, so they are kept. Logging only whether
// a secret is set — bool(secret) / len(secret) — does not fire. An
// identifier counts as secret-named when one of its underscore-separated
// parts is secret/password/passwd/token, or when the whole name (minus
// separators) is a known secret name (api_key, api_secret, client_secret,
// access_token, auth_token, private_key, secret_key). A word that merely
// contains "token" (tokenizer) does not fire.
const SECRET_NAME_RE = /^(?:secret|password|passwd|token|apikey|apisecret|clientsecret|accesstoken|refreshtoken|authtoken|privatekey|secretkey)$/;
function hasSecretIdentifier(argText) {
  const kept = argText.replace(/f(['"])(?:[^\\]|\\.)*?\1/g, (m) => {
    const parts = [];
    const re = /\{([^{}]+)\}/g;
    let mm;
    while ((mm = re.exec(m)) !== null) parts.push(mm[1]);
    return parts.length ? ' ' + parts.join(' ') + ' ' : "''";
  });
  const stripped = stripStrings(kept).replace(/\b(?:bool|len)\s*\([^)]*\)/g, '');
  const idents = stripped.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
  for (const id of idents) {
    const parts = id.toLowerCase().split('_');
    if (parts.some((p) => p === 'secret' || p === 'password' || p === 'passwd' || p === 'token')) return true;
    if (SECRET_NAME_RE.test(id.toLowerCase().replace(/_/g, ''))) return true;
  }
  return false;
}

// Join a call starting at lines[i] from column startCol, following
// continuation lines until the parens balance (up to 10 lines).
// Returns { text, endIndex }.
function joinCallText(lines, i, startCol) {
  let text = lines[i].slice(startCol);
  let depth = (text.match(/\(/g) || []).length - (text.match(/\)/g) || []).length;
  let k = i;
  while (depth > 0 && k + 1 < lines.length && k - i < 10) {
    k++;
    text += '\n' + lines[k];
    depth += (lines[k].match(/\(/g) || []).length - (lines[k].match(/\)/g) || []).length;
  }
  return { text, endIndex: k };
}

// A comment on the flagged line or the two lines above it (the deliberate
// full-table-clear / ignore_permissions comment rule).
function hasNearbyComment(lines, i) {
  return /#/.test(lines[i] || '') || (i > 0 && /#/.test(lines[i - 1])) || (i > 1 && /#/.test(lines[i - 2]));
}

// Small edit-distance helper for FR-053 (misspelled lifecycle names).
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Lifecycle method names the framework actually calls (B33's list).
const VALID_LIFECYCLE = new Set([
  'before_validate', 'validate', 'before_save', 'before_submit', 'before_cancel',
  'before_update_after_submit', 'on_update', 'on_submit', 'on_cancel',
  'on_update_after_submit', 'on_change', 'before_insert', 'after_insert',
  'on_trash', 'after_delete', 'before_rename', 'after_rename', 'autoname',
  'before_naming', 'onload', 'before_print', 'before_discard', 'on_discard',
]);
// Known wrong names that look like lifecycle methods but are never called.
const WRONG_LIFECYCLE = new Set([
  'after_save', 'before_delete', 'on_saved', 'after_submit', 'before_load', 'on_submitted',
]);
function isLifecycleName(name) {
  return VALID_LIFECYCLE.has(name);
}
function isWrongLifecycleName(name) {
  if (WRONG_LIFECYCLE.has(name)) return true;
  if (VALID_LIFECYCLE.has(name)) return false;
  for (const valid of VALID_LIFECYCLE) {
    if (levenshtein(name, valid) <= 2) return true;
  }
  return false;
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

// Escape a string for use inside a RegExp.
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse a def header (which may span lines) into its parameters:
// [{ name, annotation, default, rest (*args), kwargs (**kwargs) }].
// parsePyFunctions only keeps parameter names; the second-pass rules
// (FR-060, FR-062, FR-074) need the annotations too.
function paramInfo(lines, fnLine) {
  let text = lines[fnLine] || '';
  let depth = (text.match(/\(/g) || []).length - (text.match(/\)/g) || []).length;
  let k = fnLine;
  while (depth > 0 && k + 1 < lines.length && k - fnLine < 10) {
    k++;
    text += '\n' + lines[k];
    depth += (lines[k].match(/\(/g) || []).length - (lines[k].match(/\)/g) || []).length;
  }
  const inner = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
  const parts = [];
  let d = 0, cur = '', inStr = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      cur += ch;
      if (ch === inStr && inner[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') d++;
    if (ch === ')' || ch === ']' || ch === '}') d--;
    if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => {
    let s = p.trim();
    let rest = false, kw = false;
    if (s.startsWith('**')) { kw = true; s = s.slice(2).trim(); }
    else if (s.startsWith('*')) { rest = true; s = s.slice(1).trim(); }
    // Split the default on the first top-level '='.
    let deflt = '';
    let dd = 0, eq = -1;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(' || ch === '[' || ch === '{') dd++;
      if (ch === ')' || ch === ']' || ch === '}') dd--;
      if (ch === '=' && dd === 0 && s[i + 1] !== '=') { eq = i; break; }
    }
    if (eq !== -1) { deflt = s.slice(eq + 1).trim(); s = s.slice(0, eq).trim(); }
    let name = s, annotation = '';
    const colon = s.indexOf(':');
    if (colon !== -1) { name = s.slice(0, colon).trim(); annotation = s.slice(colon + 1).trim(); }
    return { name, annotation, default: deflt, rest, kwargs: kw };
  }).filter((p) => p.name && p.name !== 'self' && p.name !== 'cls');
}

// Can a caller pass a dict/list through this parameter? True when the
// parameter has no annotation, a dict/list annotation (including a
// union with dict/list), a string annotation, or a dict/list default.
// With `from __future__ import annotations` every annotation is a
// string at runtime, so nothing can be trusted to be a scalar.
function isContainerCapable(p, futureAnnotations) {
  if (!p.annotation) return true;
  const a = p.annotation.trim();
  if (/^['"]/.test(a)) return true;
  if (futureAnnotations) return true;
  if (/\b(dict|list)\b/i.test(a)) return true;
  if (p.default && /^\s*(\{|\[)/.test(p.default)) return true;
  return false;
}

// Variables assigned from request data inside a function body: a bare
// name assigned from frappe.form_dict / frappe.local.request /
// json.loads(...). The redirect (FR-075) and SSRF (FR-076) checks
// treat such a variable as request-controlled.
function taintedRequestVars(bodyLines) {
  const tainted = new Set();
  for (const b of bodyLines) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(b.text);
    if (m && /frappe\.(?:local\.)?(?:form_dict|request)\b|json\.loads\s*\(/.test(m[2])) tainted.add(m[1]);
  }
  return tainted;
}

// Does a permission hook function end with a return on every path?
// Used by FR-040 (has_permission) and FR-071
// (permission_query_conditions). "Ends" means the last top-level
// statement of the body: a return nested inside an if does not end
// the function — the code after the if still runs. An if/else chain
// where every branch ends in a return is safe (no fall-through path).
function hookEndsWithReturn(bodyLines) {
  const body = bodyLines.filter((b) => b.text.trim() !== '' && !isCommentPy(b.text));
  if (!body.length) return false;
  const bodyIndent = indentOf(body[0].text);
  const top = body.filter((b) => indentOf(b.text) === bodyIndent);
  const lastTop = top[top.length - 1];
  if (/^\s*return\b/.test(lastTop.text)) return true;
  if (/^\s*(if|elif|else)\b/.test(lastTop.text)) {
    // Last top-level statement is an if-chain: safe only if the chain
    // has an else and every branch ends in a return. The chain may end
    // in an else, so walk backwards from the last branch to the `if`
    // that starts the chain, then check each branch's last statement.
    let chainStart = body.indexOf(lastTop);
    for (let j = chainStart - 1; j >= 0; j--) {
      const lb = body[j];
      if (indentOf(lb.text) === bodyIndent && /^\s*(if|elif|else)\b/.test(lb.text)) chainStart = j;
      else if (indentOf(lb.text) > bodyIndent) continue; // branch body
      else break;
    }
    const chain = [];
    let cur = null;
    const chainLines = body.slice(chainStart);
    for (const b of chainLines) {
      if (indentOf(b.text) === bodyIndent && /^\s*(if|elif|else)\b/.test(b.text)) {
        cur = { kind: /^\s*else\b/.test(b.text) ? 'else' : 'if', last: null };
        chain.push(cur);
      } else if (cur && indentOf(b.text) > bodyIndent) {
        cur.last = b;
      }
    }
    const hasElse = chain.some((c) => c.kind === 'else');
    const allReturn = chain.length > 0 && chain.every((c) => c.last && /^\s*return\b/.test(c.last.text));
    if (hasElse && allReturn) return true;
  }
  return false;
}

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

  // --- Module index for FR-056 (dotted-path resolution) --------------
  // dotted module name -> { file, defs:Set, classes:Set }. Built from every
  // submitted .py file EXCEPT hooks.py (a hook function defined in hooks.py
  // itself is resolved through the hooks.py entry added below). A lone
  // hooks.py with no other .py files leaves the index with only hooks.py,
  // and FR-056 is skipped in that case — a single-file paste cannot
  // resolve dotted paths.
  const pyModuleIndex = new Map();
  const pyTopSegments = new Set();
  function dottedNamesForPath(p) {
    let segs = p.replace(/^\//, '').split('/');
    if (segs[0] === 'apps') segs = segs.slice(2);
    let last = segs[segs.length - 1].replace(/\.py$/i, '');
    if (last === '__init__') segs = segs.slice(0, -1);
    else segs[segs.length - 1] = last;
    const names = [segs.join('.')];
    if (segs.length > 1) names.push(segs.slice(1).join('.'));
    if (segs.length > 2 && segs[1] === segs[0]) names.push(segs.slice(2).join('.'));
    return names.filter(Boolean);
  }
  for (const f of input) {
    if (!isPy(f.path)) continue;
    const fns = parsePyFunctions(linesOf(f.content || ''));
    const defs = new Set(fns.map((fn) => fn.name));
    const classes = new Set();
    for (const line of linesOf(f.content || '')) {
      const cm = /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(line);
      if (cm) classes.add(cm[1]);
    }
    for (const dotted of dottedNamesForPath(f.path)) {
      if (!pyModuleIndex.has(dotted)) pyModuleIndex.set(dotted, { file: f.path, defs, classes });
      pyTopSegments.add(dotted.split('.')[0]);
    }
  }
  // Does dotted path `dotted` resolve against the submitted files?
  // 'skip' = unverifiable (another app's module, or no other files).
  function resolveDotted(dotted) {
    const first = dotted.split('.')[0];
    if (['frappe', 'erpnext', 'hrms', 'crm', 'helpdesk'].includes(first)) return 'skip';
    if (!pyTopSegments.has(first)) return 'skip';
    if (pyModuleIndex.has(dotted)) return true;
    const lastDot = dotted.lastIndexOf('.');
    if (lastDot === -1) return false;
    const mod = dotted.slice(0, lastDot);
    const name = dotted.slice(lastDot + 1);
    const entry = pyModuleIndex.get(mod);
    if (!entry) return false;
    return entry.defs.has(name) || entry.classes.has(name);
  }
  // Is a quoted string a dotted-path candidate? Dots, no spaces/slashes,
  // identifier segments, not a version number or a file name.
  function isDottedPathCandidate(s) {
    if (!s.includes('.') || /[\s/@]/.test(s) || /\.(py|js|html|json|md|txt|css)$/i.test(s)) return false;
    const segs = s.split('.');
    if (segs.length < 2) return false;
    if (segs.every((g) => /^\d+$/.test(g))) return false; // version like 1.2.3
    return segs.every((g) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(g));
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
      // Lines inside a `with ... patch(` block (FR-050 exemption):
      // unittest.mock.patch blocks replace framework attributes on purpose.
      const inPatchWithBlock = new Set();
      {
        let patchIndent = null;
        for (let pi = 0; pi < lines.length; pi++) {
          const pl = lines[pi];
          if (pl.trim() === '' || isCommentPy(pl)) continue;
          const pind = indentOf(pl);
          if (patchIndent !== null && pind <= patchIndent && pl.trim()) { patchIndent = null; }
          if (/^\s*with\b.*\bpatch\s*\(/.test(pl)) { patchIndent = pind; continue; }
          if (patchIndent !== null && pind > patchIndent) inPatchWithBlock.add(pi);
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
        // FR-013: get_doc(...) followed by a single-field access.
        // Fires ONLY on a plain field access (.field or ["field"]).
        // A method call after get_doc (.set_status(), .save(), .insert())
        // is an action on the document, not a single-field read.
        // Creating a document is NOT a single-field read either: a dict
        // first argument (creation form) means the document is being
        // made, not read.
        {
          const start = line.indexOf('frappe.get_doc(');
          if (start !== -1) {
            const open = line.indexOf('(', start);
            const afterOpen = line.slice(open + 1).trimStart();
            const isCreationForm = afterOpen.startsWith('{');
            // Scan to the matching close paren (handles nested calls).
            let depth = 0;
            let close = -1;
            for (let k = open; k < line.length; k++) {
              if (line[k] === '(') depth++;
              else if (line[k] === ')') { depth--; if (depth === 0) { close = k; break; } }
            }
            if (close !== -1 && !isCreationForm) {
              const rest = line.slice(close + 1).trimStart();
              const methodCall = /^\.\w+\s*\(/.test(rest);
              const fieldAccess = /^\.\w+(?!\s*\()/.test(rest) || /^\[\s*['"]/.test(rest);
              if (fieldAccess && !methodCall) add('FR-013', path, i);
            }
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
        // FR-082: a secret value written to a log or print output. A
        // message that only mentions a secret name does not fire (the
        // string is stripped); hasSecretIdentifier keeps f-string
        // interpolations, which are values. print() also fires FR-011.
        if (/(?:^\s*print\s*\(|frappe\.log(?:_error)?\s*\(|frappe\.logger\s*\(\s*\)\s*\.\s*(?:info|debug|warning|error|exception|critical)\s*\(|(?:logger|log)\.(?:info|debug|warning|error|exception|critical)\s*\()/.test(line) && hasSecretIdentifier(line)) add('FR-082', path, i);
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
        // FR-057 — hooks.py must be static data. Handled below (outside-def
      // scan), not in the per-line loop.
      // FR-049 / FR-050 — per-line checks (ledger writes, monkey-patching).
      {
        const LEDGER = ['GL Entry', 'Stock Ledger Entry', 'Payment Ledger Entry', 'Bin', 'Serial and Batch Bundle'];
        const ledgerHit = LEDGER.find((d) => line.includes(`"${d}"`) || line.includes(`'${d}'`));
        if (ledgerHit) {
          // A write on the same line as the ledger doctype name. Reads
          // (get_value, get_list, get_all, a get_doc field read) do not fire.
          if (/frappe\.db\.set_value\s*\(/.test(line) || /\.(insert|save|submit|delete)\s*\(/.test(line)
            || /frappe\.(delete_doc|new_doc)\s*\(/.test(line) || /frappe\.get_doc\s*\(\s*\{/.test(line)) {
            add('FR-049', path, i);
          } else if (/frappe\.db\.sql\s*\(/.test(line) && /\b(insert|update|delete)\b/i.test(line)) {
            add('FR-049', path, i);
          }
        }
        // Raw SQL on a ledger table: `tabGL Entry` etc. with a write verb.
        if (/\btab(?:GL Entry|Stock Ledger Entry|Payment Ledger Entry|Bin|Serial and Batch Bundle)\b/.test(line)
          && /\b(insert|update|delete)\b/i.test(line) && !/\bselect\b/i.test(line)) {
          add('FR-049', path, i);
        }
        // FR-050: assignment to an attribute of frappe / erpnext / hrms, or
        // setattr() on one of them. frappe.local / frappe.conf /
        // frappe.session are excluded (local state and FR-059 territory).
        // Test files and unittest.mock.patch with-blocks are exempt.
        const inTestFile = /(^|\/)(tests?)\//i.test(path) || /^test_/.test(base) || /_test\.py$/i.test(base);
        if (!inTestFile && !inPatchWithBlock.has(i)) {
          if (/\bsetattr\s*\(\s*(?:frappe|erpnext|hrms)\b/.test(line)) add('FR-050', path, i);
          else {
            const assign = /^\s*(frappe|erpnext|hrms)\.([A-Za-z_][A-Za-z0-9_.]*)\s*=(?!=)/.exec(line);
            if (assign) {
              const firstAttr = assign[2].split('.')[0];
              if (!['local', 'conf', 'session'].includes(firstAttr)) add('FR-050', path, i);
            }
          }
        }
        // FR-059 (b): direct assignment to frappe.session.user.
        if (/frappe\.session\.user\s*=(?!=)/.test(line)) add('FR-059', path, i);
      }
      // FR-042: eval() / exec() in Python code. Check the line with
        // string literals removed, so a message mentioning eval does not
        // flag; a real call still does.
        if (/\b(?:eval|exec)\s*\(/.test(stripStrings(line))) add('FR-042', path, i);
      // FR-064 / FR-065 / FR-066 / FR-067 / FR-072 / FR-074 (request
      // form) — per-line checks, second pass (2026-11-27).
      {
        const inTestFile = /(^|\/)(tests?)\//i.test(path) || /^test_/.test(base) || /_test\.py$/i.test(base);
        const stripped = stripStrings(line);
        const strippedAll = lines.map(stripStrings);
        // FR-064: db_set(..., commit=True) or auto_commit_on_many_writes
        // commits mid-request. Exempt in patch files, where a commit is
        // the point of the migration.
        if (!/\/patches\//.test(path)) {
          if (/auto_commit_on_many_writes/.test(line)) add('FR-064', path, i);
          const dbSet = /\.db_set\s*\(/.exec(stripped);
          if (dbSet) {
            const { text, endIndex } = joinCallText(strippedAll, i, dbSet.index);
            if (/commit\s*=\s*True\b/.test(text)) add('FR-064', path, i);
            i = endIndex;
          }
        }
        // FR-065: TLS verification off. Test files are exempt.
        if (!inTestFile && (/verify\s*=\s*False\b/.test(stripped) || /CERT_NONE\b/.test(stripped)
          || /ssl\._create_unverified_context\s*\(/.test(stripped) || /check_hostname\s*=\s*False\b/.test(stripped))) {
          add('FR-065', path, i);
        }
        // FR-066: md5/sha1 for a security-named value, or a secret
        // compared with ==. A variable named cache / etag / checksum
        // (a cache key or checksum, not a secret) does not fire.
        {
          const secVar = /(?:password|passwd|token|secret|signature|api[_-]?key|auth_token|_?hash)/i;
          if (/\bhashlib\.(?:md5|sha1)\s*\(/.test(stripped)) {
            const assign = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(stripped);
            if (assign && secVar.test(assign[1])) add('FR-066', path, i);
            else if (/==/.test(stripped)) add('FR-066', path, i);
          } else if (/==/.test(stripped) && !/hmac\.compare_digest/.test(stripped) && !inTestFile) {
            // Both sides must be security-named variables (a literal on
            // either side, e.g. `password == ""`, is a check, not a
            // secret comparison).
            const leftVar = /([A-Za-z_][A-Za-z0-9_.]*)\s*$/.exec(stripped.split('==')[0]);
            const rightVar = /^\s*([A-Za-z_][A-Za-z0-9_.]*)/.exec(stripped.split('==')[1] || '');
            if (leftVar && rightVar && secVar.test(leftVar[1]) && secVar.test(rightVar[1])) add('FR-066', path, i);
          }
        }
        // FR-067: a token/secret built from random.* / uuid.uuid1 /
        // time.time(). A bare `import random` does not fire; test files
        // are exempt.
        if (!inTestFile) {
          const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(stripped);
          if (m && /(?:token|secret|password|invite|reset|otp|nonce|api[_-]?key|session)/i.test(m[1])
            && /\brandom\.(?:random|randint|choice|randrange|uniform|sample)\s*\(|uuid\.uuid1\s*\(|time\.time\s*\(/.test(m[2])) {
            add('FR-067', path, i);
          }
        }
        // FR-072: direct write to docstatus / status with set_value /
        // db_set. A dict field argument (set_value(..., {"status": ...}))
        // is not a literal field name and does not fire.
        if (/frappe\.db\.set_value\s*\(\s*['"][^'"]+['"]\s*,\s*[^,]+,\s*['"](?:docstatus|status)['"]/.test(line)
          || /\.(?:set_value|db_set)\s*\(\s*['"](?:docstatus|status)['"]/.test(line)) {
          add('FR-072', path, i);
        }
        // FR-074 (request form): doc.update(frappe.form_dict...) /
        // .update(json.loads(...)) / frappe.get_doc(json.loads(...)).
        // The bare-parameter form is in the whitelisted-function block.
        if (/\.(?:update)\s*\(\s*(?:frappe\.(?:local\.)?form_dict\b|json\.loads\s*\()/.test(stripped)
          || /frappe\.get_doc\s*\(\s*json\.loads\s*\(/.test(stripped)) {
          add('FR-074', path, i);
        }
      }
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
      // FR-043: frappe.enqueue() without an explicit queue= keyword.
      // Multi-line calls are joined (parens balanced) before checking,
      // since queue= usually sits on its own line.
      {
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const start = stripStrings(lines[i]).indexOf('frappe.enqueue(');
          if (start === -1) continue;
          let callText = stripStrings(lines[i]).slice(start);
          let depth = (callText.match(/\(/g) || []).length - (callText.match(/\)/g) || []).length;
          let k = i;
          while (depth > 0 && k + 1 < lines.length && k - i < 10) {
            k++;
            const next = stripStrings(lines[k]);
            callText += '\n' + next;
            depth += (next.match(/\(/g) || []).length - (next.match(/\)/g) || []).length;
          }
          if (!/\bqueue\s*=/.test(callText)) add('FR-043', path, i);
          i = k; // skip the joined continuation lines
        }
      }
      // FR-044 / FR-045 / FR-046 / FR-047 / FR-048 / FR-052 — call-site
      // checks that need a whole (possibly multi-line) call, not one line.
      {
        // FR-044: shell execution from app code.
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const code = stripStrings(lines[i]);
          if (/\bos\.system\s*\(/.test(code) || /\bos\.popen\s*\(/.test(code)
            || /frappe\.utils\.execute_in_shell\s*\(/.test(code)) {
            add('FR-044', path, i);
            continue;
          }
          const subIdx = code.search(/\bsubprocess\.\w+\s*\(/);
          if (subIdx !== -1) {
            const { text, endIndex } = joinCallText(lines.map(stripStrings), i, subIdx);
            if (/\bshell\s*=\s*True\b/.test(text)) add('FR-044', path, i);
            i = endIndex;
          }
        }
        // FR-045: unsafe deserialization.
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const code = stripStrings(lines[i]);
          if (/\b(?:pickle|marshal|dill)\.loads?\s*\(/.test(code)
            || /\bshelve\.open\s*\(/.test(code) || /\bjsonpickle\.decode\s*\(/.test(code)) {
            add('FR-045', path, i);
            continue;
          }
          const yIdx = code.search(/\byaml\.load\s*\(/);
          if (yIdx !== -1) {
            const { text, endIndex } = joinCallText(lines.map(stripStrings), i, yIdx);
            if (!/SafeLoader/.test(text)) add('FR-045', path, i);
            i = endIndex;
          }
        }
        // FR-046: SSTI — render_template / render_jinja / Template with a
        // non-literal first argument. A literal string first argument is
        // safe; a variable, attribute, call or f-string is the template
        // itself coming from data. String literals are stripped first, so
        // a literal first argument shows up as '' (still a quote) while a
        // message mentioning render_template does not flag.
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const stripped = lines.map(stripStrings);
          const m = /(?:frappe\.)?render_template\s*\(|(?:frappe\.)?render_jinja\s*\(|(?:jinja2\.)?Template\s*\(/.exec(stripped[i]);
          if (!m) continue;
          const { text, endIndex } = joinCallText(stripped, i, m.index);
          const afterOpen = text.slice(text.indexOf('(') + 1).trimStart();
          // A keyword first argument (template=...) counts too.
          const argText = afterOpen.replace(/^template\s*=\s*/, '');
          if (!/^['"]/.test(argText)) add('FR-046', path, i);
          i = endIndex;
        }
        // FR-047: delete / truncate with no filter. A comment on the line
        // or the two lines above it (a deliberate full-table clear, e.g.
        // log rotation) exempts the call — same comment rule as FR-025.
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const code = lines[i];
          if (/frappe\.db\.truncate\s*\(/.test(code)) {
            if (!hasNearbyComment(lines, i)) add('FR-047', path, i);
            continue;
          }
          const delIdx = code.search(/frappe\.db\.delete\s*\(/);
          if (delIdx !== -1) {
            const { text, endIndex } = joinCallText(lines, i, delIdx);
            // Split the call's top-level arguments (depth-aware).
            const inner = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
            const args = [];
            let depth = 0;
            let cur = '';
            for (const ch of inner) {
              if (ch === '(' || ch === '[' || ch === '{') depth++;
              if (ch === ')' || ch === ']' || ch === '}') depth--;
              if (ch === ',' && depth === 0) { args.push(cur); cur = ''; } else cur += ch;
            }
            args.push(cur);
            const second = (args[1] || '').trim();
            if (args.length < 2 || second === '' || second === '{}' || /^[A-Za-z_][A-Za-z0-9_]*$/.test(second)) {
              if (!hasNearbyComment(lines, i)) add('FR-047', path, i);
            }
            i = endIndex;
            continue;
          }
          // Raw DELETE / TRUNCATE in frappe.db.sql with no WHERE.
          const sqlIdx = code.search(/frappe\.db\.sql\s*\(/);
          if (sqlIdx !== -1) {
            const { text, endIndex } = joinCallText(lines, i, sqlIdx);
            if (/\bdelete\s+from\b/i.test(text) || /\btruncate\b/i.test(text)) {
              if (!/\bwhere\b/i.test(text) && !hasNearbyComment(lines, i)) add('FR-047', path, i);
            }
            i = endIndex;
          }
        }
        // FR-048: DDL in app code. Exempt inside a patch file (path
        // containing /patches/) and inside a def named on_doctype_update.
        {
          const fns = parsePyFunctions(lines);
          const inPatchFile = /(^|\/)patches\//.test(path);
          const inOnDoctypeUpdate = (lineIdx) => fns.some((fn) => fn.name === 'on_doctype_update'
            && lineIdx > fn.line && fn.bodyLines.some((b) => b.line === lineIdx));
          for (let i = 0; i < lines.length; i++) {
            if (isCommentPy(lines[i]) || inPatchFile || inOnDoctypeUpdate(i)) continue;
            const code = lines[i];
            if (/frappe\.db\.sql_ddl\s*\(/.test(code) || /\badd_index\s*\(/.test(code)
              || /frappe\.db\.truncate\s*\(/.test(code)) {
              add('FR-048', path, i);
              continue;
            }
            const sqlIdx = code.search(/frappe\.db\.sql\s*\(/);
            if (sqlIdx !== -1) {
              const { text, endIndex } = joinCallText(lines, i, sqlIdx);
              if (/\balter\s+table\b/i.test(text) || /\bcreate\s+table\b/i.test(text)
                || /\bcreate\s+index\b/i.test(text) || /\bdrop\s+table\b/i.test(text)) {
                add('FR-048', path, i);
              }
              i = endIndex;
            }
          }
        }
        // FR-052: frappe.qb.get_query without ignore_permissions=False.
        // String literals are stripped first, so a message mentioning
        // get_query does not flag.
        for (let i = 0; i < lines.length; i++) {
          if (isCommentPy(lines[i])) continue;
          const stripped = lines.map(stripStrings);
          const m = /(?:frappe\.qb|qb)\.get_query\s*\(/.exec(stripped[i]);
          if (!m) continue;
          const { text, endIndex } = joinCallText(stripped, i, m.index);
          if (!/ignore_permissions\s*=\s*False\b/.test(text)) add('FR-052', path, i);
          i = endIndex;
        }
      }
      // FR-023 / FR-024 / FR-033 / FR-060 / FR-061 / FR-062 / FR-074
      // (param form) — per whitelisted function.
      {
        const fns = parsePyFunctions(lines);
        const hasEnqueue = /frappe\.enqueue\s*\(/.test(content);
        const strippedAll = lines.map(stripStrings);
        const futureAnnotations = /from\s+__future__\s+import\s+annotations/.test(content);
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
          if (isWhitelisted) {
            const infos = paramInfo(lines, fn.line);
            // FR-060: an untyped or container-typed parameter reaching an
            // ORM sink (get_all / get_list / get_value / exists / count /
            // delete) as a filters= value or a positional filter
            // argument. A typed scalar parameter (str, int, ...) that is
            // coerced with str()/int()/cint() first does not fire.
            // get_query is NOT a sink: it takes its own filters and
            // applies its own permission handling.
            {
              const containerParams = infos
                .filter((p) => !p.kwargs && !p.rest && isContainerCapable(p, futureAnnotations))
                .map((p) => p.name);
              const tainted = taintedRequestVars(fn.bodyLines);
              const SINKS = /frappe\.(?:get_all|get_list)\s*\(|frappe\.db\.(?:get_value|exists|count|delete)\s*\(/;
              for (const b of fn.bodyLines) {
                if (isCommentPy(b.text)) continue;
                const m = SINKS.exec(strippedAll[b.line]);
                if (!m) continue;
                const { text } = joinCallText(strippedAll, b.line, m.index);
                let fire = false;
                if (/filters\s*=\s*frappe\.(?:local\.)?form_dict\b/.test(text) || /filters\s*=\s*json\.loads\s*\(/.test(text)) fire = true;
                const filtersArg = /filters\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
                if (!fire && filtersArg && (containerParams.includes(filtersArg[1]) || tainted.has(filtersArg[1]))) fire = true;
                if (!fire) {
                  for (const p of containerParams) {
                    const coerced = new RegExp('\\b(?:str|cstr|int|cint|flt|float)\\s*\\(\\s*' + escapeRe(p) + '\\b').test(text);
                    if (!coerced && new RegExp('\\b' + escapeRe(p) + '\\b').test(text)) { fire = true; break; }
                  }
                }
                if (fire) add('FR-060', path, b.line);
              }
            }
            // FR-061: a whitelisted method declared methods=["GET"] that
            // writes. GET is not CSRF-protected. Only the single-line
            // decorator form is seen here; a multi-line decorator with
            // methods= on a later line does not fire.
            if (/methods\s*=\s*\[?\s*["']GET["']/.test(fn.decorator)) {
              if (WRITE_CALL_RE.test(bodyText) || /frappe\.db\.(?:set_value|delete|sql)\s*\(/.test(bodyText) || /\.db_set\s*\(/.test(bodyText)) add('FR-061', path, fn.line);
            }
            // FR-062: a whitelisted parameter named ignore_* reaching
            // the ORM as an ignore_*= keyword, or **kwargs forwarded
            // into get_doc / get_list / get_value / save / insert.
            // FR-025 covers only a literal ignore_permissions=True;
            // this is the parameterised form. An ignore_* attribute
            // (self.ignore_linked_doctypes) is not a parameter and
            // does not fire.
            {
              const ignoreParams = infos
                .filter((p) => /^ignore_(?:permissions|validate|mandatory|links|share|user_permissions|account_permission)$/.test(p.name))
                .map((p) => p.name);
              let fired = false;
              for (const p of ignoreParams) {
                if (new RegExp('ignore_(?:permissions|validate|mandatory|links|share|user_permissions|account_permission)\\s*=\\s*' + escapeRe(p) + '\\b').test(bodyText)) { fired = true; break; }
              }
              const hasKwargs = infos.some((p) => p.kwargs);
              if (!fired && hasKwargs && (/\bget_(?:doc|list|value)\s*\([^)]*\*\*kwargs/.test(bodyText) || /\.(?:save|insert)\s*\([^)]*\*\*kwargs/.test(bodyText))) fired = true;
              if (fired) add('FR-062', path, fn.line);
            }
            // FR-074 (param form): .update(<param>) in a whitelisted
            // function applies a request parameter to a document whole.
            // The form_dict / json.loads form is in the per-line loop.
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const m = /\.update\s*\(/.exec(strippedAll[b.line]);
              if (!m) continue;
              const { text } = joinCallText(strippedAll, b.line, m.index);
              const arg = /\.update\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
              if (arg && infos.some((p) => p.name === arg[1])) add('FR-074', path, b.line);
            }
          }
        }
      }
      // FR-078: controller class name must match its DocType file.
      // Only in /doctype/ folders, only classes extending Document
      // (directly or through a *Controller base). The comparison is
      // case-insensitive, so acronym casing (FMManufacturingPolicy in
      // fm_manufacturing_policy.py) does not fire — only a genuinely
      // different name does, which means Frappe never loads the
      // controller and its lifecycle methods silently never run.
      if (/\/doctype\//.test(path)) {
        const stem = (path.split('/').pop() || '').replace(/\.py$/i, '').replace(/_/g, '').toLowerCase();
        for (let i = 0; i < lines.length; i++) {
          const cm = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:/.exec(lines[i]);
          if (!cm) continue;
          if (!/\b(Document|WebsiteGenerator|[A-Za-z_][A-Za-z0-9_]*Controller)\b/.test(cm[2])) continue;
          if (cm[1].toLowerCase() !== stem) add('FR-078', path, i);
        }
      }
      // FR-036 / FR-037 / FR-038 — controller lifecycle methods.
      {
        const fns = parsePyFunctions(lines);
        for (const fn of fns) {
          if (!fn.isDocumentClass) continue;
          const bodyText = fn.bodyLines.map((b) => b.text).join('\n');
          if (fn.name === 'validate' || fn.name === 'before_save' || fn.name === 'on_update') {
            // FR-036: .save() inside validate / before_save / on_update
            // re-enters the same hook forever. A flags-based recursion
            // guard (self.flags...) in the method exempts it.
            if (!/self\.flags\b/.test(bodyText)) {
              const saveLine = fn.bodyLines.find((b) => !isCommentPy(b.text) && /(?:self|doc)\.save\s*\(/.test(b.text));
              if (saveLine) add('FR-036', path, saveLine.line);
            }
          }
          if (fn.name === 'on_update') {
            // FR-037: assigning self.<field> in on_update is lost — the
            // document is already saved. self.flags.* assignments and
            // self.db_set(...) calls are exempt. The (?!=) keeps a
            // comparison (self.x == 1) from firing.
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const m = /^\s*self\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:\+|-|\*|\/)?=(?!=)/.exec(b.text);
              if (m && m[1] !== 'flags') add('FR-037', path, b.line);
            }
          }
          if (fn.name === 'validate') {
            // FR-038: overridden validate() without super().validate().
            if (!/super\(\)\.validate\s*\(/.test(bodyText)) add('FR-038', path, fn.line);
          }
          if (fn.name === 'validate' || fn.name === 'before_save') {
            // FR-079: creating or saving another document inside
            // validate / before_save — the document may never save, so
            // the side effect runs on every save attempt. self.save()
            // is FR-036, not this rule. String literals are stripped
            // first, so a message mentioning insert() does not fire.
            // FR-080: a synchronous external HTTP call inside validate
            // / before_save blocks every save on the network. The same
            // call in on_update or a whitelisted method is the normal
            // place for external sync and does not fire here.
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const stripped = stripStrings(b.text);
              if (/\.insert\s*\(/.test(stripped)) { add('FR-079', path, b.line); continue; }
              const sv = /(?:^|[^\w.])([A-Za-z_][A-Za-z0-9_]*)\.save\s*\(/.exec(stripped);
              if (sv && sv[1] !== 'self' && sv[1] !== 'doc') add('FR-079', path, b.line);
              // A chained frappe.get_doc(...).save() is the same side
              // effect; a bare doc.save() is FR-036, not this rule.
              else if (/frappe\.get_doc\s*\([^)]*\)\s*\.save\s*\(/.test(stripped)) add('FR-079', path, b.line);
              if (/requests\.(?:get|post|put|patch|delete|head|request)\s*\(|urllib\.request\.urlopen\s*\(|httpx\.(?:get|post|put|patch|delete|head|request)\s*\(|frappe\.make_(?:get|post)_request\s*\(|frappe\.make_request\s*\(/.test(stripped)) add('FR-080', path, b.line);
            }
          }
          // FR-053: a misspelled lifecycle method name in a controller
          // class. Ordinary helper methods with unrelated names do not
          // fire — only known wrong names and near-misses (edit distance
          // <= 2) of a real lifecycle name.
          if (isWrongLifecycleName(fn.name)) add('FR-053', path, fn.line);
        }
      }
      // FR-051 / FR-054 / FR-055 / FR-058 / FR-059 / FR-063 / FR-069 /
      // FR-070 / FR-075 / FR-076 — per-function checks.
      {
        const fns = parsePyFunctions(lines);
        for (const fn of fns) {
          const bodyText = fn.bodyLines.map((b) => b.text).join('\n');
          const isLifecycle = !!fn.isDocumentClass && isLifecycleName(fn.name);
          const isWhitelisted = /frappe\.whitelist/.test(fn.decorator);
          // FR-051: enqueue in a lifecycle method or whitelisted method
          // without enqueue_after_commit=True. String literals are
          // stripped first, so a message mentioning enqueue does not flag.
          if (isLifecycle || isWhitelisted) {
            const stripped = lines.map(stripStrings);
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const m = /frappe\.enqueue(?:_doc)?\s*\(/.exec(stripped[b.line]);
              if (!m) continue;
              const { text } = joinCallText(stripped, b.line, m.index);
              if (!/enqueue_after_commit\s*=\s*True\b/.test(text)) add('FR-051', path, b.line);
            }
          }
          // FR-054: request state read inside a lifecycle method, or
          // form_dict read inside any non-whitelisted function.
          const requestRe = /frappe\.local\.(?:request|form_dict|response|request_ip)\b|frappe\.form_dict\b|frappe\.request\b/;
          for (const b of fn.bodyLines) {
            if (isCommentPy(b.text)) continue;
            if (isLifecycle && requestRe.test(b.text)) { add('FR-054', path, b.line); continue; }
            if (!isWhitelisted && /frappe\.(?:local\.)?form_dict\b/.test(b.text)) add('FR-054', path, b.line);
          }
          // FR-055: return with a value inside before_install. A bare
          // return does not fire. A return with a comment on the same
          // line — an intentional, stated refusal — is exempt.
          if (fn.name === 'before_install') {
            for (const b of fn.bodyLines) {
              const ret = /^\s*return\b(.*)$/.exec(b.text);
              if (!ret) continue;
              const after = ret[1].replace(/#.*$/, '').trim();
              if (after && !/#/.test(b.text)) add('FR-055', path, b.line);
            }
          }
          // FR-058: raw-SQL UPDATE/INSERT/DELETE with no cache clear in
          // the same function. set_value / save clear the cache
          // themselves, so they never reach this check.
          {
            const hasClear = /frappe\.clear_document_cache\s*\(|frappe\.clear_cache\s*\(/.test(bodyText);
            if (!hasClear) {
              for (const b of fn.bodyLines) {
                if (isCommentPy(b.text)) continue;
                const sqlIdx = b.text.search(/frappe\.db\.sql\s*\(/);
                if (sqlIdx === -1) continue;
                const { text } = joinCallText(lines, b.line, b.text.indexOf('frappe.db.sql'));
                if (/\b(update|insert\s+into|delete\s+from)\b/i.test(text)) add('FR-058', path, b.line);
              }
            }
          }
          // FR-059 (a): frappe.set_user( without restoration in a finally
          // block that restores the user with another set_user( call.
          {
            const setUserLines = fn.bodyLines.filter((b) => !isCommentPy(b.text) && /frappe\.set_user\s*\(/.test(b.text));
            if (setUserLines.length) {
              // A finally block restores the user only if it contains a
              // set_user( call after the finally: line.
              let restored = false;
              for (let k = 0; k < fn.bodyLines.length; k++) {
                if (/^\s*finally\s*:/.test(fn.bodyLines[k].text)) {
                  const finIndent = indentOf(fn.bodyLines[k].text);
                  for (let j = k + 1; j < fn.bodyLines.length; j++) {
                    const lb = fn.bodyLines[j];
                    if (lb.text.trim() && indentOf(lb.text) <= finIndent) break;
                    if (/frappe\.set_user\s*\(/.test(lb.text)) { restored = true; break; }
                  }
                }
                if (restored) break;
              }
              if (!restored) {
                for (const b of setUserLines) add('FR-059', path, b.line);
              }
            }
          }
          // FR-063: check-then-insert race — exists()/count() for a
          // doctype followed by an insert of the same doctype in the
          // same function. The insert must be guarded by that exists
          // check: either inside the `if not exists(...)` body, or
          // after an `if exists(...): return / continue` early exit in
          // the same block. When several exists checks for the same
          // doctype precede the insert, only the nearest one (the
          // actual guard) fires — a seed file that checks exists()
          // once to skip work and again to guard the insert reports
          // only the guarding check. Catching UniqueValidationError
          // around the insert is the fix. Demo / seed / test files are
          // exempt — a seed script's check-then-insert is the
          // idempotent-seed idiom, run once, not a concurrent request.
          if (!isDemoSeedTest) {
            const varDoctype = new Map(); // var -> doctype
            const existsChecks = []; // { doctype, line, idx, indent, isNot, hasEarlyExit, bodyEndIdx }
            const inserts = []; // { doctype, line, idx, indent }
            for (let bi = 0; bi < fn.bodyLines.length; bi++) {
              const b = fn.bodyLines[bi];
              if (isCommentPy(b.text)) continue;
              const ex = /frappe\.db\.(?:exists|count)\s*\(\s*['"]([^'"]+)['"]/.exec(b.text);
              if (ex) {
                const isNot = /^\s*if\s+not\b/.test(b.text);
                const ind = indentOf(b.text);
                // Body of the if: deeper-indented lines until dedent.
                let hasEarlyExit = false;
                let bodyEndIdx = fn.bodyLines.length;
                for (let j = bi + 1; j < fn.bodyLines.length; j++) {
                  const lb = fn.bodyLines[j];
                  if (lb.text.trim() && indentOf(lb.text) <= ind) { bodyEndIdx = j; break; }
                  if (/^\s*(return|continue|raise)\b|frappe\.throw\s*\(/.test(lb.text)) hasEarlyExit = true;
                }
                existsChecks.push({ doctype: ex[1], line: b.line, idx: bi, indent: ind, isNot, hasEarlyExit, bodyEndIdx });
              }
              const nd = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*frappe\.new_doc\s*\(\s*['"]([^'"]+)['"]/.exec(b.text);
              if (nd) varDoctype.set(nd[1], nd[2]);
              const gd = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*frappe\.get_doc\s*\(\s*\{\s*['"]doctype['"]\s*:\s*['"]([^'"]+)['"]/.exec(b.text);
              if (gd) varDoctype.set(gd[1], gd[2]);
              const direct = /frappe\.get_doc\s*\(\s*\{\s*['"]doctype['"]\s*:\s*['"]([^'"]+)['"][^}]*\}\s*\)\s*\.insert\s*\(/.exec(b.text);
              if (direct) inserts.push({ doctype: direct[1], line: b.line, idx: bi, indent: indentOf(b.text) });
              const vi = /([A-Za-z_][A-Za-z0-9_]*)\.insert\s*\(/.exec(b.text);
              if (vi && varDoctype.has(vi[1])) inserts.push({ doctype: varDoctype.get(vi[1]), line: b.line, idx: bi, indent: indentOf(b.text) });
            }
            if (existsChecks.length && inserts.length && !/UniqueValidationError/.test(bodyText)) {
              for (const ins of inserts) {
                // Nearest preceding exists for the same doctype.
                let guard = null;
                for (const ec of existsChecks) {
                  if (ec.doctype === ins.doctype && ec.line < ins.line) guard = ec;
                }
                if (!guard) continue;
                // (a) insert inside the `if not exists(...)` body.
                const inIfBody = guard.isNot && ins.idx > guard.idx && ins.idx < guard.bodyEndIdx;
                // (b) insert after an early-exit `if exists(...)` in
                // the same block: after the if body, before any dedent
                // below the if's indent.
                let afterEarlyExit = false;
                if (!guard.isNot && guard.hasEarlyExit && ins.idx >= guard.bodyEndIdx && ins.indent >= guard.indent) {
                  afterEarlyExit = true;
                  for (let j = guard.bodyEndIdx; j < ins.idx; j++) {
                    const lb = fn.bodyLines[j];
                    if (lb.text.trim() && indentOf(lb.text) < guard.indent) { afterEarlyExit = false; break; }
                  }
                }
                if (inIfBody || afterEarlyExit) add('FR-063', path, guard.line);
              }
            }
          }
          // FR-069: self-referential assignment in validate /
          // before_save / before_validate / on_change — the value
          // compounds on every save. FR-037 covers the on_update
          // variant. self.flags.* assignments are exempt.
          if (['validate', 'before_save', 'before_validate', 'on_change'].includes(fn.name)) {
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:\+=|-=|\*=|\/=|=(?!=))/.exec(b.text);
              if (!m || m[2] === 'flags') continue;
              const target = m[1] + '.' + m[2];
              const rhs = b.text.slice(b.text.indexOf('=') + 1);
              const isAugmented = /\+=|-=|\*=|\/=/.test(b.text.slice(0, b.text.indexOf('=') + 1));
              if (isAugmented || new RegExp('\\b' + escapeRe(target) + '\\b').test(rhs)) add('FR-069', path, b.line);
            }
          }
          // FR-070: except block that only passes / continues / logs
          // around a write — the failure is swallowed. An except that
          // re-raises or rolls back does not fire.
          {
            const WRITE_RE = /\.(insert|save|submit|delete|set_value|db_set)\s*\(|frappe\.db\.(?:set_value|delete|sql|commit)\s*\(/;
            const bodyLines = fn.bodyLines;
            for (let k = 0; k < bodyLines.length; k++) {
              if (!/^\s*except\b/.test(bodyLines[k].text)) continue;
              const exIndent = indentOf(bodyLines[k].text);
              const exBody = [];
              for (let j = k + 1; j < bodyLines.length; j++) {
                const lb = bodyLines[j];
                if (lb.text.trim() && indentOf(lb.text) <= exIndent) break;
                exBody.push(lb);
              }
              const meaningful = exBody.filter((lb) => lb.text.trim() !== '' && !isCommentPy(lb.text));
              if (!meaningful.length) continue;
              const silent = meaningful.every((lb) => /^\s*(pass|continue)\s*(#.*)?$/.test(lb.text) || /frappe\.log_error\s*\(/.test(lb.text));
              if (!silent) continue;
              // Find the matching try: the nearest preceding `try:` at
              // the same indent, and check its body for a write.
              let tryIdx = -1;
              for (let j = k - 1; j >= 0; j--) {
                if (/^\s*try\s*:/.test(bodyLines[j].text) && indentOf(bodyLines[j].text) === exIndent) { tryIdx = j; break; }
                if (bodyLines[j].text.trim() && indentOf(bodyLines[j].text) < exIndent) break;
              }
              if (tryIdx === -1) continue;
              let hasWrite = false;
              for (let j = tryIdx + 1; j < k; j++) {
                if (WRITE_RE.test(bodyLines[j].text)) { hasWrite = true; break; }
              }
              if (hasWrite) add('FR-070', path, bodyLines[k].line);
            }
          }
          // FR-075: open redirect — a redirect target taken from the
          // request with no validation call in the same function. The
          // target may be a request value directly, or a variable
          // assigned from one.
          {
            const tainted = taintedRequestVars(fn.bodyLines);
            const redirectParams = (fn.params || []).filter((p) => /^(?:next|return_to|continue|callback|redirect_to|redirect|url|target)$/i.test(p));
            const validated = /startswith\s*\(|urlparse\s*\(|is_safe_url|allowed_host/i.test(bodyText);
            if (!validated) {
              const strippedAll = lines.map(stripStrings);
              for (const b of fn.bodyLines) {
                if (isCommentPy(b.text)) continue;
                const s = strippedAll[b.line];
                let target = null;
                const flagAssign = /frappe\.local\.flags\.redirect\s*=\s*(.+)$/.exec(s);
                if (flagAssign) target = flagAssign[1];
                else {
                  const call = /\bredirect_to\s*\(/.exec(s);
                  if (call) {
                    const { text } = joinCallText(strippedAll, b.line, call.index);
                    target = text;
                  }
                }
                if (!target) continue;
                const isRequest = /frappe\.(?:local\.)?(?:form_dict|request)\b/.test(target)
                  || redirectParams.some((p) => new RegExp('\\b' + escapeRe(p) + '\\b').test(target))
                  || [...tainted].some((v) => new RegExp('\\b' + escapeRe(v) + '\\b').test(target));
                if (isRequest) add('FR-075', path, b.line);
              }
            }
          }
          // FR-076: SSRF — an outbound request to a URL taken from the
          // request or, in a whitelisted function, from one of its
          // parameters. A URL from frappe.conf or a settings value does
          // not fire.
          {
            const tainted = taintedRequestVars(fn.bodyLines);
            const OUTBOUND_RE = /(?:requests\.(?:get|post|put|delete|head|patch)|urllib\.request\.urlopen|httpx\.(?:get|post)|frappe\.make_(?:get_|post_)?request)\s*\(/;
            const strippedAll = lines.map(stripStrings);
            for (const b of fn.bodyLines) {
              if (isCommentPy(b.text)) continue;
              const m = OUTBOUND_RE.exec(strippedAll[b.line]);
              if (!m) continue;
              const { text } = joinCallText(strippedAll, b.line, m.index);
              if (/frappe\.conf\b|get_single_value\s*\(|get_cached_value\s*\(/.test(text)) continue;
              const isRequest = /frappe\.(?:local\.)?(?:form_dict|request)\b/.test(text)
                || [...tainted].some((v) => new RegExp('\\b' + escapeRe(v) + '\\b').test(text))
                || (isWhitelisted && (fn.params || []).some((p) => new RegExp('\\b' + escapeRe(p) + '\\b').test(text)));
              if (isRequest) add('FR-076', path, b.line);
            }
          }
        }
      }
      // FR-039 / FR-040 / FR-071 — permission hooks in hooks.py only. A hook
      // function defined in a separate permissions module is not seen
      // here; only the defs in hooks.py itself are checked.
      if (isHooks) {
        const fns = parsePyFunctions(lines);
        for (const fn of fns) {
          if (fn.name !== 'has_permission' && fn.name !== 'permission_query_conditions') continue;
          for (const b of fn.bodyLines) {
            if (isCommentPy(b.text)) continue;
            // FR-039: throwing in a permission hook breaks ALL access.
            if (/frappe\.throw\s*\(/.test(b.text) || /^\s*raise\b/.test(b.text)) add('FR-039', path, b.line);
          }
          // FR-040 (corrected 2026-11-27 — the old rule was inverted):
          // a has_permission hook must return True explicitly for users
          // it does not restrict. Frappe treats a missing return (None)
          // as a denial, so a code path that falls through to None
          // silently locks out every other user. Flag the hook when it
          // has no `return True` at all, when it has a bare `return`,
          // or when a path can fall through to the end of the function.
          if (fn.name === 'has_permission') {
            const body = fn.bodyLines.filter((b) => b.text.trim() !== '' && !isCommentPy(b.text));
            const hasReturnTrue = body.some((b) => /^\s*return\s+True\b/.test(b.text));
            const hasBareReturn = body.some((b) => /^\s*return\s*(#.*)?$/.test(b.text));
            if (!hasReturnTrue || hasBareReturn || !hookEndsWithReturn(fn.bodyLines)) add('FR-040', path, fn.line);
          }
          // FR-071: permission_query_conditions returning "" / None (no
          // restriction) or falling through. Same fall-through analysis
          // as FR-040; FR-040 does not check this hook.
          if (fn.name === 'permission_query_conditions') {
            const body = fn.bodyLines.filter((b) => b.text.trim() !== '' && !isCommentPy(b.text));
            const hasEmptyReturn = body.some((b) => /^\s*return\s*(?:""|''|None\b)/.test(b.text) || /^\s*return\s*(#.*)?$/.test(b.text));
            if (hasEmptyReturn || !hookEndsWithReturn(fn.bodyLines)) add('FR-071', path, fn.line);
          }
        }
        // FR-053 (b): bad doc_events keys in hooks.py — event names the
        // framework never calls. Only lowercase snake_case keys are
        // event names; DocType names ("Sales Order") and dotted-path
        // values are excluded by the shape check.
        {
          let inDocEvents = false;
          let depth = 0;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!inDocEvents) {
              if (/doc_events\s*=/.test(line)) {
                inDocEvents = true;
                depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
              } else continue;
            } else {
              depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
            }
            const strRe = /['"]([^'"]+)['"]/g;
            let sm;
            while ((sm = strRe.exec(line)) !== null) {
              const key = sm[1];
              if (!/^[a-z][a-z0-9_]*$/.test(key)) continue;
              if (isWrongLifecycleName(key)) add('FR-053', path, i);
            }
            if (depth <= 0) inDocEvents = false;
          }
        }
        // FR-057: hooks.py must be static data. Any frappe.db / get_all /
        // get_doc / get_installed_apps / frappe.local / frappe.conf call
        // on a line outside any def computes a value at import time with
        // the wrong site (or no site). An if / for / while at module
        // level (indent 0) is the same mistake in control-flow form.
        {
          const fns = parsePyFunctions(lines);
          const inDef = new Set();
          for (const fn of fns) {
            inDef.add(fn.line);
            for (const b of fn.bodyLines) inDef.add(b.line);
          }
          for (let i = 0; i < lines.length; i++) {
            if (isCommentPy(lines[i])) continue;
            if (/^\s*(if|for|while)\b/.test(lines[i]) && indentOf(lines[i]) === 0) { add('FR-057', path, i); continue; }
            if (!inDef.has(i) && /frappe\.(?:db|get_all|get_doc|get_meta|get_hooks|get_installed_apps|conf|local|flags)\b/.test(lines[i])) {
              add('FR-057', path, i);
            }
          }
        }
      }
      // FR-056 (hooks.py half): dotted paths in hooks.py must resolve
      // against the submitted files. A lone hooks.py with no other .py
      // files is skipped entirely — a single-file paste cannot resolve
      // dotted paths. Paths to other apps (frappe., erpnext., ...) are
      // skipped: those apps are not in the submission. The patches.txt
      // half lives outside the isPy branch, below.
      if (isHooks) {
        const hasOtherPy = input.some((f) => isPy(f.path) && (f.path.split('/').pop() || '') !== 'hooks.py');
        if (hasOtherPy) {
          for (let i = 0; i < lines.length; i++) {
            if (isCommentPy(lines[i])) continue;
            const strRe = /['"]([^'"]+)['"]/g;
            let sm;
            while ((sm = strRe.exec(lines[i])) !== null) {
              const dotted = sm[1];
              if (!isDottedPathCandidate(dotted)) continue;
              if (resolveDotted(dotted) === false) add('FR-056', path, i);
            }
          }
        }
      }
    }

    // FR-056 (patches.txt half): each non-comment, non-section,
    // non-execute: line is a dotted path that must resolve.
    if (base === 'patches.txt') {
      const hasOtherPy = input.some((f) => isPy(f.path) && (f.path.split('/').pop() || '') !== 'hooks.py');
      if (hasOtherPy) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || line.startsWith('#') || line.startsWith('[')) continue;
          if (/^execute\s*:/.test(line)) continue;
          const dotted = line.split('#')[0].trim();
          if (!isDottedPathCandidate(dotted)) continue;
          if (resolveDotted(dotted) === false) add('FR-056', path, i);
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
        // FR-081: frappe.call with async: false freezes the Desk UI.
        // The call object may span lines, so join the call text first.
        if (/frappe\.call\s*\(/.test(line)) {
          const handler = enclosingJsHandler(lines, i);
          if (handler === 'refresh') add('FR-021', path, i);
          const { text } = joinCallText(lines, i, line.indexOf('frappe.call'));
          if (/async\s*:\s*false\b/.test(text)) add('FR-081', path, i);
        }
        // FR-026: hardcoded secret in JS.
        if (/(?:api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]{12,}['"]/i.test(line) && !/frappe\.conf/.test(line)) add('FR-026', path, i);
        // FR-028: check on the line with string literals removed, so a
        // fix string mentioning .html() does not flag.
        if (/\.html\(\s*(?:frm\.doc|doc|user|frm|[^)]*(?:notes|remarks|input|content))\b/.test(stripStrings(line))) add('FR-028', path, i);
        // FR-041: cur_frm is undefined outside the form (list/report
        // contexts). Check with string literals removed, so a message
        // mentioning cur_frm does not flag.
        if (/\bcur_frm\b/.test(stripStrings(line))) add('FR-041', path, i);
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
