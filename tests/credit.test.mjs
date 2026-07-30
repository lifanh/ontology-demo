import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { FactRegistry, createEvaluator, compareBatch } from "../src/core/runtime.js";
import { parseRule, formatRule } from "../src/core/authoring.js";
import { Governance } from "../src/core/governance.js";
import { registry, creditPack, fixtures, narrativeCustomers, eligibleEvidenceTools, activeRules, compileCandidate, analyzeCandidate, nextReleaseId, scenarios, release } from "../src/domains/credit/pack.js";
import { createDisposition, createDispositionStore } from "../src/domains/credit/dispositions.js";

const evaluate = createEvaluator(creditPack);
const customer = changes => ({ ...fixtures[0], ...changes });
const candidateRelease = (rules, id = "credit-candidate") => ({ ontologyVersion: release.ontologyVersion, actionPolicyVersion: release.actionPolicyVersion, calculatorVersion: release.calculatorVersion, id, status: "CANDIDATE_PREVIEW", rules: rules.map(({ id: ruleId, revision }) => ({ id: ruleId, revision })) });

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
  assert.equal(exact.traces.find(trace => trace.policyRef.ruleId === "FINANCIAL_STATEMENTS_REQUIRED").outcome, "NOT_APPLICABLE");
  assert.equal(exact.calculation.status, "NOT_AVAILABLE");
  const above = evaluate(customer({ credit_limit: 50001, financial_statement_status: "STALE" }));
  assert.equal(above.traces.find(trace => trace.policyRef.ruleId === "FINANCIAL_STATEMENTS_REQUIRED").outcome, "FINDING");
  assert.equal(above.calculation.status, "BLOCKED_FINANCIALS_REQUIRED");
});

test("review exposes a self-contained Rule Evaluation Trace and Findings are only matched traces", () => {
  const result = evaluate(customer({ ar_balance: 100000, past_due_amount: 18000 }));
  const trace = result.traces.find(item => item.policyRef.ruleId === "NET30_PAST_DUE_MAX");

  assert.deepEqual(trace, {
    schemaVersion: "1",
    evaluationRef: "credit-1.4.0/NET30_PAST_DUE_MAX@4",
    policyRef: {
      releaseId: "credit-1.4.0",
      ontologyVersion: "2.0",
      ruleId: "NET30_PAST_DUE_MAX",
      ruleRevision: 4
    },
    policy: {
      title: "NET 30 past-due limit",
      statement: "Customers on NET 30 terms may not have more than 8% of accounts receivable past due."
    },
    outcome: "FINDING",
    observations: [
      {
        role: "APPLICABILITY",
        factId: "payment_terms",
        factLabel: "Payment terms",
        actual: { value: "NET_30", type: "enum", unit: null, format: "TEXT" },
        comparison: { operator: "==", value: "NET_30", unit: null, format: "TEXT" },
        result: "MATCH",
        supportingFactIds: []
      },
      {
        role: "CONDITION",
        factId: "past_due_ratio",
        factLabel: "Past due ratio",
        actual: { value: 0.18, type: "decimal", unit: null, format: "PERCENT" },
        comparison: { operator: ">", value: 0.08, unit: null, format: "PERCENT" },
        result: "MATCH",
        supportingFactIds: ["past_due_amount", "ar_balance"]
      }
    ],
    finding: {
      reasonCode: "NET30_PAST_DUE_LIMIT_EXCEEDED",
      material: true,
      actionHint: "NEED_MANUAL_REVIEW"
    }
  });
  assert.deepEqual(result.findings, result.traces.filter(item => item.outcome === "FINDING"));
  assert.deepEqual(result.versions, {
    resolver: "credit-actions-1.0",
    calculator: "illustrative-credit-limit-1.0"
  });
});

test("applicability is fully observed before conditions and a known scope failure wins", () => {
  const notApplicable = evaluate(customer({ restricted_status: "Y", ar_balance: null, adp_days: null }));
  const trace = notApplicable.traces.find(item => item.policyRef.ruleId === "HIGH_BALANCE_ADP_MAX");

  assert.equal(trace.outcome, "NOT_APPLICABLE");
  assert.deepEqual(trace.observations.map(item => [item.role, item.factId, item.result]), [
    ["APPLICABILITY", "restricted_status", "NO_MATCH"],
    ["APPLICABILITY", "ar_balance", "UNKNOWN"]
  ]);
  assert.equal(trace.finding, null);
  assert.equal(Object.hasOwn(trace, "missingFactIds"), false);
});

