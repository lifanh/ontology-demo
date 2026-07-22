const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DecisionEngineError,
  evaluateDecisionTable,
  validateDecisionTable
} = require("./decision-engine.js");

function condition(fact, operator, value, display) {
  const result = { fact, operator };
  if (value !== undefined) result.value = value;
  if (display) result.display = display;
  return result;
}

function findings(criterion, fact, result, group, decisionEffect, required) {
  return [{ criterion, fact, result, group, decisionEffect, required }];
}

function createTable() {
  return {
    id: "CUSTOMER-ELIGIBILITY-001",
    version: 1,
    hitPolicy: "FIRST",
    facts: {
      evidence_state: { type: "enum", values: ["complete", "conflicting", "missing"], required: true },
      adp_days: { type: "integer", unit: "days", nullable: true },
      exception_status: { type: "enum", values: ["valid", "invalid", "absent"], required: true },
      risk_level: { type: "enum", values: ["low", "medium", "high"], required: true }
    },
    dispositions: {
      approve: { label: "Approve", tone: "approve" },
      approve_with_exception: { label: "Approve with exception", tone: "exception" },
      request_information: { label: "Request information", tone: "information" },
      manual_review: { label: "Manual review", tone: "review" },
      reject: { label: "Reject", tone: "reject" }
    },
    assumptions: ["ADP is measured in calendar days and the 30-day maximum is inclusive."],
    rows: [
      {
        id: "ROW-1", priority: 1, disposition: "manual_review",
        conditions: [condition("evidence_state", "equals", "conflicting"), condition("adp_days", "any"), condition("exception_status", "any"), condition("risk_level", "any")],
        summary: "Evidence conflicts require manual review.", nextAction: "Reconcile the source documents.",
        findings: findings("Evidence consistency", "evidence_state", "indeterminate", "unresolved", "requires_manual_review", "Consistent evidence")
      },
      {
        id: "ROW-2", priority: 2, disposition: "request_information",
        conditions: [condition("evidence_state", "equals", "missing"), condition("adp_days", "any"), condition("exception_status", "any"), condition("risk_level", "any")],
        summary: "Required evidence is missing.", nextAction: "Request the missing ADP evidence.",
        findings: findings("Evidence completeness", "evidence_state", "indeterminate", "unresolved", "requires_information", "Complete evidence")
      },
      {
        id: "ROW-3", priority: 3, disposition: "reject",
        conditions: [condition("evidence_state", "equals", "complete"), condition("adp_days", "gt", 30), condition("exception_status", "in", ["absent", "invalid"]), condition("risk_level", "any")],
        summary: "ADP is {{adp_days}} days and no valid exception applies.", nextAction: "Reject the review.",
        findings: findings("Standard ADP threshold", "adp_days", "violated", "blocking", "blocks_approval", "≤ 30 days")
      },
      {
        id: "ROW-4", priority: 4, disposition: "manual_review",
        conditions: [condition("evidence_state", "equals", "complete"), condition("adp_days", "any"), condition("exception_status", "any"), condition("risk_level", "equals", "high")],
        summary: "High customer risk requires manual review.", nextAction: "Escalate to a credit reviewer.",
        findings: findings("Customer risk", "risk_level", "violated", "blocking", "requires_manual_review", "Low or medium")
      },
      {
        id: "ROW-5", priority: 5, disposition: "approve_with_exception",
        conditions: [condition("evidence_state", "equals", "complete"), condition("adp_days", "gt", 30), condition("exception_status", "equals", "valid"), condition("risk_level", "in", ["low", "medium"])],
        summary: "ADP is {{adp_days}} days, {{adp_days_overage}} days above the standard maximum, with a valid exception.", nextAction: "Record the exception if approved outside this demo.",
        findings: findings("Standard ADP threshold", "adp_days", "condition_not_met", "compensated", "compensated_by_exception", "≤ 30 days")
      },
      {
        id: "ROW-6", priority: 6, disposition: "approve",
        conditions: [condition("evidence_state", "equals", "complete"), condition("adp_days", "lte", 30), condition("exception_status", "any", undefined, "Not required"), condition("risk_level", "in", ["low", "medium"])],
        summary: "ADP is {{adp_days}} days and satisfies the standard maximum.", nextAction: "Approve outside this demo after normal review.",
        findings: findings("Standard ADP threshold", "adp_days", "satisfied", "advisory", "permits_approval", "≤ 30 days")
      }
    ]
  };
}

function evaluate(inputs) {
  return evaluateDecisionTable(createTable(), inputs, { customer: { id: "DEMO", name: "Demo Customer" } });
}

test("the canonical table validates and reports intentional FIRST overlap", () => {
  const report = validateDecisionTable(createTable());
  assert.equal(report.valid, true);
  assert.ok(report.warnings.some(warning => warning.code === "PRIORITY_OVERLAP"));
});

