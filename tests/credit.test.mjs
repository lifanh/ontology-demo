import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { FactRegistry, createEvaluator, compareBatch } from "../src/core/runtime.js";
import { parseRule, formatRule } from "../src/core/authoring.js";
import { Governance } from "../src/core/governance.js";
import { registry, creditPack, fixtures, activeRules, compileCandidate, analyzeCandidate, nextReleaseId, scenarios, release } from "../src/domains/credit/pack.js";

const evaluate = createEvaluator(creditPack);
const customer = changes => ({ ...fixtures[0], ...changes });

test("ontology rejects unknown references and derives deterministic ratios", () => {
  assert.throws(() => new FactRegistry({ properties: { a: { type: "decimal" } }, derived: { b: { type: "decimal", dependencies: ["missing"], derive: () => 1 } } }), /unknown property/);
  const context = registry.context(customer({ ar_balance: 0, past_due_amount: 10, net_sales_180d: 600, net_sales_360d: 2400 }));
  assert.equal(context.get("past_due_ratio"), null);
  assert.equal(context.get("monthly_net_sales_run_rate"), 200);
});

test("bounded DSL validates ontology properties, units, and round-trips", () => {
  const source = `RULE NET30_PAST_DUE_MAX\nSCOPE customer.financial_statement_status == "CURRENT"\n      AND customer.current_ratio >= 1.2\nSET_MIN customer.operating_cash_flow = 0 USD\nEND`;
  const ast = parseRule(source, registry, { root: "customer" });
  assert.equal(ast.scope[0].fact, "financial_statement_status");
  assert.equal(ast.scope[1].fact, "current_ratio");
  assert.equal(ast.effect.fact, "operating_cash_flow");
  assert.deepEqual(parseRule(formatRule(ast, { root: "customer" }), registry, { root: "customer" }), ast);
  assert.throws(() => parseRule(source.replace("current_ratio", "invented_ratio"), registry, { root: "customer" }), /UNKNOWN_PROPERTY/);
  assert.throws(() => parseRule(source.replace("0 USD", "0 DAYS"), registry, { root: "customer" }), /UNIT_ERROR/);
});

test("bounded DSL accepts ontology property identifiers containing digits", () => {
  const threshold = parseRule(`RULE SALES_MINIMUM\nSCOPE customer.net_sales_360d >= 100000 USD\nSET_MIN customer.net_sales_180d = 50000 USD\nEND`, registry, { root: "customer" });
  assert.equal(threshold.scope[0].fact, "net_sales_360d");
  assert.equal(threshold.effect.fact, "net_sales_180d");
  const ratio = parseRule(`RULE SALES_TREND_MINIMUM\nSCOPE ALL\nSET_MAX_RATIO customer.net_sales_180d\n    TO customer.net_sales_360d = 0.5\nEND`, registry, { root: "customer" });
  assert.equal(ratio.effect.numerator, "net_sales_180d");
  assert.equal(ratio.effect.denominator, "net_sales_360d");
});

test("financial statement rule observes exact $50k boundary", () => {
  const exact = evaluate(customer({ credit_limit: 50000, financial_statement_status: null }));
  assert.equal(exact.findings.find(x => x.id === "FINANCIAL_STATEMENTS_REQUIRED").status, "NOT_APPLICABLE");
  assert.equal(exact.calculation.status, "NOT_AVAILABLE");
  const above = evaluate(customer({ credit_limit: 50001, financial_statement_status: "STALE" }));
  assert.equal(above.findings.find(x => x.id === "FINANCIAL_STATEMENTS_REQUIRED").status, "FINDING");
  assert.equal(above.calculation.status, "BLOCKED_FINANCIALS_REQUIRED");
});

test("restricted behavior has manual primary, supporting restriction and no limit", () => {
  const result = evaluate(customer({ restricted_status: "Y" }));
  assert.deepEqual(result.action.supporting, ["KEEP_EXISTING_RESTRICTION"]);
  assert.equal(result.action.primary, "NEED_MANUAL_REVIEW");
  assert.equal(result.calculation.status, "BLOCKED_RESTRICTED");
  assert.equal(result.calculation.recommended, null);
});

test("critical restriction outranks manager review", () => {
  const result = evaluate(customer({ past_due_amount: 8000, operating_cash_flow: -1, current_ratio: .9, adp_days: 40 }));
  assert.equal(result.action.primary, "NEED_TO_RESTRICT");
});

test("action precedence keeps document collection ahead of a single review finding", () => {
  const result = evaluate(customer({ credit_limit: 75000, financial_statement_status: "MISSING", payment_terms: "NET_45", past_due_amount: 5000 }));
  assert.equal(result.action.primary, "REQUEST_UPDATED_FINANCIAL_STATEMENTS");
  assert.ok(result.action.supporting.includes("NEED_MANUAL_REVIEW"));
});

