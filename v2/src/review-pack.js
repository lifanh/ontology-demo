/* V2-only deterministic Customer Review domain.
   The fact names and R1-R6 controls follow the SE business prototype.
   V1 continues to use src/domains/credit/pack.js. */
import { FactRegistry } from "../../src/core/runtime.js";

const factDefinition = (displayName, group, type = "decimal", unit = null, extra = {}) => ({
  displayName,
  group,
  type,
  unit,
  format: unit === "USD" ? "CURRENCY" : unit === "DAYS" ? "DAYS" : ["decimal", "integer"].includes(type) ? "NUMBER" : "TEXT",
  ...extra
});

export const properties = Object.freeze({
  customer_number: factDefinition("Customer number", "Identity", "integer"),
  name: factDefinition("Customer name", "Identity", "string"),
  relationship_type: factDefinition("Relationship type", "Financial relationship", "enum", null, { values: ["SINGLE", "FINANCIAL_MASTER"] }),
  sharing_group_restricted: factDefinition("Sharing group restricted", "Financial relationship", "enum", null, { values: ["Y", "N"] }),
  ar_balance: factDefinition("AR balance", "Credit operations", "decimal", "USD"),
  pending_amount: factDefinition("Pending amount", "Credit operations", "decimal", "USD"),
  past_due_amount: factDefinition("Past due amount", "Credit operations", "decimal", "USD"),
  open_invoices_over_39_days: factDefinition("Open invoices at least 39 days old", "Credit operations", "decimal", "USD"),
  max_balance_90d: factDefinition("Maximum balance · 90 days", "Credit operations", "decimal", "USD"),
  adp_w_90d: factDefinition("ADP-W · 90 days", "Payment behavior", "decimal", "DAYS"),
  weighted_terms_days: factDefinition("Weighted terms", "Payment behavior", "decimal", "DAYS"),
  nsf_count_90d: factDefinition("NSF events · 90 days", "Payment behavior", "integer"),
  chargeback_count_90d: factDefinition("Chargeback events · 90 days", "Payment behavior", "integer"),
  auto_review_count: factDefinition("Automatic review count", "Review controls", "integer"),
  auto_review_limit: factDefinition("Automatic review limit", "Review controls", "integer"),
  credit_limit: factDefinition("Credit limit", "Credit operations", "decimal", "USD"),
  requested_credit_limit: factDefinition("Requested credit limit", "Credit operations", "decimal", "USD"),
  payment_terms: factDefinition("Payment terms", "Credit operations", "enum", null, { values: ["NET_15", "NET_30", "NET_45", "NET_60", "CS"] }),
  annual_revenue: factDefinition("Annual revenue", "Financial statements", "decimal", "USD"),
  ebitda: factDefinition("EBITDA", "Financial statements", "decimal", "USD"),
  net_income: factDefinition("Net income", "Financial statements", "decimal", "USD"),
  operating_cash_flow: factDefinition("Operating cash flow", "Financial statements", "decimal", "USD"),
  current_ratio: factDefinition("Current ratio", "Financial statements"),
  debt_to_equity_ratio: factDefinition("Debt / equity ratio", "Financial statements"),
  financial_statement_status: factDefinition("Statement status", "Financial statements", "enum", null, { values: ["CURRENT", "STALE", "MISSING"] }),
  net_sales_180d: factDefinition("Net sales · 180 days", "Order demand", "decimal", "USD"),
  net_sales_360d: factDefinition("Net sales · 360 days", "Order demand", "decimal", "USD")
});

const ratio = (numerator, denominator) => ({ get }) => {
  const n = get(numerator), d = get(denominator);
  return n === null || d === null || d === 0 ? null : n / d;
};
const sum = (...facts) => ({ get }) => {
  const values = facts.map(get);
  return values.some(value => value === null) ? null : values.reduce((total, value) => total + value, 0);
};

