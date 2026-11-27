// Frappe Sensei — checker tests (plain Node, no npm install).
// Run: node checker/checker.test.mjs
// For EVERY rule (FR-001..FR-059) it runs a bad example (must produce
// that ruleId) and a good example (must NOT produce that ruleId).
// Bad/good snippets come from rules/rules.json where they are complete;
// cross-file rules (FR-018, FR-019, FR-056) and path-dependent rules
// (FR-002, FR-007, FR-015, FR-048, FR-057) use constructed file sets,
// noted inline.
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
    case 'FR-004': case 'FR-005': case 'FR-012': case 'FR-020': case 'FR-021': case 'FR-028': case 'FR-041':
      return [js];
    case 'FR-039': case 'FR-040':
      return [{ path: 'my_app/hooks.py', content }];
    case 'FR-048':
      return kind === 'bad'
        ? [{ path: 'sales_order.py', content: bad }]
        : [{ path: 'my_app/patches/v1_0/add_region_column.py', content: good }];
    case 'FR-056':
      // The bad example's dotted path must NOT resolve, so the target
      // module file defines a different function; the good example's
      // target file defines the handler the hooks.py path names.
      return kind === 'bad'
        ? [{ path: 'my_app/hooks.py', content: bad },
           { path: 'my_app/handlers.py', content: 'def other(doc, method):\n    pass\n' }]
        : [{ path: 'my_app/hooks.py', content: good },
           { path: 'my_app/handlers.py', content: 'def notify(doc, method):\n    pass\n' }];
    case 'FR-057':
      return [{ path: 'my_app/hooks.py', content }];
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

