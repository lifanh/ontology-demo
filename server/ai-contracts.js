const text = (minLength, maxLength) => ({ type: "string", minLength, maxLength, pattern: "^[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]*$" });
const reference = { type: "string", minLength: 3, maxLength: 180, pattern: "^[A-Za-z0-9_:/@.\\-]+$" };
const closed = properties => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const explanation = closed({
  summary: text(1, 2_000),
  points: { type: "array", maxItems: 6, items: closed({ text: text(1, 600), references: { type: "array", minItems: 1, maxItems: 8, uniqueItems: true, items: reference } }) }
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
      customerNumber: { type: "integer", minimum: 1 },
      releaseId: reference,
      deterministicAction: { type: "string", minLength: 3, maxLength: 80, pattern: "^[A-Z0-9_]+$" },
      evaluationRefs: { type: "array", minItems: 1, maxItems: 20, uniqueItems: true, items: reference },
      eligibleTools: { type: "array", maxItems: 3, uniqueItems: true, items: { enum: ["get_payment_history", "get_open_disputes", "get_recent_orders"] } }
    }),
    result: explanation
  },
  explain_policy_analysis: {
    request: closed({
      schemaVersion: { const: "1" },
      activeReleaseId: reference,
      candidateRevision: { type: "integer", minimum: 1, maximum: 10_000 },
      analysisStatus: { enum: ["CONFLICT", "REDUNDANT", "COMPATIBLE_REFINEMENT", "COMPATIBLE_RELAXATION", "INDETERMINATE"] },
      analysisSummary: text(1, 1_000),
      impactHeadline: text(1, 500),
      impactComplete: { type: "boolean" },
      evidenceRefs: { type: "array", minItems: 1, maxItems: 30, uniqueItems: true, items: reference }
    }),
    result: explanation
  }
};

export const aiContracts = Object.freeze(contracts);
export const aiOperationNames = Object.freeze(Object.keys(contracts));
export const aiResponseSchema = (operation, result) => closed({ schemaVersion: { const: "1" }, operation: { const: operation }, result });
