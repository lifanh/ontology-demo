const text = (minLength, maxLength) => ({ type: "string", minLength, maxLength, pattern: "^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]*$" });
const reference = { type: "string", minLength: 3, maxLength: 180, pattern: "^[A-Za-z0-9_:/@.\\-]+$" };
const closed = properties => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const explanation = closed({
  summary: text(1, 2_000),
  points: { type: "array", maxItems: 6, items: closed({ text: text(1, 600), references: { type: "array", minItems: 1, maxItems: 8, uniqueItems: true, items: reference } }) }
});
const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
const nullable = schema => ({ anyOf: [{ type: "null" }, schema] });
const factRef = closed({ ref: reference, factId: reference, value: text(1, 200) });
const reviewTrace = closed({
  evaluationRef: reference,
  outcome: { enum: ["PASS", "FINDING", "NOT_APPLICABLE", "INDETERMINATE"] },
  reasonCode: { anyOf: [{ type: "null" }, { type: "string", minLength: 3, maxLength: 100, pattern: "^[A-Z0-9_]+$" }] },
  policyStatement: text(1, 500),
  factRefs: { type: "array", maxItems: 30, uniqueItems: true, items: reference }
});
const amount = { type: "number", minimum: 0 };
const days = { type: "integer", minimum: 0 };
const paymentRecord = closed({ invoiceRef: reference, invoiceDate: date, dueDate: date, originalAmount: amount, openAmount: amount, currency: { const: "USD" }, status: { enum: ["OPEN", "PAID"] }, paidDate: nullable(date), daysToPay: nullable(days), daysPastDue: days });
const disputeRecord = closed({ disputeRef: reference, invoiceRef: reference, openedDate: date, reasonCode: { enum: ["PRICING_DIFFERENCE", "FREIGHT_CHARGE", "SHORT_SHIPMENT"] }, reasonLabel: text(1, 100), disputedAmount: amount, currency: { const: "USD" }, status: { const: "OPEN" }, ageDays: days });
const orderRecord = closed({ orderRef: reference, orderDate: date, amount, currency: { const: "USD" }, status: { enum: ["PENDING_FULFILLMENT", "SHIPPED", "INVOICED"] } });
const evidenceEnvelope = (toolName, record) => closed({ schemaVersion: { const: "1" }, evidenceRef: reference, toolName: { const: toolName }, fixtureVersion: { const: "1" }, customerNumber: { type: "integer", minimum: 1 }, asOfDate: { const: "2026-06-30" }, records: { type: "array", maxItems: 10, items: record } });
const evidenceResult = { oneOf: [evidenceEnvelope("get_payment_history", paymentRecord), evidenceEnvelope("get_open_disputes", disputeRecord), evidenceEnvelope("get_recent_orders", orderRecord)] };
const reviewResult = closed({
  rationale: closed({ status: { const: "EXPLAINED" }, summary: text(1, 2_000), points: explanation.properties.points }),
  evidenceResults: { type: "array", maxItems: 3, items: evidenceResult },
  toolTrace: closed({ eligible: { type: "array", maxItems: 3, uniqueItems: true, items: { enum: ["get_payment_history", "get_open_disputes", "get_recent_orders"] } }, called: { type: "array", maxItems: 3, uniqueItems: true, items: { enum: ["get_payment_history", "get_open_disputes", "get_recent_orders"] } } })
});

const draftResult = {
  oneOf: [
    { ...closed({ outcome: { const: "CANDIDATE" }, family: { enum: ["NET30_PAST_DUE_MAX", "HIGH_BALANCE_ADP_MAX"] }, summary: text(1, 800), dsl: text(1, 2_000) }) },
    { ...closed({ outcome: { const: "NEEDS_CLARIFICATION" }, question: text(1, 500), missingFields: { type: "array", minItems: 1, maxItems: 3, uniqueItems: true, items: { enum: ["policy_family", "threshold", "unit", "scope"] } } }) },
    { ...closed({ outcome: { const: "UNSUPPORTED_INTENT" }, summary: text(1, 800) }) }
  ]
};

const contracts = {
  draft_rule: {
    request: closed({ schemaVersion: { const: "1" }, policyText: text(1, 2_000), activeReleaseId: reference }),
    result: draftResult
  },
  explain_review: {
    request: closed({
      schemaVersion: { const: "1" },
      customer: closed({ number: { type: "integer", minimum: 1 }, name: text(1, 100) }),
      release: closed({ id: reference }),
      action: { type: "string", minLength: 3, maxLength: 80, pattern: "^[A-Z0-9_]+$" },
      traces: { type: "array", minItems: 1, maxItems: 20, items: reviewTrace },
      facts: { type: "array", minItems: 1, maxItems: 60, items: factRef }
    }),
    result: reviewResult
  },
  explain_policy_analysis: {
    request: closed({
      schemaVersion: { const: "1" },
      activeReleaseId: reference,
      candidateRevision: { type: "integer", minimum: 1, maximum: 10_000 },
      analysisStatus: { enum: ["REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION"] },
      analysisSummary: text(1, 1_000),
      impactHeadline: text(1, 500),
      impactComplete: { const: true },
      evidenceRefs: { type: "array", minItems: 1, maxItems: 30, uniqueItems: true, items: reference }
    }),
    result: explanation
  }
};

export const aiContracts = Object.freeze(contracts);
export const aiOperationNames = Object.freeze(Object.keys(contracts));
export const aiResponseSchema = (operation, result) => closed({ schemaVersion: { const: "1" }, operation: { const: operation }, result });
