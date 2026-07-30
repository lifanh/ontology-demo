import { FactRegistry } from "../../core/runtime.js";

const factDefinition = (displayName, group, type = "decimal", unit = null, extra = {}) => ({
  displayName,
  group,
  type,
  unit,
  format: unit === "USD" ? "CURRENCY" : unit === "DAYS" ? "DAYS" : ["decimal", "integer"].includes(type) ? "NUMBER" : "TEXT",
  ...extra
});
export const properties = {
  customer_number: factDefinition("Customer number", "Identity", "integer"), name: factDefinition("Customer name", "Identity", "string"),
  ar_balance: factDefinition("AR balance", "Credit operations", "decimal", "USD"), past_due_amount: factDefinition("Past due amount", "Credit operations", "decimal", "USD"),
  adp_days: factDefinition("Average days to pay", "Credit operations", "integer", "DAYS"), credit_limit: factDefinition("Credit limit", "Credit operations", "decimal", "USD"),
  payment_terms: factDefinition("Payment terms", "Credit operations", "enum", null, { values: ["NET_15", "NET_30", "NET_45", "NET_60"] }),
  restricted_status: factDefinition("Restricted status", "Credit operations", "enum", null, { values: ["Y", "N"] }), discontinued_status: factDefinition("Discontinued status", "Credit operations", "enum", null, { values: ["Y", "N"] }),
  annual_revenue: factDefinition("Annual revenue", "Financial statements", "decimal", "USD"), ebitda: factDefinition("EBITDA", "Financial statements", "decimal", "USD"), net_income: factDefinition("Net income", "Financial statements", "decimal", "USD"),
  operating_cash_flow: factDefinition("Operating cash flow", "Financial statements", "decimal", "USD"), current_ratio: factDefinition("Current ratio", "Financial statements"), debt_to_equity_ratio: factDefinition("Debt / equity ratio", "Financial statements"),
  financial_statement_status: factDefinition("Statement status", "Financial statements", "enum", null, { values: ["CURRENT", "STALE", "MISSING"] }),
  net_sales_180d: factDefinition("Net sales · 180 days", "Order demand", "decimal", "USD"), net_sales_360d: factDefinition("Net sales · 360 days", "Order demand", "decimal", "USD")
};
const ratio = (numerator, denominator) => ({ get }) => { const n = get(numerator), d = get(denominator); return n === null || d === null || d === 0 ? null : n / d; };
export const derived = {
  monthly_net_sales_180d: { ...factDefinition("Monthly sales · 180", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_180d"], derive: ({ get }) => get("net_sales_180d") === null ? null : get("net_sales_180d") / 6 },
  monthly_net_sales_360d: { ...factDefinition("Monthly sales · 360", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_360d"], derive: ({ get }) => get("net_sales_360d") === null ? null : get("net_sales_360d") / 12 },
  monthly_net_sales_run_rate: { ...factDefinition("Monthly sales run rate", "Derived facts", "decimal", "USD"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ({ get }) => get("monthly_net_sales_180d") === null || get("monthly_net_sales_360d") === null ? null : Math.max(get("monthly_net_sales_180d"), get("monthly_net_sales_360d")) },
  net_sales_trend_ratio: { ...factDefinition("Net sales trend", "Derived facts"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ratio("monthly_net_sales_180d", "monthly_net_sales_360d") },
  past_due_ratio: { ...factDefinition("Past due ratio", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["past_due_amount", "ar_balance"], derive: ratio("past_due_amount", "ar_balance") },
  credit_utilization: { ...factDefinition("Credit utilization", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["ar_balance", "credit_limit"], derive: ratio("ar_balance", "credit_limit") },
  ebitda_margin: { ...factDefinition("EBITDA margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["ebitda", "annual_revenue"], derive: ratio("ebitda", "annual_revenue") },
  net_income_margin: { ...factDefinition("Net income margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["net_income", "annual_revenue"], derive: ratio("net_income", "annual_revenue") },
  operating_cash_flow_margin: { ...factDefinition("OCF margin", "Derived facts", "decimal", null, { format: "PERCENT" }), dependencies: ["operating_cash_flow", "annual_revenue"], derive: ratio("operating_cash_flow", "annual_revenue") },
  payment_term_days: { ...factDefinition("Payment term days", "Derived facts", "integer", "DAYS"), dependencies: ["payment_terms"], derive: ({ get }) => ({ NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60 })[get("payment_terms")] ?? null }
};
export const registry = new FactRegistry({ properties, derived });
const input = (id, type = registry.definition(id).type, unit = registry.definition(id).unit || null) => ({ id, type, unit });

const rule = (id, revision, options) => Object.freeze({
  id,
  revision,
  ...options,
  scope: Object.freeze((options.scope || []).map(Object.freeze)),
  conditions: Object.freeze(options.conditions.map(Object.freeze)),
  policy: Object.freeze({ ...options.policy })
});
const net30Policy = value => ({ title: "NET 30 past-due limit", statement: `Customers on NET 30 terms may not have more than ${value * 100}% of accounts receivable past due.` });
const highBalanceAdpPolicy = value => ({ title: "High-balance payment limit", statement: `Unrestricted customers with AR above $100,000 may not exceed ${value} average days to pay.` });
export const activeRules = [
  rule("GLOBAL_PAST_DUE_MAX", 3, { policy: { title: "Past-due exposure limit", statement: "Customers may not have more than 10% of accounts receivable past due." }, conditions: [{ fact: "past_due_ratio", op: ">", value: .10 }], reasonCode: "GLOBAL_PAST_DUE_LIMIT_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("NET30_PAST_DUE_MAX", 4, { policy: net30Policy(.08), scope: [{ fact: "payment_terms", op: "==", value: "NET_30" }], conditions: [{ fact: "past_due_ratio", op: ">", value: .08 }], constraint: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value: .08 }, reasonCode: "NET30_PAST_DUE_LIMIT_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("GLOBAL_ADP_UNDER_30", 2, { policy: { title: "Average days to pay limit", statement: "Average days to pay must remain under 30 days." }, conditions: [{ fact: "adp_days", op: ">=", value: 30 }], reasonCode: "ADP_30_LIMIT_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("HIGH_BALANCE_ADP_MAX", 2, { policy: highBalanceAdpPolicy(25), scope: [{ fact: "restricted_status", op: "==", value: "N" }, { fact: "ar_balance", op: ">", value: 100000 }], conditions: [{ fact: "adp_days", op: ">", value: 25 }], constraint: { type: "SET_MAX", fact: "adp_days", value: 25, unit: "DAYS" }, reasonCode: "SCOPED_ADP_LIMIT_EXCEEDED", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("FINANCIAL_STATEMENTS_REQUIRED", 1, { policy: { title: "Current financial statements", statement: "Customers with a credit limit above $50,000 must have current financial statements." }, scope: [{ fact: "credit_limit", op: ">", value: 50000 }], conditions: [{ fact: "financial_statement_status", op: "!=", value: "CURRENT" }], reasonCode: "UPDATED_FINANCIALS_REQUIRED", material: false, actionHint: "REQUEST_UPDATED_FINANCIAL_STATEMENTS" }),
  rule("CRITICAL_RESTRICTION", 1, { policy: { title: "Critical restriction trigger", statement: "An unrestricted customer with more than 10% past due, negative operating cash flow, and a current ratio below 1 requires restriction." }, scope: [{ fact: "restricted_status", op: "==", value: "N" }], conditions: [{ fact: "past_due_ratio", op: ">", value: .10 }, { fact: "operating_cash_flow", op: "<", value: 0 }, { fact: "current_ratio", op: "<", value: 1 }], reasonCode: "CRITICAL_RESTRICTION_TRIGGER", actionHint: "NEED_TO_RESTRICT" })
];

const grade = (value, bands) => bands.find(([test]) => test(value))?.[1] || "weak";
const scores = { strong: 3, acceptable: 2, watch: 1, weak: 0 };
export const calculator = {
  version: "illustrative-credit-limit-1.0", advisory: true,
  inputs: ["restricted_status", "credit_limit", "financial_statement_status", "annual_revenue", "current_ratio", "debt_to_equity_ratio", "ebitda_margin", "operating_cash_flow_margin", "net_income_margin", "monthly_net_sales_run_rate", "payment_term_days", "past_due_ratio", "adp_days"].map(id => input(id)),
  calculate(c) {
    const current = c.get("credit_limit"), status = c.get("financial_statement_status");
    const base = { version: this.version, advisory: true, current };
    if (c.get("restricted_status") === "Y") return { ...base, status: "BLOCKED_RESTRICTED", recommended: null };
    if (current !== null && current > 50000 && status !== "CURRENT") return { ...base, status: "BLOCKED_FINANCIALS_REQUIRED", recommended: null };
    if (current !== null && current <= 50000 && status !== "CURRENT") return { ...base, status: "NOT_AVAILABLE", recommended: null };
    if (this.inputs.some(x => c.get(x.id) === null)) return { ...base, status: "INDETERMINATE", recommended: null };
    const contributions = {
      currentRatio: grade(c.get("current_ratio"), [[v => v >= 1.5, "strong"], [v => v >= 1.2, "acceptable"], [v => v >= 1, "watch"]]),
      debtToEquity: grade(c.get("debt_to_equity_ratio"), [[v => v <= 1.5, "strong"], [v => v <= 2.5, "acceptable"], [v => v <= 3.5, "watch"]]),
      ebitdaMargin: grade(c.get("ebitda_margin"), [[v => v >= .10, "strong"], [v => v >= .05, "acceptable"], [v => v >= 0, "watch"]]),
      ocfMargin: grade(c.get("operating_cash_flow_margin"), [[v => v >= .05, "strong"], [v => v > 0, "acceptable"], [v => v === 0, "watch"]]),
      netMargin: grade(c.get("net_income_margin"), [[v => v >= .03, "strong"], [v => v >= 0, "acceptable"]])
    };
    const average = Object.values(contributions).reduce((n, g) => n + scores[g], 0) / 5;
    const financialGrade = average >= 2.5 ? "strong" : average >= 1.5 ? "acceptable" : average >= .5 ? "watch" : "weak";
    const ratio = c.get("past_due_ratio"), adp = c.get("adp_days"), term = c.get("payment_term_days");
    const paymentGrade = ratio <= .05 && adp <= term ? "strong" : ratio <= .10 && adp <= term + 10 ? "acceptable" : ratio <= .15 || adp <= term + 20 ? "watch" : "severe";
    const runRate = c.get("monthly_net_sales_run_rate"), termExposure = runRate * term / 30, demandBasis = termExposure * 1.10;
    const paymentMultiplier = ({ strong: 1.10, acceptable: 1, watch: .75, severe: .5 })[paymentGrade];
    const capacityCap = c.get("annual_revenue") * ({ strong: .10, acceptable: .075, watch: .05, weak: .025 })[financialGrade];
    const demandAdjusted = demandBasis * paymentMultiplier;
    const unconstrained = Math.min(demandAdjusted, capacityCap);
    let guarded = Math.round(Math.min(1000000, Math.max(10000, unconstrained)) / 5000) * 5000;
    if (current >= 10000) {
      const lowerMovementLimit = Math.ceil(current * .75 / 5000) * 5000;
      const upperMovementLimit = Math.floor(current * 1.25 / 5000) * 5000;
      guarded = Math.min(upperMovementLimit, Math.max(lowerMovementLimit, guarded));
    }
    if (["watch", "severe"].includes(paymentGrade)) guarded = Math.max(10000, Math.min(guarded, Math.floor(current / 5000) * 5000));
    const delta = guarded - current, deltaPercent = current === 0 ? null : delta / current;
    const material = Math.abs(delta) >= 10000 && (current === 0 || Math.abs(deltaPercent) >= .10);
    const range = [Math.max(10000, Math.round(guarded * .9 / 5000) * 5000), Math.min(1000000, Math.round(guarded * 1.1 / 5000) * 5000)];
    return { ...base, status: material ? "CALCULATED" : "NO_CHANGE_RECOMMENDED", unconstrained, recommended: guarded, delta, deltaPercent, direction: delta > 0 ? "INCREASE" : delta < 0 ? "DECREASE" : "NO_CHANGE", acceptableRange: range, demand: { monthlyRunRate: runRate, termDays: term, termExposure, demandBasis, paymentMultiplier }, financialGrade, paymentGrade, contributions, capacityCap, bindingConstraint: demandAdjusted <= capacityCap ? "DEMAND" : "FINANCIAL_CAP", material };
  }
};

export function resolveAction(context, findings, calculation, { hasIndeterminateRule }) {
  if (context.get("restricted_status") === "Y") return { primary: "NEED_MANUAL_REVIEW", supporting: ["KEEP_EXISTING_RESTRICTION"], basedOn: ["ALREADY_RESTRICTED"] };
  const hints = new Set(findings.map(finding => finding.actionHint));
  const material = findings.filter(finding => finding.material).length;
  const indeterminate = hasIndeterminateRule || calculation.status === "INDETERMINATE";
  const primary = hints.has("NEED_TO_RESTRICT") ? "NEED_TO_RESTRICT" : indeterminate ? "NEED_MANUAL_REVIEW" : material >= 2 ? "NEED_CREDIT_MANAGER_REVIEW" : hints.has("REQUEST_UPDATED_FINANCIAL_STATEMENTS") ? "REQUEST_UPDATED_FINANCIAL_STATEMENTS" : material ? "NEED_MANUAL_REVIEW" : calculation.material ? "RECOMMEND_CREDIT_LIMIT_REASSESSMENT" : "AUTO_REVIEW_PASS";
  const actionCandidates = [...hints, ...(calculation.material ? ["RECOMMEND_CREDIT_LIMIT_REASSESSMENT"] : [])];
  return { primary, supporting: actionCandidates.filter((action, index) => action !== primary && actionCandidates.indexOf(action) === index), basedOn: findings.map(finding => finding.reasonCode) };
}

export const release = Object.freeze({ id: "credit-1.4.0", ontologyVersion: "2.0", actionPolicyVersion: "credit-actions-1.0", calculatorVersion: calculator.version, publishedAt: "2025-12-15T00:00:00Z", rules: activeRules.map(({ id, revision }) => ({ id, revision })) });
const ratioAst = (id, value) => ({ id, scope: [{ fact: "payment_terms", op: "==", value: "NET_30" }], effect: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value } });
const adpAst = (id, value) => ({ id, scope: [{ fact: "restricted_status", op: "==", value: "N" }, { fact: "ar_balance", op: ">", value: 100000, unit: "USD" }], effect: { type: "SET_MAX", fact: "adp_days", value, unit: "DAYS" } });
export const scenarios = {
  ratio5: { policy: "Customers with NET 30 payment terms cannot have more than 5% of their AR balance past due.", logicalId: "NET30_PAST_DUE_MAX", revision: 5, ast: ratioAst("NET30_PAST_DUE_MAX", .05) },
  ratio15: { policy: "Customers with NET 30 payment terms may have up to 15% of their AR balance past due.", logicalId: "NET30_PAST_DUE_MAX", revision: 5, ast: ratioAst("NET30_PAST_DUE_MAX", .15) },
  adp20: { policy: "For unrestricted customers with AR above $100,000, allow Average Days to Pay up to 20 days.", logicalId: "HIGH_BALANCE_ADP_MAX", revision: 3, ast: adpAst("HIGH_BALANCE_ADP_MAX", 20) },
  adp45: { policy: "For unrestricted customers with AR above $100,000, allow Average Days to Pay up to 45 days.", logicalId: "HIGH_BALANCE_ADP_MAX", revision: 3, ast: adpAst("HIGH_BALANCE_ADP_MAX", 45) }
};

export function compileCandidate(ast, revision) {
  const active = activeRules.find(existing => existing.id === ast.id);
  if (!active) throw new Error(`No active logical rule named ${ast.id} can be revised`);
  const net30Scope = ast.scope.length === 1 && ast.scope[0].fact === "payment_terms" && ast.scope[0].op === "==" && ast.scope[0].value === "NET_30";
  const net30Effect = ast.effect.type === "SET_MAX_RATIO" && ast.effect.numerator === "past_due_amount" && ast.effect.denominator === "ar_balance";
  if (ast.id === "NET30_PAST_DUE_MAX" && net30Scope && net30Effect) {
    return rule(ast.id, revision, { scope: ast.scope, conditions: [{ fact: "past_due_ratio", op: ">", value: ast.effect.value }], constraint: ast.effect, policy: net30Policy(ast.effect.value), reasonCode: active.reasonCode, actionHint: active.actionHint, material: active.material });
  }
  const highBalanceScope = ast.scope.length === 2 && ast.scope.some(condition => condition.fact === "restricted_status" && condition.op === "==" && condition.value === "N") && ast.scope.some(condition => condition.fact === "ar_balance" && condition.op === ">" && condition.value === 100000);
  const highBalanceEffect = ast.effect.type === "SET_MAX" && ast.effect.fact === "adp_days" && ast.effect.unit === "DAYS";
  if (ast.id === "HIGH_BALANCE_ADP_MAX" && highBalanceScope && highBalanceEffect) {
    return rule(ast.id, revision, { scope: ast.scope, conditions: [{ fact: "adp_days", op: ">", value: ast.effect.value, unit: "DAYS" }], constraint: ast.effect, policy: highBalanceAdpPolicy(ast.effect.value), reasonCode: active.reasonCode, actionHint: active.actionHint, material: active.material });
  }
  throw new Error(`Candidate ${ast.id} does not match its supported policy family`);
}

export function analyzeCandidate(ast, rules = activeRules) {
  const active = rules.find(rule => rule.id === ast.id);
  const net30Scope = ast.scope.length === 1 && ast.scope[0].fact === "payment_terms" && ast.scope[0].op === "==" && ast.scope[0].value === "NET_30";
  if (ast.id === "NET30_PAST_DUE_MAX" && net30Scope && ast.effect.type === "SET_MAX_RATIO" && ast.effect.numerator === "past_due_amount" && ast.effect.denominator === "ar_balance") {
    const value = ast.effect.value, activeValue = active?.constraint?.value ?? .08;
    return { status: value > .10 ? "CONFLICT" : value === activeValue ? "REDUNDANT" : value < activeValue ? "COMPATIBLE_REFINEMENT" : "COMPATIBLE_RELAXATION", summary: `Active ${activeValue * 100}% → candidate ${value * 100}%; global maximum 10%` };
  }
  const adpScope = ast.scope.length === 2 && ast.scope.some(condition => condition.fact === "restricted_status" && condition.op === "==" && condition.value === "N") && ast.scope.some(condition => condition.fact === "ar_balance" && condition.op === ">" && condition.value === 100000);
  if (ast.id === "HIGH_BALANCE_ADP_MAX" && adpScope && ast.effect.type === "SET_MAX" && ast.effect.fact === "adp_days") {
    const value = ast.effect.value, activeValue = active?.constraint?.value ?? 25;
    return { status: value >= 30 ? "CONFLICT" : value === activeValue ? "REDUNDANT" : value < activeValue ? "COMPATIBLE_REFINEMENT" : "COMPATIBLE_RELAXATION", summary: `Active ${activeValue} days → candidate ${value} days; global rule requires under 30` };
  }
  return { status: "INDETERMINATE", summary: "This demo reasoner cannot prove compatibility after changing the logical rule's effect." };
}

export function nextReleaseId(currentId) {
  const match = currentId.match(/^(.*-)(\d+)\.(\d+)\.(\d+)$/);
  return match ? `${match[1]}${match[2]}.${Number(match[3]) + 1}.0` : `${currentId}-next`;
}

const base = { ar_balance: 40000, past_due_amount: 1000, adp_days: 25, credit_limit: 60000, payment_terms: "NET_30", restricted_status: "N", discontinued_status: "N", annual_revenue: 2400000, ebitda: 240000, net_income: 96000, operating_cash_flow: 180000, current_ratio: 1.6, debt_to_equity_ratio: 1.2, financial_statement_status: "CURRENT", net_sales_180d: 540000, net_sales_360d: 960000 };
const fixture = (customer_number, name, changes = {}) => ({ ...base, customer_number, name, ...changes });
export const fixtures = [
  fixture(1001, "Acme Systems"), fixture(1002, "General Past Due", { past_due_amount: 5000, payment_terms: "NET_45" }), fixture(1003, "NET30 Scoped", { past_due_amount: 2800 }),
  fixture(1004, "Multiple Findings", { past_due_amount: 6000, adp_days: 44 }), fixture(1005, "Already Restricted", { restricted_status: "Y" }), fixture(1006, "ADP Boundary", { adp_days: 30 }),
  fixture(1007, "Small Missing Statements", { credit_limit: 45000, financial_statement_status: "MISSING", annual_revenue: null }), fixture(1008, "Exact 50k Missing", { credit_limit: 50000, financial_statement_status: "MISSING" }),
  fixture(1009, "Large Missing", { credit_limit: 75000, financial_statement_status: "MISSING" }), fixture(1010, "Large Stale", { credit_limit: 90000, financial_statement_status: "STALE" }), fixture(1011, "Large Current", { credit_limit: 90000 }),
  fixture(1012, "Adverse Financials", { past_due_amount: 6000, operating_cash_flow: -50000, current_ratio: .8, debt_to_equity_ratio: 4, ebitda: -10000, net_income: -20000 }), fixture(1013, "Optional Financial Inputs Unavailable", { credit_limit: 40000, financial_statement_status: "MISSING", net_sales_180d: null })
];
// Deliberately engineered fictional records for the guided product story. These
// supplement the regression corpus above and must not be used as a portfolio.
export const narrativeCustomers = [
  fixture(2001, "Northwind Components", { ar_balance: 40000, past_due_amount: 0, credit_limit: 60000, payment_terms: "NET_30", net_sales_180d: 300000, net_sales_360d: 600000 }),
  fixture(2002, "Cascade Freight", { ar_balance: 100000, past_due_amount: 18000, credit_limit: 100000, payment_terms: "NET_30", net_sales_180d: 1080000, net_sales_360d: 2160000 }),
  fixture(2003, "Meridian Industrial", { ar_balance: 40000, past_due_amount: 1000, credit_limit: 90000, payment_terms: "NET_30", net_sales_180d: 540000, net_sales_360d: 960000, financial_statement_status: "STALE" }),
  fixture(2004, "Ironclad Manufacturing", { ar_balance: 100000, past_due_amount: 20000, credit_limit: 100000, payment_terms: "NET_45", net_sales_180d: 540000, net_sales_360d: 960000, ebitda: -10000, net_income: -20000, operating_cash_flow: -50000, current_ratio: .8, debt_to_equity_ratio: 4 })
];

// Fixed fictional boundary records for Review impact only. This cohort is not
// the regression corpus, the Narrative Customer set, or a production portfolio.
const impactNet30 = (id, percent) => fixture(id, `Impact NET30 ${percent}%`, { ar_balance: 100000, past_due_amount: percent * 1000, adp_days: 25, credit_limit: 60000, payment_terms: "NET_30", net_sales_180d: 300000, net_sales_360d: 600000 });
const impactAdp = (id, days) => fixture(id, `Impact ADP ${days}`, { ar_balance: 120000, past_due_amount: 0, adp_days: days, credit_limit: 60000, payment_terms: "NET_45", net_sales_180d: 198000, net_sales_360d: 396000 });
export const policyImpactCohort = Object.freeze({
  id: "illustrative-policy-impact-1",
  records: Object.freeze([impactNet30(3001, 4), impactNet30(3002, 5), impactNet30(3003, 6), impactNet30(3004, 7), impactNet30(3005, 8), impactNet30(3006, 9), impactAdp(3007, 20), impactAdp(3008, 22), impactAdp(3009, 24), impactAdp(3010, 25), impactAdp(3011, 26), impactAdp(3012, 28)].map(Object.freeze))
});

const toolsByReason = Object.freeze({
  GLOBAL_PAST_DUE_LIMIT_EXCEEDED: ["get_payment_history", "get_open_disputes"],
  NET30_PAST_DUE_LIMIT_EXCEEDED: ["get_payment_history", "get_open_disputes"],
  CRITICAL_RESTRICTION_TRIGGER: ["get_payment_history", "get_open_disputes", "get_recent_orders"]
});
export function eligibleEvidenceTools(findings) {
  return [...new Set(findings.flatMap(finding => toolsByReason[finding.finding?.reasonCode] || []))];
}
export const demoCustomer = fixture(1001, "Acme Systems Inc.", { ar_balance: 125000, past_due_amount: 15000, credit_limit: 200000, net_sales_180d: 1200000, net_sales_360d: 2100000 });
export const creditPack = { registry, rules: activeRules, calculator, resolveAction, resolverVersion: "credit-actions-1.0", release };