test("exactly 30 days is approved", () => {
  const result = evaluate({ evidence_state: "complete", adp_days: 30, exception_status: "absent", risk_level: "medium" });
  assert.equal(result.matchedRow.id, "ROW-6");
  assert.equal(result.disposition, "approve");
});

test("31 days without an exception is rejected", () => {
  const result = evaluate({ evidence_state: "complete", adp_days: 31, exception_status: "absent", risk_level: "medium" });
  assert.equal(result.matchedRow.id, "ROW-3");
  assert.equal(result.disposition, "reject");
});

test("more than 30 days with a valid exception is compensated", () => {
  const result = evaluate({ evidence_state: "complete", adp_days: 42, exception_status: "valid", risk_level: "medium" });
  assert.equal(result.matchedRow.id, "ROW-5");
  assert.equal(result.disposition, "approve_with_exception");
  assert.equal(result.findings[0].result, "condition_not_met");
  assert.equal(result.findings[0].decisionEffect, "compensated_by_exception");
  assert.match(result.summary, /12 days above/);
});

test("high risk escalates before standard approval", () => {
  const result = evaluate({ evidence_state: "complete", adp_days: 24, exception_status: "absent", risk_level: "high" });
  assert.equal(result.matchedRow.id, "ROW-4");
  assert.equal(result.disposition, "manual_review");
});

test("missing evidence requests information", () => {
  const result = evaluate({ evidence_state: "missing", adp_days: null, exception_status: "absent", risk_level: "medium" });
  assert.equal(result.matchedRow.id, "ROW-2");
  assert.equal(result.disposition, "request_information");
});

test("conflicting evidence wins at the highest priority", () => {
  const result = evaluate({ evidence_state: "conflicting", adp_days: null, exception_status: "valid", risk_level: "high" });
  assert.equal(result.matchedRow.id, "ROW-1");
  assert.equal(result.trace[0].status, "selected");
  assert.ok(result.trace.slice(1).every(row => row.status === "not_evaluated"));
});

test("dry runs always report no side effects", () => {
  const result = evaluate({ evidence_state: "complete", adp_days: 24, exception_status: "absent", risk_level: "low" });
  assert.deepEqual(result.sideEffects, {
    performed: false,
    message: "Dry run only. No customer review was saved or submitted."
  });
});

test("summary placeholders cannot resolve inherited object properties", () => {
  const table = createTable();
  table.rows[5].summary = "Unknown placeholder: {{constructor}}";
  const result = evaluateDecisionTable(table, { evidence_state: "complete", adp_days: 24, exception_status: "absent", risk_level: "low" });
  assert.equal(result.summary, "Unknown placeholder: unavailable");
});

test("malformed tables fail validation", () => {
  const table = createTable();
  table.rows[0].conditions[0].operator = "execute";
  const report = validateDecisionTable(table);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === "UNSUPPORTED_OPERATOR"));
});

test("missing review assumptions fail validation", () => {
  const table = createTable();
  table.assumptions = [];
  const report = validateDecisionTable(table);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === "MISSING_ASSUMPTIONS"));
});

test("an authoritative contract rejects invented enum values", () => {
  const contractTable = createTable();
  const table = createTable();
  table.facts.risk_level.values.push("critical");
  const report = validateDecisionTable(table, {
    facts: contractTable.facts,
    dispositions: contractTable.dispositions
  });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === "FACT_CONTRACT_MISMATCH"));
});

test("an authoritative contract rejects misleading disposition labels", () => {
  const contractTable = createTable();
  const table = createTable();
  table.dispositions.reject.label = "Approve";
  const report = validateDecisionTable(table, {
    facts: contractTable.facts,
    dispositions: contractTable.dispositions
  });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === "DISPOSITION_CONTRACT_MISMATCH"));
});

test("duplicate rows are rejected as unreachable", () => {
  const table = createTable();
  table.rows[1].conditions = structuredClone(table.rows[0].conditions);
  const report = validateDecisionTable(table);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === "UNREACHABLE_ROW"));
});

test("an unexpected no-match is an explicit execution error", () => {
  assert.throws(
    () => evaluate({ evidence_state: "complete", adp_days: null, exception_status: "absent", risk_level: "medium" }),
    error => error instanceof DecisionEngineError && error.code === "NO_MATCH"
  );
});

test("invalid enum inputs never silently pass", () => {
  assert.throws(
    () => evaluate({ evidence_state: "complete", adp_days: 24, exception_status: "unknown", risk_level: "medium" }),
    error => error instanceof DecisionEngineError && error.code === "INVALID_INPUTS"
  );
});