test("indeterminate evaluation never resolves to auto pass", () => {
  const result = evaluate(customer({ adp_days: null }));
  assert.ok(result.findings.some(finding => finding.status === "INDETERMINATE"));
  assert.equal(result.calculation.status, "INDETERMINATE");
  assert.equal(result.action.primary, "NEED_MANUAL_REVIEW");
});

test("calculator applies nearest 5k, review movement and range guardrails", () => {
  const c = evaluate(customer({ credit_limit: 102000, net_sales_180d: 6000000, net_sales_360d: 10000000, annual_revenue: 10000000 })).calculation;
  assert.equal(c.recommended % 5000, 0);
  assert.ok(c.recommended <= 102000 * 1.25 && c.recommended >= 102000 * .75);
  assert.equal(c.acceptableRange.length, 2);
});

test("payment cap preserves the absolute minimum and an ordered review range", () => {
  const c = evaluate(customer({ credit_limit: 1000, past_due_amount: 6000 })).calculation;
  assert.equal(c.paymentGrade, "watch");
  assert.equal(c.recommended, 10000);
  assert.ok(c.acceptableRange[0] <= c.acceptableRange[1]);
  assert.ok(c.acceptableRange[0] >= 10000);
});

test("batch compares active and substituted candidate with one evaluator", () => {
  const replacement = compileCandidate(scenarios.ratio5.ast, scenarios.ratio5.revision);
  const candidate = activeRules.map(r => r.id === replacement.id ? replacement : r);
  const batch = compareBatch(fixtures, x => evaluate(x), x => evaluate(x, candidate));
  assert.equal(batch.summary.evaluated, 13);
  assert.ok(batch.summary.addedFindings > 0);
  assert.equal(batch.complete, true);
});

test("batch retains successful rows and blocks on evaluator errors", () => {
  const batch = compareBatch(fixtures.slice(0, 2), value => evaluate(value), value => {
    if (value.customer_number === 1002) throw new Error("fixture failure");
    return evaluate(value);
  });
  assert.equal(batch.rows.length, 2);
  assert.equal(batch.summary.errors, 1);
  assert.equal(batch.complete, false);
  assert.match(batch.rows[1].error, /fixture failure/);
});

test("parsed threshold controls candidate evaluation and analysis", () => {
  const ast = parseRule(formatRule(scenarios.ratio15.ast, { root: "customer" }), registry, { root: "customer" });
  const replacement = compileCandidate(ast, 5);
  const candidate = activeRules.map(rule => rule.id === replacement.id ? replacement : rule);
  const target = customer({ past_due_amount: 5000, ar_balance: 40000 });
  assert.equal(evaluate(target).findings.find(finding => finding.id === replacement.id).status, "FINDING");
  assert.equal(evaluate(target, candidate).findings.find(finding => finding.id === replacement.id).status, "PASS");
  assert.equal(analyzeCandidate(ast).status, "CONFLICT");
});

test("conflict blocks while compatible current evidence can publish", () => {
  const blocked = new Governance({ activeRelease: release, candidate: scenarios.ratio15 });
  blocked.record("validation", { valid: true });
  assert.equal(blocked.record("analysis", { status: "CONFLICT" }), false);
  assert.equal(blocked.canPublish(), false);
  const good = new Governance({ activeRelease: release, candidate: scenarios.ratio5 });
  good.record("validation", { valid: true }); good.record("analysis", { status: "COMPATIBLE_REFINEMENT" }); good.record("batch", { complete: true });
  assert.equal(good.canPublish(), true);
  const replacement = compileCandidate(scenarios.ratio5.ast, scenarios.ratio5.revision);
  const rules = activeRules.map(rule => rule.id === replacement.id ? replacement : rule);
  const next = { id: nextReleaseId(release.id), rules: rules.map(({ id, revision }) => ({ id, revision })) };
  assert.equal(good.publish(next).id, "credit-1.5.0");
  assert.equal(good.activeRelease.rules.length, activeRules.length);
  assert.equal(evaluate(customer({ past_due_amount: 2400 }), rules, good.activeRelease).release.id, "credit-1.5.0");
  const nextDraft = { ...scenarios.ratio5.ast, effect: { ...scenarios.ratio5.ast.effect, value: .04 } };
  assert.match(analyzeCandidate(nextDraft, rules).summary, /Active 5%/);
});

test("editing creates immutable revision and invalidates evidence", () => {
  const g = new Governance({ activeRelease: release, candidate: { ...scenarios.ratio5, revision: 5, ast: scenarios.ratio5.ast } });
  g.record("validation", { valid: true });
  const old = g.revisions[0]; g.edit({ sourceDsl: "changed" });
  assert.equal(old.state, "VALIDATED"); assert.equal(g.current.revision, 6); assert.equal(g.current.ast, null); assert.deepEqual(g.evidence, {}); assert.equal(g.canPublish(), false);
});