test("unknown applicability and conditions identify exact missing facts", () => {
  const unknownScope = evaluate(customer({ restricted_status: "N", ar_balance: null }));
  const scopedTrace = unknownScope.traces.find(item => item.policyRef.ruleId === "HIGH_BALANCE_ADP_MAX");
  assert.equal(scopedTrace.outcome, "INDETERMINATE");
  assert.deepEqual(scopedTrace.missingFactIds, ["ar_balance"]);
  assert.equal(scopedTrace.observations.some(item => item.role === "CONDITION"), false);

  const unknownCondition = evaluate(customer({ past_due_amount: 6000, operating_cash_flow: null, current_ratio: 1.2 }));
  const compoundTrace = unknownCondition.traces.find(item => item.policyRef.ruleId === "CRITICAL_RESTRICTION");
  assert.equal(compoundTrace.outcome, "INDETERMINATE");
  assert.deepEqual(compoundTrace.missingFactIds, ["operating_cash_flow"]);
  assert.deepEqual(compoundTrace.observations.map(item => item.factId), ["restricted_status", "past_due_ratio", "operating_cash_flow", "current_ratio"]);
  assert.equal(compoundTrace.finding, null);
});

test("applicable compound rules evaluate every condition without short-circuiting", () => {
  const result = evaluate(customer({ past_due_amount: 1000, operating_cash_flow: -1, current_ratio: .9 }));
  const trace = result.traces.find(item => item.policyRef.ruleId === "CRITICAL_RESTRICTION");
  assert.equal(trace.outcome, "PASS");
  assert.deepEqual(trace.observations.map(item => item.result), ["MATCH", "NO_MATCH", "MATCH", "MATCH"]);
});

test("Rule Evaluation Traces and nested evidence are immutable", () => {
  const result = evaluate(customer({ past_due_amount: 5000 }));
  const trace = result.traces[0];
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(trace), true);
  assert.equal(Object.isFrozen(trace.observations), true);
  assert.equal(Object.isFrozen(trace.observations[0].actual), true);
  assert.throws(() => { trace.outcome = "PASS"; }, TypeError);
  assert.throws(() => { trace.observations[0].actual.value = 0; }, TypeError);
});

test("production rules use declarative conditions and candidates regenerate policy text", () => {
  assert.ok(activeRules.every(item => !Object.hasOwn(item, "when") && item.conditions.length > 0));
  const candidate = compileCandidate(scenarios.ratio5.ast, scenarios.ratio5.revision);
  assert.deepEqual(candidate.conditions, [{ fact: "past_due_ratio", op: ">", value: .05 }]);
  assert.equal(candidate.policy.statement, "Customers on NET 30 terms may not have more than 5% of accounts receivable past due.");
  const unsupportedScope = { ...scenarios.ratio5.ast, scope: [{ fact: "payment_terms", op: "==", value: "NET_45" }] };
  assert.throws(() => compileCandidate(unsupportedScope, 5), /supported policy family/);
});