export const derived = Object.freeze({
  total_exposure: { ...factDefinition("Total exposure", "Derived facts", "decimal", "USD"), dependencies: ["ar_balance", "pending_amount"], derive: sum("ar_balance", "pending_amount") },
  past_due_ratio: { ...factDefinition("Past due ratio", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["past_due_amount", "ar_balance"], derive: ratio("past_due_amount", "ar_balance") },
  credit_utilization: { ...factDefinition("Exposure utilization", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["total_exposure", "credit_limit"], derive: ratio("total_exposure", "credit_limit") },
  max_balance_percent_of_limit: { ...factDefinition("Maximum balance % of limit", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["max_balance_90d", "credit_limit"], derive: ratio("max_balance_90d", "credit_limit") },
  payment_exception_count_90d: { ...factDefinition("NSF and chargeback events · 90 days", "Derived facts", "integer"), dependencies: ["nsf_count_90d", "chargeback_count_90d"], derive: sum("nsf_count_90d", "chargeback_count_90d") },
  auto_review_limit_reached: { ...factDefinition("Automatic review limit reached", "Derived facts", "enum", null, { values: ["Y", "N"] }), dependencies: ["auto_review_count", "auto_review_limit"], derive: ({ get }) => get("auto_review_count") === null || get("auto_review_limit") === null ? null : get("auto_review_count") >= get("auto_review_limit") ? "Y" : "N" },
  monthly_net_sales_180d: { ...factDefinition("Monthly sales · 180 days", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_180d"], derive: ({ get }) => get("net_sales_180d") === null ? null : get("net_sales_180d") / 6 },
  monthly_net_sales_360d: { ...factDefinition("Monthly sales · 360 days", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_360d"], derive: ({ get }) => get("net_sales_360d") === null ? null : get("net_sales_360d") / 12 },
  monthly_net_sales_run_rate: { ...factDefinition("Monthly sales run rate", "Derived facts", "decimal", "USD"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ({ get }) => get("monthly_net_sales_180d") === null || get("monthly_net_sales_360d") === null ? null : Math.max(get("monthly_net_sales_180d"), get("monthly_net_sales_360d")) },
  net_sales_trend_ratio: { ...factDefinition("Net sales trend", "Derived facts"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ratio("monthly_net_sales_180d", "monthly_net_sales_360d") },
  ebitda_margin: { ...factDefinition("EBITDA margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["ebitda", "annual_revenue"], derive: ratio("ebitda", "annual_revenue") },
  net_income_margin: { ...factDefinition("Net income margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["net_income", "annual_revenue"], derive: ratio("net_income", "annual_revenue") },
  operating_cash_flow_margin: { ...factDefinition("OCF margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["operating_cash_flow", "annual_revenue"], derive: ratio("operating_cash_flow", "annual_revenue") },
  payment_term_days: { ...factDefinition("Payment term days", "Derived facts", "integer", "DAYS"), dependencies: ["payment_terms"], derive: ({ get }) => ({ NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60, CS: 0 })[get("payment_terms")] ?? null }
});

export const registry = new FactRegistry({ properties, derived });
const input = id => ({ id, type: registry.definition(id).type, unit: registry.definition(id).unit || null });
const rule = (id, revision, options) => Object.freeze({
  id,
  revision,
  ...options,
  scope: Object.freeze((options.scope || []).map(Object.freeze)),
  conditions: Object.freeze(options.conditions.map(Object.freeze)),
  policy: Object.freeze({ ...options.policy })
});

const adpPolicy = value => ({ title: "R1 · ADP-W threshold", statement: `Decision-scope 90-day weighted ADP-W above ${value} days requires manual review.` });
const lowAdpPastDuePolicy = value => ({ title: "R2 · Low ADP with delinquent invoices", statement: `When ADP-W is below 39 days and invoices at least 39 days old remain open, past due at or above ${value * 100}% of AR requires manual review.` });

export const activeRules = Object.freeze([
  rule("R1_ADP_W", 1, { policy: adpPolicy(38), conditions: [{ fact: "adp_w_90d", op: ">", value: 38, unit: "DAYS" }], constraint: { type: "SET_MAX", fact: "adp_w_90d", value: 38, unit: "DAYS" }, reasonCode: "ADP_W_THRESHOLD_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("R2_LOW_ADP_PLUS_PD", 1, { policy: lowAdpPastDuePolicy(.10), scope: [{ fact: "adp_w_90d", op: "<", value: 39, unit: "DAYS" }, { fact: "open_invoices_over_39_days", op: ">", value: 0, unit: "USD" }], conditions: [{ fact: "past_due_ratio", op: ">=", value: .10 }], constraint: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value: .10 }, reasonCode: "LOW_ADP_DELINQUENT_INVOICES", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("R3_MAX_BALANCE_VS_LIMIT", 1, { policy: { title: "R3 · Maximum balance versus limit", statement: "A maximum balance in the last 90 days at or above 150% of the credit limit is a visibility signal, not a hard stop." }, conditions: [{ fact: "max_balance_percent_of_limit", op: ">=", value: 1.5 }], reasonCode: "MAX_BALANCE_VISIBILITY", material: false, actionHint: null }),
  rule("R4_RESTRICTED_GROUP", 1, { policy: { title: "R4 · Restricted financial group", statement: "A restriction on the financial master or any sharing subsidiary requires analyst review." }, conditions: [{ fact: "sharing_group_restricted", op: "==", value: "Y" }], reasonCode: "FINANCIAL_GROUP_RESTRICTED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("R5_NSF_CHARGEBACK", 1, { policy: { title: "R5 · NSF or chargeback events", statement: "Any NSF or chargeback event in the last 90 days requires manual review." }, conditions: [{ fact: "payment_exception_count_90d", op: ">", value: 0 }], reasonCode: "RECENT_PAYMENT_EXCEPTION", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("R6_AUTO_REVIEW_COUNT", 1, { policy: { title: "R6 · Automatic review count", statement: "An automatic review count at or above the configured account limit forces manual review." }, conditions: [{ fact: "auto_review_limit_reached", op: "==", value: "Y" }], reasonCode: "AUTO_REVIEW_LIMIT_REACHED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("CURRENT_FINANCIAL_STATEMENTS", 1, { policy: { title: "Current financial statements", statement: "Customers with a credit limit above $50,000 must have current financial statements." }, scope: [{ fact: "credit_limit", op: ">", value: 50000, unit: "USD" }], conditions: [{ fact: "financial_statement_status", op: "!=", value: "CURRENT" }], reasonCode: "UPDATED_FINANCIALS_REQUIRED", material: false, actionHint: "REQUEST_UPDATED_FINANCIAL_STATEMENTS" })
]);

const grade = (value, bands) => bands.find(([matches]) => matches(value))?.[1] || "weak";
const gradeScores = { strong: 3, acceptable: 2, watch: 1, weak: 0 };
export const calculator = Object.freeze({
  version: "customer-review-limit-1.0",
  advisory: true,
  inputs: ["sharing_group_restricted", "credit_limit", "financial_statement_status", "annual_revenue", "current_ratio", "debt_to_equity_ratio", "ebitda_margin", "operating_cash_flow_margin", "net_income_margin", "monthly_net_sales_run_rate", "payment_term_days", "past_due_ratio", "adp_w_90d", "weighted_terms_days"].map(input),
  calculate(context) {
    const current = context.get("credit_limit"), statementStatus = context.get("financial_statement_status");
    const base = { version: this.version, advisory: true, current };
    if (context.get("sharing_group_restricted") === "Y") return { ...base, status: "BLOCKED_RESTRICTED", recommended: null };
    if (current !== null && current > 50000 && statementStatus !== "CURRENT") return { ...base, status: "BLOCKED_FINANCIALS_REQUIRED", recommended: null };
    if (current !== null && current <= 50000 && statementStatus !== "CURRENT") return { ...base, status: "NOT_AVAILABLE", recommended: null };
    if (this.inputs.some(contract => context.get(contract.id) === null)) return { ...base, status: "INDETERMINATE", recommended: null };

    const contributions = {
      currentRatio: grade(context.get("current_ratio"), [[value => value >= 1.5, "strong"], [value => value >= 1.2, "acceptable"], [value => value >= 1, "watch"]]),
      debtToEquity: grade(context.get("debt_to_equity_ratio"), [[value => value <= 1.5, "strong"], [value => value <= 2.5, "acceptable"], [value => value <= 3.5, "watch"]]),
      ebitdaMargin: grade(context.get("ebitda_margin"), [[value => value >= .10, "strong"], [value => value >= .05, "acceptable"], [value => value >= 0, "watch"]]),
      ocfMargin: grade(context.get("operating_cash_flow_margin"), [[value => value >= .05, "strong"], [value => value > 0, "acceptable"], [value => value === 0, "watch"]]),
      netMargin: grade(context.get("net_income_margin"), [[value => value >= .03, "strong"], [value => value >= 0, "acceptable"]])
    };
    const average = Object.values(contributions).reduce((total, contribution) => total + gradeScores[contribution], 0) / 5;
    const financialGrade = average >= 2.5 ? "strong" : average >= 1.5 ? "acceptable" : average >= .5 ? "watch" : "weak";
    const pastDueRatio = context.get("past_due_ratio"), adp = context.get("adp_w_90d"), terms = context.get("weighted_terms_days");
    const paymentGrade = pastDueRatio <= .05 && adp <= terms ? "strong" : pastDueRatio <= .10 && adp <= terms + 10 ? "acceptable" : pastDueRatio <= .15 || adp <= terms + 20 ? "watch" : "severe";
    const monthlyRunRate = context.get("monthly_net_sales_run_rate"), termDays = context.get("payment_term_days");
    const termExposure = monthlyRunRate * termDays / 30, demandBasis = termExposure * 1.10;
    const paymentMultiplier = ({ strong: 1.10, acceptable: 1, watch: .75, severe: .5 })[paymentGrade];
    const demandAdjusted = demandBasis * paymentMultiplier;
    const capacityCap = context.get("annual_revenue") * ({ strong: .10, acceptable: .075, watch: .05, weak: .025 })[financialGrade];
    const requested = context.get("requested_credit_limit");
    const constraints = [{ name: "DEMAND", value: demandAdjusted }, { name: "FINANCIAL_CAP", value: capacityCap }, ...(requested === null ? [] : [{ name: "REQUESTED_LIMIT", value: requested }])];
    const binding = constraints.reduce((lowest, candidate) => candidate.value < lowest.value ? candidate : lowest);
    let guarded = Math.round(Math.min(10000000, Math.max(10000, binding.value)) / 5000) * 5000;
    if (current >= 10000) {
      guarded = Math.min(Math.floor(current * 1.25 / 5000) * 5000, Math.max(Math.ceil(current * .75 / 5000) * 5000, guarded));
    }
    if (["watch", "severe"].includes(paymentGrade)) guarded = current;
    const rawDelta = guarded - current, rawDeltaPercent = current === 0 ? null : rawDelta / current;
    const material = Math.abs(rawDelta) >= 10000 && (current === 0 || Math.abs(rawDeltaPercent) >= .10);
    const recommended = material ? guarded : current;
    const delta = recommended - current, deltaPercent = current === 0 ? null : delta / current;
    const acceptableRange = [Math.max(10000, Math.round(guarded * .9 / 5000) * 5000), Math.min(10000000, Math.round(guarded * 1.1 / 5000) * 5000)];
    return { ...base, status: material ? "CALCULATED" : "NO_CHANGE_RECOMMENDED", unconstrained: binding.value, rawRecommended: guarded, recommended, delta, deltaPercent, direction: delta > 0 ? "INCREASE" : delta < 0 ? "DECREASE" : "NO_CHANGE", acceptableRange, demand: { monthlyRunRate, termDays, termExposure, demandBasis, paymentMultiplier }, financialGrade, paymentGrade, contributions, capacityCap, requested, bindingConstraint: binding.name, material };
  }
});

export function resolveAction(context, findings, calculation, { hasIndeterminateRule }) {
  const hints = [...new Set(findings.map(finding => finding.actionHint).filter(Boolean))];
  const restricted = context.get("sharing_group_restricted") === "Y";
  const manual = hints.includes("NEED_MANUAL_REVIEW");
  const documents = hints.includes("REQUEST_UPDATED_FINANCIAL_STATEMENTS");
  const indeterminate = hasIndeterminateRule || calculation.status === "INDETERMINATE";
  const primary = indeterminate || restricted || manual
    ? "NEED_MANUAL_REVIEW"
    : documents
      ? "REQUEST_UPDATED_FINANCIAL_STATEMENTS"
      : calculation.material
        ? "RECOMMEND_CREDIT_LIMIT_REASSESSMENT"
        : "AUTO_REVIEW_PASS";
  const supporting = [
    ...(restricted ? ["KEEP_EXISTING_RESTRICTION"] : []),
    ...(documents && primary !== "REQUEST_UPDATED_FINANCIAL_STATEMENTS" ? ["REQUEST_UPDATED_FINANCIAL_STATEMENTS"] : []),
    ...(calculation.material && primary !== "RECOMMEND_CREDIT_LIMIT_REASSESSMENT" ? ["RECOMMEND_CREDIT_LIMIT_REASSESSMENT"] : [])
  ];
  return { primary, supporting, basedOn: findings.filter(finding => finding.actionHint).map(finding => finding.reasonCode) };
}

export const release = Object.freeze({
  id: "customer-review-2.0.0",
  ontologyVersion: "customer-review-1.0",
  actionPolicyVersion: "customer-review-actions-1.0",
  calculatorVersion: calculator.version,
  status: "BASELINE",
  rules: Object.freeze(activeRules.map(({ id, revision }) => Object.freeze({ id, revision }))),
  compiledRules: activeRules
});

export const reviewPack = Object.freeze({ registry, rules: activeRules, release, calculator, resolveAction, resolverVersion: "customer-review-actions-1.0" });

const base = Object.freeze({
  relationship_type: "SINGLE", sharing_group_restricted: "N", ar_balance: 272800, pending_amount: 18400, past_due_amount: 0,
  open_invoices_over_39_days: 0, max_balance_90d: 273000, adp_w_90d: 22.1, weighted_terms_days: 30,
  nsf_count_90d: 0, chargeback_count_90d: 0, auto_review_count: 1, auto_review_limit: 3,
  credit_limit: 620000, requested_credit_limit: null, payment_terms: "NET_30", annual_revenue: 12000000,
  ebitda: 1440000, net_income: 600000, operating_cash_flow: 960000, current_ratio: 2.2, debt_to_equity_ratio: .6,
  financial_statement_status: "CURRENT", net_sales_180d: 3100000, net_sales_360d: 6100000
});
const fixture = (customer_number, name, changes = {}) => Object.freeze({ ...base, customer_number, name, ...changes });

export const narrativeCustomers = Object.freeze([
  fixture(2001, "Northwind Components"),
  fixture(2002, "Cascade Freight", {
    relationship_type: "FINANCIAL_MASTER", ar_balance: 4120000, pending_amount: 180000, past_due_amount: 212400,
    open_invoices_over_39_days: 96300, max_balance_90d: 14280000, adp_w_90d: 73.9, weighted_terms_days: 45,
    nsf_count_90d: 2, chargeback_count_90d: 1, auto_review_count: 2, credit_limit: 8500000,
    payment_terms: "NET_45", annual_revenue: 45000000, ebitda: 1575000, net_income: 225000,
    operating_cash_flow: 450000, current_ratio: 1.1, debt_to_equity_ratio: 3.4,
    net_sales_180d: 7100000, net_sales_360d: 14200000
  }),
  fixture(2003, "Meridian Industrial", {
    relationship_type: "FINANCIAL_MASTER", ar_balance: 2816000, pending_amount: 95000, past_due_amount: 394240,
    open_invoices_over_39_days: 41200, max_balance_90d: 2816000, adp_w_90d: 38, weighted_terms_days: 30,
    auto_review_count: 3, credit_limit: 3200000, payment_terms: "NET_30", annual_revenue: 31700000,
    ebitda: 1458200, net_income: 634000, operating_cash_flow: 951000, current_ratio: 1.3, debt_to_equity_ratio: 2.6,
    financial_statement_status: "STALE", net_sales_180d: 15850000, net_sales_360d: 31700000
  }),
  fixture(2004, "Ironclad Manufacturing", {
    ar_balance: 1061000, pending_amount: 62000, max_balance_90d: 1068000, adp_w_90d: 29.4,
    credit_limit: 1750000, requested_credit_limit: 2000000, annual_revenue: 30000000,
    ebitda: 3000000, net_income: 1500000, operating_cash_flow: 2400000, current_ratio: 2,
    debt_to_equity_ratio: 1.1, net_sales_180d: 10200000, net_sales_360d: 19800000
  })
]);

const r2Ast = (id, value) => ({ id, scope: [{ fact: "adp_w_90d", op: "<", value: 39, unit: "DAYS" }, { fact: "open_invoices_over_39_days", op: ">", value: 0, unit: "USD" }], effect: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value } });
const r1Ast = (id, value) => ({ id, scope: [], effect: { type: "SET_MAX", fact: "adp_w_90d", value, unit: "DAYS" } });
export const scenarios = Object.freeze({
  pastDue8: Object.freeze({ policy: "When ADP-W is below 39 days and invoices at least 39 days old remain open, require manual review at 8% past due.", logicalId: "R2_LOW_ADP_PLUS_PD", revision: 2, ast: r2Ast("R2_LOW_ADP_PLUS_PD", .08) }),
  pastDue12: Object.freeze({ policy: "When ADP-W is below 39 days and invoices at least 39 days old remain open, require manual review at 12% past due.", logicalId: "R2_LOW_ADP_PLUS_PD", revision: 2, ast: r2Ast("R2_LOW_ADP_PLUS_PD", .12) }),
  adp35: Object.freeze({ policy: "Require manual review when decision-scope 90-day weighted ADP-W exceeds 35 days.", logicalId: "R1_ADP_W", revision: 2, ast: r1Ast("R1_ADP_W", 35) }),
  adp40: Object.freeze({ policy: "Require manual review when decision-scope 90-day weighted ADP-W exceeds 40 days.", logicalId: "R1_ADP_W", revision: 2, ast: r1Ast("R1_ADP_W", 40) })
});

const sameR2Scope = scope => scope.length === 2
  && scope.some(condition => condition.fact === "adp_w_90d" && condition.op === "<" && condition.value === 39 && condition.unit === "DAYS")
  && scope.some(condition => condition.fact === "open_invoices_over_39_days" && condition.op === ">" && condition.value === 0 && condition.unit === "USD");

export function compileCandidate(ast, revision) {
  if (ast.id === "R1_ADP_W" && ast.scope.length === 0 && ast.effect.type === "SET_MAX" && ast.effect.fact === "adp_w_90d" && ast.effect.unit === "DAYS") {
    return rule(ast.id, revision, { policy: adpPolicy(ast.effect.value), conditions: [{ fact: "adp_w_90d", op: ">", value: ast.effect.value, unit: "DAYS" }], constraint: ast.effect, reasonCode: "ADP_W_THRESHOLD_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" });
  }
  if (ast.id === "R2_LOW_ADP_PLUS_PD" && sameR2Scope(ast.scope) && ast.effect.type === "SET_MAX_RATIO" && ast.effect.numerator === "past_due_amount" && ast.effect.denominator === "ar_balance") {
    return rule(ast.id, revision, { policy: lowAdpPastDuePolicy(ast.effect.value), scope: ast.scope, conditions: [{ fact: "past_due_ratio", op: ">=", value: ast.effect.value }], constraint: ast.effect, reasonCode: "LOW_ADP_DELINQUENT_INVOICES", actionHint: "NEED_MANUAL_REVIEW" });
  }
  throw new Error(`Candidate ${ast.id} does not match its supported policy family`);
}

export function analyzeCandidate(ast, rules = activeRules) {
  const active = rules.find(rule => rule.id === ast.id);
  const candidate = compileCandidate(ast, active.revision + 1);
  const value = candidate.constraint.value, activeValue = active.constraint.value;
  const display = candidate.constraint.type === "SET_MAX_RATIO" ? candidateValue => `${candidateValue * 100}%` : candidateValue => `${candidateValue} days`;
  return {
    status: value === activeValue ? "REDUNDANT" : value < activeValue ? "COMPATIBLE_REFINEMENT" : "COMPATIBLE_RELAXATION",
    summary: `Active ${display(activeValue)} → candidate ${display(value)}`
  };
}

const impactR2 = (id, percentage) => fixture(id, `Impact R2 ${percentage}%`, { ar_balance: 100000, past_due_amount: percentage * 1000, open_invoices_over_39_days: 1000, adp_w_90d: 30, max_balance_90d: 50000, credit_limit: 620000 });
const impactR1 = (id, days) => fixture(id, `Impact R1 ${days}d`, { past_due_amount: 0, open_invoices_over_39_days: 0, adp_w_90d: days, max_balance_90d: 50000, credit_limit: 620000 });
export const policyImpactCohort = Object.freeze({
  id: "v2-customer-review-boundaries-1",
  records: Object.freeze([
    impactR2(3001, 6), impactR2(3002, 8), impactR2(3003, 9), impactR2(3004, 10), impactR2(3005, 11), impactR2(3006, 12),
    impactR1(3007, 34), impactR1(3008, 35), impactR1(3009, 36), impactR1(3010, 38), impactR1(3011, 39), impactR1(3012, 41)
  ])
});
