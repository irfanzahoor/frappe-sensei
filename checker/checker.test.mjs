// Frappe Sensei — checker tests (plain Node, no npm install).
// Run: node checker/checker.test.mjs
// For EVERY rule (FR-001..FR-035) it runs a bad example (must produce
// that ruleId) and a good example (must NOT produce that ruleId).
// Bad/good snippets come from rules/rules.json where they are complete;
// cross-file rules (FR-018, FR-019) and path-dependent rules (FR-002,
// FR-007, FR-015) use constructed file sets, noted inline.
// Exits non-zero on any failure.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkFiles } from './checker.js';

const dir = dirname(fileURLToPath(import.meta.url));
const rulesData = JSON.parse(readFileSync(join(dir, '..', 'rules', 'rules.json'), 'utf8'));
const byId = new Map(rulesData.rules.map((r) => [r.id, r]));

function has(result, id) {
  return result.findings.some((f) => f.ruleId === id);
}
function filesFor(id, kind) {
  const r = byId.get(id);
  const bad = r.example_bad;
  const good = r.example_good;
  const content = kind === 'bad' ? bad : good;
  // Defaults; overridden per rule below.
  const py = { path: 'sales_order.py', content };
  const js = { path: 'sales_order.js', content };
  switch (id) {
    case 'FR-001':
      return kind === 'bad'
        ? [{ path: 'my_app/hooks.py', content: bad }]
        : [{ path: 'my_app/doctype/sales_order/sales_order.py', content: good }];
    case 'FR-002':
      return kind === 'bad'
        ? [{ path: 'apps/erpnext/erpnext/selling/doctype/sales_order/sales_order.py', content: bad }]
        : [{ path: 'my_app/my_app/overrides/sales_order.py', content: good }];
    case 'FR-003':
      return [{ path: 'my_app/hooks.py', content }];
    case 'FR-004': case 'FR-005': case 'FR-012': case 'FR-020': case 'FR-021': case 'FR-028':
      return [js];
    case 'FR-007':
      return kind === 'bad'
        ? [{ path: 'my_app/custom_field.py', content: bad }]
        : [{ path: 'my_app/fixtures/custom_field.json', content: good }];
    case 'FR-015':
      return [{ path: 'server_script.py', content }];
    case 'FR-018':
      return kind === 'bad'
        ? [{ path: 'sales_order.js', content: bad }]
        : [{ path: 'sales_order.py', content: good }];
    case 'FR-019': {
      const jsCall = "frappe.ui.form.on('Sales Order', {\n    refresh(frm) { frm.call({method: 'get_order_total', args: {name: frm.doc.name}}); }\n});";
      return kind === 'bad'
        ? [{ path: 'sales_order.js', content: jsCall }, { path: 'sales_order.py', content: bad }]
        : [{ path: 'sales_order.js', content: jsCall }, { path: 'sales_order.py', content: good }];
    }
    case 'FR-027':
      return [{ path: 'print_format.html', content }];
    default:
      return [py];
  }
}

let passed = 0;
let failed = 0;
const failures = [];
for (const rule of rulesData.rules) {
  const badResult = checkFiles(filesFor(rule.id, 'bad'), rulesData);
  const goodResult = checkFiles(filesFor(rule.id, 'good'), rulesData);
  const badOk = has(badResult, rule.id);
  const goodOk = !has(goodResult, rule.id);
  if (badOk && goodOk) {
    passed++;
    console.log(`PASS ${rule.id} (${rule.severity})`);
  } else {
    failed++;
    const why = [];
    if (!badOk) why.push(`bad example did NOT trigger ${rule.id} (got: ${badResult.findings.map((f) => f.ruleId).join(',') || 'none'})`);
    if (!goodOk) why.push(`good example DID trigger ${rule.id} at ${goodResult.findings.filter((f) => f.ruleId === rule.id).map((f) => f.file + ':' + f.line).join(',')}`);
    failures.push(`${rule.id}: ${why.join('; ')}`);
    console.log(`FAIL ${rule.id}: ${why.join('; ')}`);
  }
}