test("declarative migration preserves all regression fixture outcomes and actions", () => {
  const legacyOutcomes = value => {
    const context = registry.context(value);
    const condition = (fact, matches) => context.get(fact) === null ? "INDETERMINATE" : matches(context.get(fact)) ? "FINDING" : "PASS";
    const scoped = (scopeFact, applies, evaluateCondition) => context.get(scopeFact) === null ? "INDETERMINATE" : applies(context.get(scopeFact)) ? evaluateCondition() : "NOT_APPLICABLE";
    return [
      condition("past_due_ratio", actual => actual > .10),
      scoped("payment_terms", actual => actual === "NET_30", () => condition("past_due_ratio", actual => actual > .08)),
      condition("adp_days", actual => actual >= 30),
      context.get("restricted_status") === null || context.get("ar_balance") === null ? "INDETERMINATE" : context.get("restricted_status") !== "N" || context.get("ar_balance") <= 100000 ? "NOT_APPLICABLE" : condition("adp_days", actual => actual > 25),
      scoped("credit_limit", actual => actual > 50000, () => condition("financial_statement_status", actual => actual !== "CURRENT")),
      scoped("restricted_status", actual => actual === "N", () => ["past_due_ratio", "operating_cash_flow", "current_ratio"].some(id => context.get(id) === null) ? "INDETERMINATE" : context.get("past_due_ratio") > .10 && context.get("operating_cash_flow") < 0 && context.get("current_ratio") < 1 ? "FINDING" : "PASS")
    ];
  };
  const expected = [
    [1001, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "PASS", "PASS"], "RECOMMEND_CREDIT_LIMIT_REASSESSMENT"],
    [1002, ["FINDING", "NOT_APPLICABLE", "PASS", "NOT_APPLICABLE", "PASS", "PASS"], "NEED_MANUAL_REVIEW"],
    [1003, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "PASS", "PASS"], "RECOMMEND_CREDIT_LIMIT_REASSESSMENT"],
    [1004, ["FINDING", "FINDING", "FINDING", "NOT_APPLICABLE", "PASS", "PASS"], "NEED_CREDIT_MANAGER_REVIEW"],
    [1005, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "PASS", "NOT_APPLICABLE"], "NEED_MANUAL_REVIEW"],
    [1006, ["PASS", "PASS", "FINDING", "NOT_APPLICABLE", "PASS", "PASS"], "NEED_MANUAL_REVIEW"],
    [1007, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "NOT_APPLICABLE", "PASS"], "AUTO_REVIEW_PASS"],
    [1008, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "NOT_APPLICABLE", "PASS"], "AUTO_REVIEW_PASS"],
    [1009, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "FINDING", "PASS"], "REQUEST_UPDATED_FINANCIAL_STATEMENTS"],
    [1010, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "FINDING", "PASS"], "REQUEST_UPDATED_FINANCIAL_STATEMENTS"],
    [1011, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "PASS", "PASS"], "RECOMMEND_CREDIT_LIMIT_REASSESSMENT"],
    [1012, ["FINDING", "FINDING", "PASS", "NOT_APPLICABLE", "PASS", "FINDING"], "NEED_TO_RESTRICT"],
    [1013, ["PASS", "PASS", "PASS", "NOT_APPLICABLE", "NOT_APPLICABLE", "PASS"], "AUTO_REVIEW_PASS"]
  ];

  assert.deepEqual(fixtures.map(value => {
    const result = evaluate(value);
    return [value.customer_number, result.traces.map(trace => trace.outcome), result.action.primary];
  }), expected);
  for (const value of fixtures) assert.deepEqual(evaluate(value).traces.map(trace => trace.outcome), legacyOutcomes(value));
});