// Regression tests for the FMC false positives (2026-11-27): FR-023
// delegation, FR-013/FR-031 insert, seed exemption, noqa suppression.
{
  const regression2 = [
    {
      name: 'FR-023 (c) whitelisted fn calling a same-file helper that checks permission does not fire',
      files: [{ path: 'api/costing.py', content: 'import frappe\nfrom food_manufacturing.costing.simulator import simulate as _simulate\n\n@frappe.whitelist()\ndef simulate_recipe_cost(bom: str) -> dict:\n    return _simulate(bom)\n' },
        { path: 'costing/simulator.py', content: 'import frappe\n\ndef simulate(bom: str) -> dict:\n    doc = _readable_bom(bom)\n    return {"bom": doc.name}\n\ndef _readable_bom(bom: str):\n    frappe.has_permission("BOM", "read", doc=bom, throw=True)\n    doc = frappe.get_doc("BOM", bom)\n    doc.check_permission("read")\n    return doc\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-023 (c2) whitelisted fn calling a helper with NO check still fires',
      files: [{ path: 'api/costing.py', content: 'import frappe\n\n@frappe.whitelist()\ndef get_total(name):\n    return _calc(name)\n\ndef _calc(name):\n    return frappe.get_doc("Sales Order", name).grand_total\n' }],
      id: 'FR-023', shouldHave: true,
    },
    {
      name: 'FR-023 (c3) whitelisted fn calling a cross-file helper that checks permission does not fire',
      files: [{ path: 'api/quality.py', content: 'import frappe\n\n@frappe.whitelist()\ndef get_inspection_readings(inspection: str) -> list:\n    from food_manufacturing.quality.inspection import get_readings\n    return get_readings(inspection)\n' },
        { path: 'quality/inspection.py', content: 'import frappe\n\ndef get_readings(inspection: str) -> list:\n    frappe.has_permission("Quality Inspection", "read", doc=inspection, throw=True)\n    doc = frappe.get_doc("Quality Inspection", inspection)\n    doc.check_permission("read")\n    return doc.readings\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-023 (c4) roles-only whitelisted fn (get_roles, no DB read/write) does not fire',
      files: [{ path: 'api/dashboards.py', content: 'import frappe\n\n@frappe.whitelist()\ndef available_views() -> list:\n    roles = set(frappe.get_roles())\n    if "System Manager" in roles:\n        return list(DASHBOARDS)\n    return [view for view in DASHBOARDS if roles.intersection(ROLE_FOR[view])] or ["production"]\n' }],
      id: 'FR-023', shouldHave: false,
    },
    {
      name: 'FR-023 (c5) roles-only fn that ALSO reads the DB still fires',
      files: [{ path: 'api/dashboards.py', content: 'import frappe\n\n@frappe.whitelist()\ndef get_views(company: str) -> list:\n    roles = set(frappe.get_roles())\n    doc = frappe.get_doc("Company", company)\n    return [doc.name] if "System Manager" in roles else []\n' }],
      id: 'FR-023', shouldHave: true,
    },
    {
      name: 'FR-013 (a) get_doc dict form followed by .insert() does not fire (creation, not a read)',
      files: [{ path: 'demo/seed.py', content: 'doc = frappe.get_doc({"doctype": "Batch", "batch_id": batch_id, "item": item_code}).insert()\n' }],
      id: 'FR-013', shouldHave: false,
    },
    {
      name: 'FR-013 (b) get_doc("Doctype", name).field still fires',
      files: [{ path: 'sales_order.py', content: "group = frappe.get_doc('Item', row.item_code).item_group\n" }],
      id: 'FR-013', shouldHave: true,
    },
    {
      name: 'FR-013 (c) get_doc("Doctype", name).set_status() method call does not fire',
      files: [{ path: 'sales_order.py', content: 'frappe.get_doc("Quotation", quotation).set_status(update=True)\n' }],
      id: 'FR-013', shouldHave: false,
    },
    {
      name: 'FR-013 (d) get_doc("Doctype", name)["field"] bracket field access still fires',
      files: [{ path: 'sales_order.py', content: 'group = frappe.get_doc("Item", row.item_code)["item_group"]\n' }],
      id: 'FR-013', shouldHave: true,
    },
    {
      name: 'FR-013 (e) get_doc("Doctype", name).save() method call does not fire',
      files: [{ path: 'sales_order.py', content: 'frappe.get_doc("Sales Order", name).save()\n' }],
      id: 'FR-013', shouldHave: false,
    },
    {
      name: 'FR-031 (a) .insert() inside a loop does not fire (bulk creation, not update)',
      files: [{ path: 'demo/importer.py', content: 'for name in names:\n    doc = frappe.get_doc({"doctype": "Item", "item_code": name})\n    doc.insert()\n' }],
      id: 'FR-031', shouldHave: false,
    },
    {
      name: 'FR-031 (b) .submit() inside a loop still fires',
      files: [{ path: 'sales_order.py', content: 'for name in names:\n    doc = frappe.get_doc("Sales Order", name)\n    doc.submit()\n' }],
      id: 'FR-031', shouldHave: true,
    },
    {
      name: 'FR-030/031 (a) DB call and .save() in a loop inside demo/seed.py do not fire',
      files: [{ path: 'food_manufacturing/demo/seed.py', content: 'for row in rows:\n    doc = frappe.get_doc("Batch", row.batch)\n    doc.status = "Active"\n    doc.save()\n' }],
      id: 'FR-030', shouldHave: false,
    },
    {
      name: 'FR-030/031 (b) same loop in a normal file still fires FR-030',
      files: [{ path: 'food_manufacturing/stock.py', content: 'for row in rows:\n    doc = frappe.get_doc("Batch", row.batch)\n    doc.status = "Active"\n    doc.save()\n' }],
      id: 'FR-030', shouldHave: true,
    },
    {
      name: 'FR-023 still fires in a seed file (only FR-030/FR-031 are exempt there)',
      files: [{ path: 'food_manufacturing/demo/seed.py', content: '@frappe.whitelist()\ndef get_total(name):\n    return frappe.get_doc("Sales Order", name).grand_total\n' }],
      id: 'FR-023', shouldHave: true,
    },
    {
      name: 'noqa (a) print() with a # noqa comment on the same line does not fire FR-011',
      files: [{ path: 'demo/seed.py', content: 'print(message)  # noqa: T201 - this is a CLI seeding tool\n' }],
      id: 'FR-011', shouldHave: false,
    },
    {
      name: 'noqa (b) raise Exception with a # noqa comment does not fire FR-008',
      files: [{ path: 'sales_order.py', content: "raise Exception('x')  # noqa: B902 - re-raised as framework error\n" }],
      id: 'FR-008', shouldHave: false,
    },
  ];
  for (const t of regression2) {
    const result = checkFiles(t.files, rulesData);
    const ok = has(result, t.id) === t.shouldHave;
    if (ok) { passed++; console.log(`PASS ${t.name}`); }
    else {
      failed++;
      failures.push(`${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
      console.log(`FAIL ${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
    }
  }
  // FR-031 seed-exemption companion: the same demo/seed.py loop must not
  // produce FR-031 either (checked above for FR-030 only, same file set).
  {
    const seedLoop = [{ path: 'food_manufacturing/demo/seed.py', content: 'for row in rows:\n    doc = frappe.get_doc("Batch", row.batch)\n    doc.status = "Active"\n    doc.save()\n' }];
    const result = checkFiles(seedLoop, rulesData);
    const ok = !has(result, 'FR-031');
    if (ok) { passed++; console.log('PASS FR-030/031 (a2) .save() in a loop inside demo/seed.py does not fire FR-031'); }
    else {
      failed++;
      failures.push('FR-031 seed exemption: demo/seed.py loop still produced FR-031');
      console.log('FAIL FR-031 seed exemption: demo/seed.py loop still produced FR-031');
    }
  }
}

// Regression tests for the Impertio rules (FR-036 to FR-043, 2026-11-27):
// the exemptions and multi-line cases the bad/good examples do not cover.
{
  const regression3 = [
    {
      name: 'FR-036 (a) self.save() in validate still fires (recursion)',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def validate(self):\n        self.recalc()\n        self.save()\n' }],
      id: 'FR-036', shouldHave: true,
    },
    {
      name: 'FR-036 (b) flags-guarded save in on_update does not fire',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_update(self):\n        if self.flags.get("in_recursive_update"):\n            return\n        self.flags.in_recursive_update = True\n        self.save()\n' }],
      id: 'FR-036', shouldHave: false,
    },
    {
      name: 'FR-037 (a) self.flags assignment in on_update does not fire',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_update(self):\n        self.flags.in_recursive_update = True\n' }],
      id: 'FR-037', shouldHave: false,
    },
    {
      name: 'FR-037 (b) comparison self.x == 1 in on_update does not fire',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_update(self):\n        if self.status == "Done":\n            pass\n' }],
      id: 'FR-037', shouldHave: false,
    },
    {
      name: 'FR-038 (a) validate in a plain class (not a Document) does not fire',
      files: [{ path: 'sales_order.py', content: 'class Validator:\n    def validate(self):\n        self.custom_check()\n' }],
      id: 'FR-038', shouldHave: false,
    },
    {
      name: 'FR-039 (a) raise inside permission_query_conditions in hooks.py still fires',
      files: [{ path: 'my_app/hooks.py', content: 'def permission_query_conditions(user):\n    if not user:\n        frappe.throw("User required")\n' }],
      id: 'FR-039', shouldHave: true,
    },
    {
      name: 'FR-039 (b) frappe.throw in a has_permission hook in a separate module does not fire (hooks.py only)',
      files: [{ path: 'my_app/permissions.py', content: 'def has_permission(doc, user, permission_type):\n    if doc.status == "Locked":\n        frappe.throw("Locked")\n' }],
      id: 'FR-039', shouldHave: false,
    },
    {
      name: 'FR-041 (a) cur_frm in a comment does not fire',
      files: [{ path: 'sales_order.js', content: '// never use cur_frm here\nfrappe.ui.form.on("Sales Order", {\n    refresh(frm) {\n        frm.set_value("territory", "Default");\n    }\n});\n' }],
      id: 'FR-041', shouldHave: false,
    },
    {
      name: 'FR-042 (a) eval inside a string literal does not fire',
      files: [{ path: 'sales_order.py', content: 'msg = "do not use eval() here"\n' }],
      id: 'FR-042', shouldHave: false,
    },
    {
      name: 'FR-043 (a) multi-line enqueue WITH queue= does not fire',
      files: [{ path: 'sales_order.py', content: 'frappe.enqueue(\n    "my_app.tasks.send_report",\n    queue="long",\n    timeout=1800\n)\n' }],
      id: 'FR-043', shouldHave: false,
    },
    {
      name: 'FR-043 (b) multi-line enqueue WITHOUT queue= still fires',
      files: [{ path: 'sales_order.py', content: 'frappe.enqueue(\n    "my_app.tasks.send_report",\n    timeout=1800\n)\n' }],
      id: 'FR-043', shouldHave: true,
    },
  ];
  for (const t of regression3) {
    const result = checkFiles(t.files, rulesData);
    const ok = has(result, t.id) === t.shouldHave;
    if (ok) { passed++; console.log(`PASS ${t.name}`); }
    else {
      failed++;
      failures.push(`${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
      console.log(`FAIL ${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
    }
  }
}

// (Summary and exit are at the end of the file, after the last
// regression block.)

// Regression tests for the FR-040 correction and the frappe/skills rules
// (FR-044 to FR-059, 2026-11-27): the exemptions and edge cases the
// bad/good examples do not cover.
{
  const regression4 = [
    {
      name: 'FR-040 (a) hook with return True in one branch but fall-through at the end still fires',
      files: [{ path: 'my_app/hooks.py', content: 'def has_permission(doc, ptype, user):\n    if doc.owner == user:\n        return True\n    if doc.status == "Draft":\n        return False\n' }],
      id: 'FR-040', shouldHave: true,
    },
    {
      name: 'FR-040 (b) hook with a bare return fires',
      files: [{ path: 'my_app/hooks.py', content: 'def has_permission(doc, ptype, user):\n    if doc.status == "Closed":\n        return False\n    return\n' }],
      id: 'FR-040', shouldHave: true,
    },
    {
      name: 'FR-040 (c) hook returning False only (no return True) fires',
      files: [{ path: 'my_app/hooks.py', content: 'def has_permission(doc, ptype, user):\n    if not meets_criteria(doc, user):\n        return False\n    return False\n' }],
      id: 'FR-040', shouldHave: true,
    },
    {
      name: 'FR-040 (d) permission_query_conditions is not checked by FR-040 (only has_permission)',
      files: [{ path: 'my_app/hooks.py', content: 'def permission_query_conditions(user):\n    return ""\n' }],
      id: 'FR-040', shouldHave: false,
    },
    {
      name: 'FR-044 (a) subprocess with shell=True fires',
      files: [{ path: 'tasks.py', content: 'import subprocess\n\ndef run(cmd):\n    return subprocess.run(cmd, shell=True)\n' }],
      id: 'FR-044', shouldHave: true,
    },
    {
      name: 'FR-044 (b) subprocess list call without shell=True does not fire',
      files: [{ path: 'tasks.py', content: 'import subprocess\n\ndef run(path):\n    return subprocess.run(["ls", path], shell=False)\n' }],
      id: 'FR-044', shouldHave: false,
    },
    {
      name: 'FR-044 (c) os.system mentioned in a string does not fire',
      files: [{ path: 'tasks.py', content: 'msg = "never use os.system() here"\n' }],
      id: 'FR-044', shouldHave: false,
    },
    {
      name: 'FR-045 (a) yaml.load with SafeLoader does not fire',
      files: [{ path: 'config.py', content: 'import yaml\n\ndef load(f):\n    return yaml.load(f, Loader=yaml.SafeLoader)\n' }],
      id: 'FR-045', shouldHave: false,
    },
    {
      name: 'FR-045 (b) yaml.load without SafeLoader fires',
      files: [{ path: 'config.py', content: 'import yaml\n\ndef load(f):\n    return yaml.load(f)\n' }],
      id: 'FR-045', shouldHave: true,
    },
    {
      name: 'FR-046 (a) Template with a variable first argument fires',
      files: [{ path: 'notify.py', content: 'from jinja2 import Template\n\ndef render(tpl):\n    return Template(tpl).render()\n' }],
      id: 'FR-046', shouldHave: true,
    },
    {
      name: 'FR-046 (b) Template with a literal first argument does not fire',
      files: [{ path: 'notify.py', content: 'from jinja2 import Template\n\ndef render():\n    return Template("Hello {{ name }}").render(name="World")\n' }],
      id: 'FR-046', shouldHave: false,
    },
    {
      name: 'FR-047 (a) delete with a variable filter fires',
      files: [{ path: 'cleanup.py', content: 'def clear(filters):\n    frappe.db.delete("Sync Log", filters)\n' }],
      id: 'FR-047', shouldHave: true,
    },
    {
      name: 'FR-047 (b) delete with an empty {} filter fires',
      files: [{ path: 'cleanup.py', content: 'frappe.db.delete("Sync Log", {})\n' }],
      id: 'FR-047', shouldHave: true,
    },
    {
      name: 'FR-047 (c) delete with a comment (deliberate full-table clear) does not fire',
      files: [{ path: 'cleanup.py', content: '# Log rotation: this table is meant to be cleared nightly\nfrappe.db.delete("Sync Log")\n' }],
      id: 'FR-047', shouldHave: false,
    },
    {
      name: 'FR-047 (d) raw DELETE with a WHERE clause does not fire',
      files: [{ path: 'cleanup.py', content: 'frappe.db.sql("delete from `tabSync Log` where creation < %s", cutoff)\n' }],
      id: 'FR-047', shouldHave: false,
    },
    {
      name: 'FR-048 (a) ALTER TABLE inside frappe.db.sql fires',
      files: [{ path: 'setup.py', content: 'frappe.db.sql("alter table `tabRoute` add column `region` varchar(140)")\n' }],
      id: 'FR-048', shouldHave: true,
    },
    {
      name: 'FR-048 (b) DDL inside on_doctype_update does not fire',
      files: [{ path: 'sales_order.py', content: 'def on_doctype_update():\n    frappe.db.add_index("Sales Order", ["customer", "transaction_date"])\n' }],
      id: 'FR-048', shouldHave: false,
    },
    {
      name: 'FR-049 (a) set_value on Bin fires',
      files: [{ path: 'stock.py', content: 'frappe.db.set_value("Bin", {"item_code": item}, "actual_qty", qty)\n' }],
      id: 'FR-049', shouldHave: true,
    },
    {
      name: 'FR-049 (b) get_value on Bin does not fire (read, not write)',
      files: [{ path: 'stock.py', content: 'qty = frappe.db.get_value("Bin", {"item_code": item}, "actual_qty")\n' }],
      id: 'FR-049', shouldHave: false,
    },
    {
      name: 'FR-050 (a) setattr(frappe, ...) fires',
      files: [{ path: 'setup.py', content: 'import frappe\n\nsetattr(frappe.utils, "get_site_name", my_get_site_name)\n' }],
      id: 'FR-050', shouldHave: true,
    },
    {
      name: 'FR-050 (b) assignment in a test file does not fire',
      files: [{ path: 'tests/test_setup.py', content: 'import frappe\n\nfrappe.utils.get_site_name = fake_name\n' }],
      id: 'FR-050', shouldHave: false,
    },
    {
      name: 'FR-050 (c) frappe.local assignment does not fire',
      files: [{ path: 'setup.py', content: 'import frappe\n\nfrappe.local.flags.in_setup = True\n' }],
      id: 'FR-050', shouldHave: false,
    },
    {
      name: 'FR-051 (a) enqueue_doc without enqueue_after_commit in on_submit fires',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_submit(self):\n        frappe.enqueue_doc("Sales Order", self.name, "send_confirmation")\n' }],
      id: 'FR-051', shouldHave: true,
    },
    {
      name: 'FR-051 (b) enqueue with enqueue_after_commit=True does not fire',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_submit(self):\n        frappe.enqueue("my_app.tasks.confirm", queue="long", enqueue_after_commit=True, name=self.name)\n' }],
      id: 'FR-051', shouldHave: false,
    },
    {
      name: 'FR-052 (a) get_query with ignore_permissions=True fires',
      files: [{ path: 'report.py', content: 'query = frappe.qb.get_query("Item", ignore_permissions=True)\n' }],
      id: 'FR-052', shouldHave: true,
    },
    {
      name: 'FR-053 (a) on_submitted doc_events key in hooks.py fires',
      files: [{ path: 'my_app/hooks.py', content: 'doc_events = {"Purchase Request": {"on_submitted": "my_app.buying.notify"}}\n' }],
      id: 'FR-053', shouldHave: true,
    },
    {
      name: 'FR-053 (b) on_submit doc_events key in hooks.py does not fire',
      files: [{ path: 'my_app/hooks.py', content: 'doc_events = {"Purchase Request": {"on_submit": "my_app.buying.notify"}}\n' }],
      id: 'FR-053', shouldHave: false,
    },
    {
      name: 'FR-053 (c) before_load method in a controller fires',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def before_load(self):\n        self.setup()\n' }],
      id: 'FR-053', shouldHave: true,
    },
    {
      name: 'FR-053 (d) ordinary helper method check_total does not fire',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def validate(self):\n        super().validate()\n        self.check_total()\n\n    def check_total(self):\n        pass\n' }],
      id: 'FR-053', shouldHave: false,
    },
    {
      name: 'FR-053 (e) on_load (one letter off onload) fires',
      files: [{ path: 'sales_order.py', content: 'from frappe.model.document import Document\n\nclass SalesOrder(Document):\n    def on_load(self):\n        pass\n' }],
      id: 'FR-053', shouldHave: true,
    },
    {
      name: 'FR-054 (a) form_dict in a non-whitelisted helper fires',
      files: [{ path: 'api.py', content: 'def get_channel():\n    return frappe.form_dict.get("channel")\n' }],
      id: 'FR-054', shouldHave: true,
    },
    {
      name: 'FR-054 (b) form_dict in a whitelisted method does not fire',
      files: [{ path: 'api.py', content: '@frappe.whitelist()\ndef get_channel():\n    return frappe.form_dict.get("channel")\n' }],
      id: 'FR-054', shouldHave: false,
    },
    {
      name: 'FR-055 (a) bare return in before_install does not fire',
      files: [{ path: 'my_app/hooks.py', content: 'def before_install():\n    setup_defaults()\n    return\n' }],
      id: 'FR-055', shouldHave: false,
    },
    {
      name: 'FR-055 (b) return False with a comment (intentional refusal) does not fire',
      files: [{ path: 'my_app/hooks.py', content: 'def before_install():\n    return False  # refuse: no Company exists yet\n' }],
      id: 'FR-055', shouldHave: false,
    },
    {
      name: 'FR-055 (c) return False without a comment fires',
      files: [{ path: 'my_app/hooks.py', content: 'def before_install():\n    return False\n' }],
      id: 'FR-055', shouldHave: true,
    },
    {
      name: 'FR-056 (a) lone hooks.py does not fire (single-file paste cannot resolve)',
      files: [{ path: 'my_app/hooks.py', content: 'doc_events = {"Sales Order": {"on_submit": "my_app.handlers.notify"}}\n' }],
      id: 'FR-056', shouldHave: false,
    },
    {
      name: 'FR-056 (b) unresolvable path in patches.txt fires',
      files: [{ path: 'my_app/patches.txt', content: '[v1.0]\nmy_app.patches.v1_0.missing_fix\n' },
        { path: 'my_app/patches/v1_0/other.py', content: 'def execute():\n    pass\n' }],
      id: 'FR-056', shouldHave: true,
    },
    {
      name: 'FR-056 (c) resolvable path in patches.txt does not fire',
      files: [{ path: 'my_app/patches.txt', content: '[v1.0]\nmy_app.patches.v1_0.fix_x\n' },
        { path: 'my_app/patches/v1_0/fix_x.py', content: 'def execute():\n    pass\n' }],
      id: 'FR-056', shouldHave: false,
    },
    {
      name: 'FR-056 (d) frappe.* path in hooks.py is skipped (other app, not submitted)',
      files: [{ path: 'my_app/hooks.py', content: 'doc_events = {"Sales Order": {"on_submit": "frappe.utils.scheduler.enqueue"}}\n' },
        { path: 'my_app/handlers.py', content: 'def notify(doc, method):\n    pass\n' }],
      id: 'FR-056', shouldHave: false,
    },
    {
      name: 'FR-057 (a) frappe.db call at module level in hooks.py fires',
      files: [{ path: 'my_app/hooks.py', content: 'cron_time = frappe.db.get_single_value("MyApp Settings", "sync_cron")\n' }],
      id: 'FR-057', shouldHave: true,
    },
    {
      name: 'FR-057 (b) frappe.db call inside a def in hooks.py does not fire',
      files: [{ path: 'my_app/hooks.py', content: 'def before_enable():\n    return frappe.db.get_single_value("MyApp Settings", "sync_cron")\n' }],
      id: 'FR-057', shouldHave: false,
    },
    {
      name: 'FR-058 (a) INSERT via db.sql without a cache clear fires',
      files: [{ path: 'sync.py', content: 'def sync_item(name):\n    frappe.db.sql("insert into `tabItem` (name) values (%s)", name)\n' }],
      id: 'FR-058', shouldHave: true,
    },
    {
      name: 'FR-058 (b) SELECT via db.sql does not fire',
      files: [{ path: 'sync.py', content: 'def get_items():\n    return frappe.db.sql("select name from `tabItem`", as_dict=True)\n' }],
      id: 'FR-058', shouldHave: false,
    },
    {
      name: 'FR-058 (c) frappe.clear_cache (not document) also exempts',
      files: [{ path: 'sync.py', content: 'def sync_status(name):\n    frappe.db.sql("update `tabItem` set status=%s where name=%s", ("Active", name))\n    frappe.clear_cache(doctype="Item")\n' }],
      id: 'FR-058', shouldHave: false,
    },
    {
      name: 'FR-059 (a) frappe.session.user assignment fires',
      files: [{ path: 'auth.py', content: 'def impersonate(user):\n    frappe.session.user = user\n' }],
      id: 'FR-059', shouldHave: true,
    },
    {
      name: 'FR-059 (b) set_user with a finally that restores does not fire',
      files: [{ path: 'auth.py', content: 'def run_as_admin():\n    original = frappe.session.user\n    try:\n        frappe.set_user("Administrator")\n        create_invoice()\n    finally:\n        frappe.set_user(original)\n' }],
      id: 'FR-059', shouldHave: false,
    },
    {
      name: 'FR-059 (c) set_user in a try with no finally fires',
      files: [{ path: 'auth.py', content: 'def run_as_admin():\n    try:\n        frappe.set_user("Administrator")\n        create_invoice()\n    except Exception:\n        pass\n' }],
      id: 'FR-059', shouldHave: true,
    },
  ];
  for (const t of regression4) {
    const result = checkFiles(t.files, rulesData);
    const ok = has(result, t.id) === t.shouldHave;
    if (ok) { passed++; console.log(`PASS ${t.name}`); }
    else {
      failed++;
      failures.push(`${t.name}: expected ${t.id} ${t.shouldHave ? 'to fire' : 'not to fire'} (got: ${result.findings.map((f) => f.ruleId).join(',') || 'none'})`);
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