// Extra checks: verdict rule + summary counts.
{
  const blocker = checkFiles([{ path: 'a.py', content: "raise Exception('x')" }], rulesData);
  // raise Exception is major, so verdict should be "approve with fixes".
  const v1 = blocker.verdict === 'approve with fixes';
  const clean = checkFiles([{ path: 'a.py', content: "frappe.throw(_('ok'))" }], rulesData);
  const v2 = clean.verdict === 'approve' && clean.summary.total === 0;
  const bad = checkFiles([{ path: 'my_app/hooks.py', content: 'def validate_sales_order(doc, method):\n    frappe.throw(_("x"))' }], rulesData);
  const v3 = bad.verdict === 'needs rework';
  if (v1 && v2 && v3) { passed += 3; console.log('PASS verdict: major -> approve with fixes, clean -> approve, blocker -> needs rework'); }
  else {
    failed += 3;
    failures.push(`verdict: major=${blocker.verdict}, clean=${clean.verdict}/${clean.summary.total}, blocker=${bad.verdict}`);
    console.log(`FAIL verdict: major=${blocker.verdict}, clean=${clean.verdict}, blocker=${bad.verdict}`);
  }
}

// Regression tests for the FR-023 / FR-032 narrowing (2026-11-27).
// Each entry: a constructed file set, the rule, and whether it must fire.
{
  const regression = [
    {
      name: 'FR-023 (a) Document controller self-method is exempt',
      files: [{ path: 'sales_order/sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    @frappe.whitelist()\n    def has_unreserved_stock(self, table_name="items"):\n        return SalesOrderStockReservation(self).has_unreserved_stock(table_name)\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-023 (a2) ERPNext controller base (SellingController) self-method is exempt',
      files: [{ path: 'sales_order/sales_order.py', content: 'from erpnext.controllers.selling_controller import SellingController\n\nclass SalesOrder(SellingController):\n    @frappe.whitelist()\n    def has_unreserved_stock(self, table_name="items"):\n        return SalesOrderStockReservation(self).has_unreserved_stock(table_name)\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-023 (b) standalone whitelisted function without a check still fires',
      files: [{ path: 'sales_order.py', content: "@frappe.whitelist()\ndef get_order_total(name):\n    return frappe.get_doc('Sales Order', name).grand_total\n" }],
      id: 'FR-023', shouldHave: true,
    },
    {
      name: 'FR-023 (b2) Document self-method fetching another doc by param still fires',
      files: [{ path: 'sales_order/sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    @frappe.whitelist()\n    def get_other(self, name):\n        return frappe.get_doc("Sales Order", name).grand_total\n' }],
      id: 'FR-023', shouldHave: true,
    },
    {
      name: 'FR-023 (b3) standalone function that does check_permission does not fire',
      files: [{ path: 'sales_order.py', content: '@frappe.whitelist()\ndef get_work_order_items(sales_order):\n    so = frappe.get_doc("Sales Order", sales_order)\n    so.check_permission("read")\n    return so.items\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-032 (c) sum over self.get("items") does not fire, even with get_all elsewhere in the file',
      files: [{ path: 'sales_order.py', content: 'def set_delivery_progress(self):\n    bins = frappe.get_all("Bin", filters={"item_code": "X"}, fields=["actual_qty"])\n    deliverable = [d for d in self.get("items") if not cint(d.skip_delivery)]\n    total_qty = sum(abs(flt(d.qty)) for d in deliverable)\n    delivered_qty = sum(min(abs(flt(d.delivered_qty)), abs(flt(d.qty))) for d in deliverable)\n' }],
      id: 'FR-032', shouldHave: false,
    },
    {
      name: 'FR-032 (d1) sum over a variable assigned from get_all still fires',
      files: [{ path: 'sales_order.py', content: "rows = frappe.get_all('Sales Invoice', fields=['grand_total'])\ntotal = sum(r.grand_total for r in rows)\n" }],
      id: 'FR-032', shouldHave: true,
    },
    {
      name: 'FR-032 (d2) sum directly over frappe.get_all still fires',
      files: [{ path: 'sales_order.py', content: 'total = sum(d.amount for d in frappe.get_all("Item", fields=["amount"]))\n' }],
      id: 'FR-032', shouldHave: true,
    },
    {
      name: 'FR-032 (d3) len() over a variable assigned from get_list still fires',
      files: [{ path: 'sales_order.py', content: 'rows = frappe.get_list("Item", fields=["name"])\ncount = len(rows)\n' }],
      id: 'FR-032', shouldHave: true,
    },
  ];
  for (const t of regression) {
    const result = checkFiles(t.files, rulesData);
    const ok = has(result, t.id) === t.shouldHave;
    if (ok) { passed++; console.log(`PASS ${t.name}`); }
    else {
      failed++;
      failures.push(`${t.name}: expected FR-032/FR-023 ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
      console.log(`FAIL ${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${rulesData.rules.length} rules.`);
if (failed) {
  console.log('Failures:');
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