test("Narrative Customers match the exact deterministic review matrix", () => {
  assert.equal(fixtures.length, 13);
  assert.deepEqual(narrativeCustomers.map(({ customer_number, name }) => [customer_number, name]), [[2001, "Northwind Components"], [2002, "Cascade Freight"], [2003, "Meridian Industrial"], [2004, "Ironclad Manufacturing"]]);
  const sourceIds = ["customer_number","name","ar_balance","past_due_amount","adp_days","credit_limit","payment_terms","restricted_status","discontinued_status","annual_revenue","ebitda","net_income","operating_cash_flow","current_ratio","debt_to_equity_ratio","financial_statement_status","net_sales_180d","net_sales_360d"];
  assert.deepEqual(narrativeCustomers.map(value => sourceIds.map(id => value[id])), [
    [2001,"Northwind Components",40000,0,25,60000,"NET_30","N","N",2400000,240000,96000,180000,1.6,1.2,"CURRENT",300000,600000],
    [2002,"Cascade Freight",100000,18000,25,100000,"NET_30","N","N",2400000,240000,96000,180000,1.6,1.2,"CURRENT",1080000,2160000],
    [2003,"Meridian Industrial",40000,1000,25,90000,"NET_30","N","N",2400000,240000,96000,180000,1.6,1.2,"STALE",540000,960000],
    [2004,"Ironclad Manufacturing",100000,20000,25,100000,"NET_45","N","N",2400000,-10000,-20000,-50000,.8,4,"CURRENT",540000,960000]
  ]);
  const expected = [
    { derived: [50000,50000,50000,1,0,2/3,.1,.04,.075,30], outcomes: ["PASS","PASS","PASS","NOT_APPLICABLE","PASS","PASS"], reasons: [], calculation: ["NO_CHANGE_RECOMMENDED",60000], action: ["AUTO_REVIEW_PASS",[]], tools: [] },
    { derived: [180000,180000,180000,1,.18,1,.1,.04,.075,30], outcomes: ["FINDING","FINDING","PASS","NOT_APPLICABLE","PASS","PASS"], reasons: ["GLOBAL_PAST_DUE_LIMIT_EXCEEDED","NET30_PAST_DUE_LIMIT_EXCEEDED"], calculation: ["NO_CHANGE_RECOMMENDED",100000], action: ["NEED_CREDIT_MANAGER_REVIEW",["NEED_MANUAL_REVIEW"]], tools: ["get_payment_history","get_open_disputes"] },
    { derived: [90000,80000,90000,1.125,.025,4/9,.1,.04,.075,30], outcomes: ["PASS","PASS","PASS","NOT_APPLICABLE","FINDING","PASS"], reasons: ["UPDATED_FINANCIALS_REQUIRED"], calculation: ["BLOCKED_FINANCIALS_REQUIRED",null], action: ["REQUEST_UPDATED_FINANCIAL_STATEMENTS",[]], tools: [] },
    { derived: [90000,80000,90000,1.125,.2,1,-10000/2400000,-20000/2400000,-50000/2400000,45], outcomes: ["FINDING","NOT_APPLICABLE","PASS","NOT_APPLICABLE","PASS","FINDING"], reasons: ["GLOBAL_PAST_DUE_LIMIT_EXCEEDED","CRITICAL_RESTRICTION_TRIGGER"], calculation: ["CALCULATED",75000], action: ["NEED_TO_RESTRICT",["NEED_MANUAL_REVIEW","RECOMMEND_CREDIT_LIMIT_REASSESSMENT"]], tools: ["get_payment_history","get_open_disputes","get_recent_orders"] }
  ];
  const derivedIds = ["monthly_net_sales_180d","monthly_net_sales_360d","monthly_net_sales_run_rate","net_sales_trend_ratio","past_due_ratio","credit_utilization","ebitda_margin","net_income_margin","operating_cash_flow_margin","payment_term_days"];
  narrativeCustomers.forEach((value, index) => {
    assert.equal(Object.keys(value).length, 18);
    const context = registry.context(value), result = evaluate(value), expectation = expected[index];
    derivedIds.forEach((id, derivedIndex) => assert.ok(Math.abs(context.get(id) - expectation.derived[derivedIndex]) < Number.EPSILON * 4, `${value.name} ${id}`));
    assert.deepEqual(result.traces.map(trace => trace.outcome), expectation.outcomes);
    assert.deepEqual(result.findings.map(trace => trace.finding.reasonCode), expectation.reasons);
    assert.deepEqual([result.calculation.status, result.calculation.recommended], expectation.calculation);
    assert.deepEqual([result.action.primary, result.action.supporting], expectation.action);
    assert.deepEqual(eligibleEvidenceTools(result.findings), expectation.tools);
  });
  assert.equal(evaluate(narrativeCustomers[3]).calculation.delta, -25000);
});

test("candidate evaluation rejects release provenance that omits its revision", () => {
  const replacement = compileCandidate(scenarios.ratio5.ast, scenarios.ratio5.revision);
  const rules = activeRules.map(item => item.id === replacement.id ? replacement : item);
  assert.throws(() => evaluate(fixtures[0], rules), /credit-1.4.0 does not contain NET30_PAST_DUE_MAX@5/);
  const result = evaluate(fixtures[0], rules, candidateRelease(rules, "credit-1.4.0-candidate-r5"));
  assert.equal(result.traces.find(trace => trace.policyRef.ruleId === replacement.id).evaluationRef, "credit-1.4.0-candidate-r5/NET30_PAST_DUE_MAX@5");
  assert.equal(result.release.status, "CANDIDATE_PREVIEW");
  assert.equal(Object.hasOwn(result.release, "publishedAt"), false);
});

