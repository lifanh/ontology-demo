import { FactRegistry } from "../../core/runtime.js";

const p = (displayName, group, type = "decimal", unit = null, extra = {}) => ({ displayName, group, type, unit, ...extra });
export const properties = {
  customer_number: p("Customer number", "Identity", "integer"), name: p("Customer name", "Identity", "string"),
  ar_balance: p("AR balance", "Credit operations", "decimal", "USD"), past_due_amount: p("Past due amount", "Credit operations", "decimal", "USD"),
  adp_days: p("Average days to pay", "Credit operations", "integer", "DAYS"), credit_limit: p("Credit limit", "Credit operations", "decimal", "USD"),
  payment_terms: p("Payment terms", "Credit operations", "enum", null, { values: ["NET_15", "NET_30", "NET_45", "NET_60"] }),
  restricted_status: p("Restricted status", "Credit operations", "enum", null, { values: ["Y", "N"] }), discontinued_status: p("Discontinued status", "Credit operations", "enum", null, { values: ["Y", "N"] }),
  annual_revenue: p("Annual revenue", "Financial statements", "decimal", "USD"), ebitda: p("EBITDA", "Financial statements", "decimal", "USD"), net_income: p("Net income", "Financial statements", "decimal", "USD"),
  operating_cash_flow: p("Operating cash flow", "Financial statements", "decimal", "USD"), current_ratio: p("Current ratio", "Financial statements"), debt_to_equity_ratio: p("Debt / equity ratio", "Financial statements"),
  financial_statement_status: p("Statement status", "Financial statements", "enum", null, { values: ["CURRENT", "STALE", "MISSING"] }),
  net_sales_180d: p("Net sales · 180 days", "Order demand", "decimal", "USD"), net_sales_360d: p("Net sales · 360 days", "Order demand", "decimal", "USD")
};
const ratio = (numerator, denominator) => ({ get }) => { const n = get(numerator), d = get(denominator); return n === null || d === null || d === 0 ? null : n / d; };
export const derived = {
  monthly_net_sales_180d: { ...p("Monthly sales · 180", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_180d"], derive: ({ get }) => get("net_sales_180d") === null ? null : get("net_sales_180d") / 6 },
  monthly_net_sales_360d: { ...p("Monthly sales · 360", "Derived facts", "decimal", "USD"), dependencies: ["net_sales_360d"], derive: ({ get }) => get("net_sales_360d") === null ? null : get("net_sales_360d") / 12 },
  monthly_net_sales_run_rate: { ...p("Monthly sales run rate", "Derived facts", "decimal", "USD"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ({ get }) => get("monthly_net_sales_180d") === null || get("monthly_net_sales_360d") === null ? null : Math.max(get("monthly_net_sales_180d"), get("monthly_net_sales_360d")) },
  net_sales_trend_ratio: { ...p("Net sales trend", "Derived facts"), dependencies: ["monthly_net_sales_180d", "monthly_net_sales_360d"], derive: ratio("monthly_net_sales_180d", "monthly_net_sales_360d") },
  past_due_ratio: { ...p("Past due ratio", "Derived facts"), dependencies: ["past_due_amount", "ar_balance"], derive: ratio("past_due_amount", "ar_balance") },
  credit_utilization: { ...p("Credit utilization", "Derived facts"), dependencies: ["ar_balance", "credit_limit"], derive: ratio("ar_balance", "credit_limit") },
  ebitda_margin: { ...p("EBITDA margin", "Derived facts"), dependencies: ["ebitda", "annual_revenue"], derive: ratio("ebitda", "annual_revenue") },
  net_income_margin: { ...p("Net income margin", "Derived facts"), dependencies: ["net_income", "annual_revenue"], derive: ratio("net_income", "annual_revenue") },
  operating_cash_flow_margin: { ...p("OCF margin", "Derived facts"), dependencies: ["operating_cash_flow", "annual_revenue"], derive: ratio("operating_cash_flow", "annual_revenue") },
  payment_term_days: { ...p("Payment term days", "Derived facts", "integer", "DAYS"), dependencies: ["payment_terms"], derive: ({ get }) => ({ NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60 })[get("payment_terms")] ?? null }
};
export const registry = new FactRegistry({ properties, derived });
const input = (id, type = registry.definition(id).type, unit = registry.definition(id).unit || null) => ({ id, type, unit });

const rule = (id, revision, inputs, options) => Object.freeze({ id, revision, inputs: inputs.map(id => input(id)), ...options });
export const activeRules = [
  rule("GLOBAL_PAST_DUE_MAX", 3, ["past_due_ratio"], { when: c => c.get("past_due_ratio") > .10, reasonCode: "GLOBAL_PAST_DUE_LIMIT_EXCEEDED", message: "Past due ratio exceeds 10%.", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("NET30_PAST_DUE_MAX", 4, ["payment_terms", "past_due_ratio"], { scope: [{ fact: "payment_terms", op: "==", value: "NET_30" }], constraint: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value: .08 }, when: c => c.get("past_due_ratio") > .08, reasonCode: "NET30_PAST_DUE_LIMIT_EXCEEDED", message: "NET 30 ratio exceeds active 8% maximum.", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("GLOBAL_ADP_UNDER_30", 2, ["adp_days"], { when: c => c.get("adp_days") >= 30, reasonCode: "ADP_30_LIMIT_EXCEEDED", message: "ADP must be under 30 days.", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("HIGH_BALANCE_ADP_MAX", 2, ["restricted_status", "ar_balance", "adp_days"], { scope: [{ fact: "restricted_status", op: "==", value: "N" }, { fact: "ar_balance", op: ">", value: 100000 }], constraint: { type: "SET_MAX", fact: "adp_days", value: 25, unit: "DAYS" }, when: c => c.get("adp_days") > 25, reasonCode: "SCOPED_ADP_LIMIT_EXCEEDED", message: "High-balance unrestricted ADP exceeds 25.", actionHint: "NEED_MANUAL_REVIEW" }),
  rule("FINANCIAL_STATEMENTS_REQUIRED", 1, ["credit_limit", "financial_statement_status"], { scope: [{ fact: "credit_limit", op: ">", value: 50000 }], when: c => c.get("financial_statement_status") !== "CURRENT", reasonCode: "UPDATED_FINANCIALS_REQUIRED", message: "Current financial statements are required above $50,000.", material: false, actionHint: "REQUEST_UPDATED_FINANCIAL_STATEMENTS" }),
  rule("CRITICAL_RESTRICTION", 1, ["restricted_status", "past_due_ratio", "operating_cash_flow", "current_ratio"], { scope: [{ fact: "restricted_status", op: "==", value: "N" }], when: c => c.get("past_due_ratio") > .10 && c.get("operating_cash_flow") < 0 && c.get("current_ratio") < 1, reasonCode: "CRITICAL_RESTRICTION_TRIGGER", message: "Past due, negative cash flow, and weak liquidity trigger restriction.", actionHint: "NEED_TO_RESTRICT" })
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
    if (["watch", "severe"].includes(paymentGrade)) guarded = Math.min(guarded, Math.floor(current / 5000) * 5000);
    const delta = guarded - current, deltaPercent = current === 0 ? null : delta / current;
    const material = Math.abs(delta) >= 10000 && (current === 0 || Math.abs(deltaPercent) >= .10);
    const range = [Math.max(10000, Math.round(guarded * .9 / 5000) * 5000), Math.min(1000000, Math.round(guarded * 1.1 / 5000) * 5000)];
    return { ...base, status: material ? "CALCULATED" : "NO_CHANGE_RECOMMENDED", unconstrained, recommended: guarded, delta, deltaPercent, direction: delta > 0 ? "INCREASE" : delta < 0 ? "DECREASE" : "NO_CHANGE", acceptableRange: range, demand: { monthlyRunRate: runRate, termDays: term, termExposure, demandBasis, paymentMultiplier }, financialGrade, paymentGrade, contributions, capacityCap, bindingConstraint: demandAdjusted <= capacityCap ? "DEMAND" : "FINANCIAL_CAP", material };
  }
};

export function resolveAction(context, findings, calculation) {
  if (context.get("restricted_status") === "Y") return { primary: "NEED_MANUAL_REVIEW", supporting: ["KEEP_EXISTING_RESTRICTION"], basedOn: ["ALREADY_RESTRICTED"], resolverVersion: "credit-actions-1.0" };
  const hits = findings.filter(x => x.status === "FINDING");
  const hints = new Set(hits.map(x => x.actionHint));
  const material = hits.filter(x => x.material).length;
  const indeterminate = findings.some(finding => finding.status === "INDETERMINATE") || calculation.status === "INDETERMINATE";
  const primary = hints.has("NEED_TO_RESTRICT") ? "NEED_TO_RESTRICT" : indeterminate ? "NEED_MANUAL_REVIEW" : material >= 2 ? "NEED_CREDIT_MANAGER_REVIEW" : hints.has("REQUEST_UPDATED_FINANCIAL_STATEMENTS") ? "REQUEST_UPDATED_FINANCIAL_STATEMENTS" : material ? "NEED_MANUAL_REVIEW" : calculation.material ? "RECOMMEND_CREDIT_LIMIT_REASSESSMENT" : "AUTO_REVIEW_PASS";
  const actionCandidates = [...hints, ...(calculation.material ? ["RECOMMEND_CREDIT_LIMIT_REASSESSMENT"] : [])];
  return { primary, supporting: actionCandidates.filter((action, index) => action !== primary && actionCandidates.indexOf(action) === index), basedOn: hits.map(x => x.reasonCode), resolverVersion: "credit-actions-1.0" };
}

export const release = Object.freeze({ id: "credit-1.4.0", ontologyVersion: "2.0", actionPolicyVersion: "credit-actions-1.0", calculatorVersion: calculator.version, publishedAt: "2025-12-15T00:00:00Z", rules: activeRules.map(({ id, revision }) => ({ id, revision })) });
const ratioAst = (id, value) => ({ id, scope: [{ fact: "payment_terms", op: "==", value: "NET_30" }], effect: { type: "SET_MAX_RATIO", numerator: "past_due_amount", denominator: "ar_balance", value } });
const adpAst = (id, value) => ({ id, scope: [{ fact: "restricted_status", op: "==", value: "N" }, { fact: "ar_balance", op: ">", value: 100000, unit: "USD" }], effect: { type: "SET_MAX", fact: "adp_days", value, unit: "DAYS" } });
export const scenarios = {
  ratio5: { policy: "Customers with NET 30 payment terms cannot have more than 5% of their AR balance past due.", logicalId: "NET30_PAST_DUE_MAX", revision: 5, ast: ratioAst("NET30_PAST_DUE_MAX", .05) },
  ratio15: { policy: "Customers with NET 30 payment terms may have up to 15% of their AR balance past due.", logicalId: "NET30_PAST_DUE_MAX", revision: 5, ast: ratioAst("NET30_PAST_DUE_MAX", .15) },
  adp45: { policy: "For unrestricted customers with AR above $100,000, allow Average Days to Pay up to 45 days.", logicalId: "HIGH_BALANCE_ADP_MAX", revision: 3, ast: adpAst("HIGH_BALANCE_ADP_MAX", 45) }
};

export function compileCandidate(ast, revision) {
  const active = activeRules.find(existing => existing.id === ast.id);
  if (!active) throw new Error(`No active logical rule named ${ast.id} can be revised`);
  const ids = [...ast.scope.map(condition => condition.fact)];
  let when, comparison;
  if (ast.effect.type === "SET_MAX_RATIO") {
    ids.push(ast.effect.numerator, ast.effect.denominator);
    when = context => {
      const numerator = context.get(ast.effect.numerator), denominator = context.get(ast.effect.denominator);
      return denominator === 0 ? null : numerator / denominator > ast.effect.value;
    };
    comparison = `${ast.effect.numerator} / ${ast.effect.denominator} exceeds ${ast.effect.value}`;
  } else {
    ids.push(ast.effect.fact);
    when = context => ast.effect.type === "SET_MAX" ? context.get(ast.effect.fact) > ast.effect.value : context.get(ast.effect.fact) < ast.effect.value;
    comparison = `${ast.effect.fact} violates ${ast.effect.type === "SET_MAX" ? "maximum" : "minimum"} ${ast.effect.value}`;
  }
  return rule(ast.id, revision, [...new Set(ids)], { scope: ast.scope, constraint: ast.effect, when, reasonCode: active.reasonCode, message: comparison, actionHint: active.actionHint, material: active.material });
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
export const demoCustomer = fixture(1001, "Acme Systems Inc.", { ar_balance: 125000, past_due_amount: 15000, credit_limit: 200000, net_sales_180d: 1200000, net_sales_360d: 2100000 });
export const creditPack = { registry, rules: activeRules, calculator, resolveAction, release };
