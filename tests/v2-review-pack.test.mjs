import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { assessReviewImpact, createEvaluator } from "../src/core/runtime.js";
import {
  activeRules,
  compileCandidate,
  narrativeCustomers,
  policyImpactCohort,
  release,
  reviewPack,
  scenarios
} from "../v2/src/review-pack.js";

const evaluate = createEvaluator(reviewPack);
const byNumber = number => narrativeCustomers.find(customer => customer.customer_number === number);
const trace = (result, ruleId) => result.traces.find(item => item.policyRef.ruleId === ruleId);
const candidateRelease = rules => ({
  id: `${release.id}-candidate`,
  ontologyVersion: release.ontologyVersion,
  actionPolicyVersion: release.actionPolicyVersion,
  calculatorVersion: release.calculatorVersion,
  status: "CANDIDATE_PREVIEW",
  rules: rules.map(({ id, revision }) => ({ id, revision }))
});

test("v2 Narrative Customers represent the four SE review archetypes", () => {
  const results = narrativeCustomers.map(customer => evaluate(customer));
  assert.deepEqual(results.map(result => [
    result.customer.customer_number,
    result.findings.map(item => item.finding.reasonCode),
    result.action.primary,
    result.action.supporting,
    result.calculation.recommended
  ]), [
    [2001, [], "AUTO_REVIEW_PASS", [], 620000],
    [2002, ["ADP_W_THRESHOLD_EXCEEDED", "MAX_BALANCE_VISIBILITY", "RECENT_PAYMENT_EXCEPTION"], "NEED_MANUAL_REVIEW", [], 8500000],
    [2003, ["LOW_ADP_DELINQUENT_INVOICES", "AUTO_REVIEW_LIMIT_REACHED", "UPDATED_FINANCIALS_REQUIRED"], "NEED_MANUAL_REVIEW", ["REQUEST_UPDATED_FINANCIAL_STATEMENTS"], null],
    [2004, [], "RECOMMEND_CREDIT_LIMIT_REASSESSMENT", [], 2000000]
  ]);

  assert.equal(results[1].facts.max_balance_percent_of_limit, 1.68);
  assert.equal(results[2].facts.past_due_ratio, 0.14);
  assert.equal(results[3].calculation.bindingConstraint, "REQUESTED_LIMIT");
});

test("R1 and R2 observe their exact business boundaries", () => {
  const base = byNumber(2001);
  const atR1Boundary = trace(evaluate({ ...base, adp_w_90d: 38 }), "R1_ADP_W");
  assert.equal(atR1Boundary.outcome, "PASS");
  assert.equal(atR1Boundary.policy.statement, "Decision-scope 90-day weighted ADP-W above 38 days requires manual review.");
  assert.equal(trace(evaluate({ ...base, adp_w_90d: 38.1 }), "R1_ADP_W").outcome, "FINDING");

  const delinquent = { ...base, ar_balance: 100000, past_due_amount: 10000, adp_w_90d: 38, open_invoices_over_39_days: 1 };
  assert.equal(trace(evaluate(delinquent), "R2_LOW_ADP_PLUS_PD").outcome, "FINDING");
  assert.equal(trace(evaluate({ ...delinquent, past_due_amount: 9999 }), "R2_LOW_ADP_PLUS_PD").outcome, "PASS");
  assert.equal(trace(evaluate({ ...delinquent, open_invoices_over_39_days: 0 }), "R2_LOW_ADP_PLUS_PD").outcome, "NOT_APPLICABLE");
});

test("R3 is visible but cannot change the automatic-review action", () => {
  const customer = byNumber(2001);
  const result = evaluate({ ...customer, max_balance_90d: customer.credit_limit * 1.5 });
  const visibility = trace(result, "R3_MAX_BALANCE_VS_LIMIT");
  assert.equal(visibility.outcome, "FINDING");
  assert.equal(visibility.finding.material, false);
  assert.equal(result.action.primary, "AUTO_REVIEW_PASS");
  assert.deepEqual(result.action.basedOn, []);
});

test("R4 rolls a restricted sharing member into the financial-group decision", () => {
  const result = evaluate({ ...byNumber(2001), relationship_type: "FINANCIAL_MASTER", sharing_group_restricted: "Y" });
  assert.equal(trace(result, "R4_RESTRICTED_GROUP").outcome, "FINDING");
  assert.equal(result.action.primary, "NEED_MANUAL_REVIEW");
  assert.ok(result.action.supporting.includes("KEEP_EXISTING_RESTRICTION"));
  assert.equal(result.calculation.status, "BLOCKED_RESTRICTED");
});

test("R5 and R6 force manual review at their event and count boundaries", () => {
  const base = byNumber(2001);
  assert.equal(trace(evaluate(base), "R5_NSF_CHARGEBACK").outcome, "PASS");
  assert.equal(trace(evaluate({ ...base, nsf_count_90d: 1 }), "R5_NSF_CHARGEBACK").outcome, "FINDING");
  assert.equal(trace(evaluate({ ...base, chargeback_count_90d: 1 }), "R5_NSF_CHARGEBACK").outcome, "FINDING");
  assert.equal(trace(evaluate({ ...base, auto_review_count: 2, auto_review_limit: 3 }), "R6_AUTO_REVIEW_COUNT").outcome, "PASS");
  const countResult = evaluate({ ...base, auto_review_count: 3 });
  assert.equal(trace(countResult, "R6_AUTO_REVIEW_COUNT").outcome, "FINDING");
  assert.equal(countResult.action.primary, "NEED_MANUAL_REVIEW");
  assert.equal(trace(evaluate({ ...base, auto_review_count: 2, auto_review_limit: 2 }), "R6_AUTO_REVIEW_COUNT").outcome, "FINDING");
});

test("unmodeled Tier-2 context cannot alter deterministic findings or action", () => {
  const customer = byNumber(2002);
  const baseline = evaluate(customer);
  const withExternalClaims = evaluate({ ...customer, nacm_risk_score: 0, paydex: 100, ai_confidence: 1 });
  assert.deepEqual(withExternalClaims.findings, baseline.findings);
  assert.deepEqual(withExternalClaims.action, baseline.action);
  assert.deepEqual(withExternalClaims.calculation, baseline.calculation);
});

test("v2 policy candidates assess the R1 and R2 business boundaries", () => {
  for (const scenario of [scenarios.pastDue8, scenarios.adp35]) {
    const replacement = compileCandidate(scenario.ast, scenario.revision);
    const rules = activeRules.map(rule => rule.id === replacement.id ? replacement : rule);
    const impact = assessReviewImpact(
      policyImpactCohort,
      customer => evaluate(customer),
      customer => evaluate(customer, rules, candidateRelease(rules))
    );
    assert.equal(impact.complete, true);
    assert.ok(impact.summary.newlyRequiredReviews > 0);
    assert.ok(impact.changedRows.every(row => row.evidenceRefs.some(ref => ref.includes(replacement.id))));
  }
});