test("rule comparisons must satisfy ontology types, enums, and units", () => {
  const active = activeRules.find(item => item.id === "NET30_PAST_DUE_MAX");
  const replaceCondition = condition => activeRules.map(item => item.id === active.id ? { ...active, conditions: [condition] } : item);
  for (const [condition, expected] of [
    [{ fact: "past_due_ratio", op: ">", value: "8%" }, /numeric comparison value/],
    [{ fact: "payment_terms", op: "==", value: "NET_90" }, /outside the ontology enum/],
    [{ fact: "adp_days", op: ">", value: 25, unit: "USD" }, /unit contract/]
  ]) {
    const rules = replaceCondition(condition);
    assert.throws(() => evaluate(fixtures[0], rules, candidateRelease(rules)), expected);
  }
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
  assert.ok(result.traces.some(trace => trace.outcome === "INDETERMINATE"));
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
  const previewRelease = candidateRelease(candidate);
  const batch = compareBatch(fixtures, x => evaluate(x), x => evaluate(x, candidate, previewRelease));
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
  assert.equal(evaluate(target).traces.find(trace => trace.policyRef.ruleId === replacement.id).outcome, "FINDING");
  assert.equal(evaluate(target, candidate, candidateRelease(candidate)).traces.find(trace => trace.policyRef.ruleId === replacement.id).outcome, "PASS");
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

test("Disposition validation preserves acceptance and constrains overrides", () => {
  const context = { customerNumber: 2002, releaseId: "credit-1.4.0", evaluationRefs: ["credit-1.4.0/RULE_A@1"], deterministicAction: "NEED_CREDIT_MANAGER_REVIEW" };
  assert.deepEqual(createDisposition({ ...context, status: "ACCEPTED", action: "NEED_TO_RESTRICT", reason: "ignored reason" }), { ...context, status: "ACCEPTED", action: context.deterministicAction, reason: null });
  const overridden = createDisposition({ ...context, status: "OVERRIDDEN", action: "NEED_MANUAL_REVIEW", reason: "  Needs specialist review.  " });
  assert.equal(overridden.reason, "Needs specialist review.");
  assert.throws(() => createDisposition({ ...context, status: "OVERRIDDEN", action: context.deterministicAction, reason: "Long enough reason" }), /different allowed action/);
  assert.throws(() => createDisposition({ ...context, status: "OVERRIDDEN", action: "UNKNOWN", reason: "Long enough reason" }), /different allowed action/);
  assert.throws(() => createDisposition({ ...context, status: "OVERRIDDEN", action: "NEED_MANUAL_REVIEW", reason: " too short " }), /10–500/);
});

test("Disposition store replaces one customer/release record and reloads only exact pinned traces", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const context = { customerNumber: 2002, releaseId: "credit-1.4.0", evaluationRefs: ["credit-1.4.0/RULE_A@1"], deterministicAction: "NEED_CREDIT_MANAGER_REVIEW" };
  createDispositionStore(storage).save({ ...context, status: "ACCEPTED" });
  const reloaded = createDispositionStore(storage);
  reloaded.save({ ...context, status: "OVERRIDDEN", action: "NEED_MANUAL_REVIEW", reason: "A reviewed exception" });
  assert.equal(reloaded.load(context).status, "OVERRIDDEN");
  assert.equal(reloaded.load({ ...context, customerNumber: 2003 }), null);
  assert.equal(reloaded.load({ ...context, releaseId: "credit-1.5.0", evaluationRefs: ["credit-1.5.0/RULE_A@1"] }), null);
  assert.equal(reloaded.load({ ...context, evaluationRefs: ["credit-1.4.0/RULE_A@2"] }), null);
  assert.equal(reloaded.load({ ...context, deterministicAction: "NEED_TO_RESTRICT" }), null);
  reloaded.clear();
  assert.equal(reloaded.load(context), null);
});
