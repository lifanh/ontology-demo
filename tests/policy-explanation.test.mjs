import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { explainPolicyAnalysisExecutor } from "../server/policy-explanation.js";

const request = {
  schemaVersion: "1",
  activeReleaseId: "credit-1.4.0",
  candidateRevision: 5,
  analysisStatus: "COMPATIBLE_REFINEMENT",
  analysisSummary: "The candidate is stricter than the active rule.",
  impactHeadline: "3 records newly require review.",
  impactComplete: true,
  evidenceRefs: ["analysis:credit-1.4.0/NET30_PAST_DUE_MAX@5", "impact:illustrative-policy-impact-1/credit-1.4.0/NET30_PAST_DUE_MAX@5"]
};

test("policy explanation is grounded in bounded deterministic summaries", async () => {
  let providerInput;
  const result = await explainPolicyAnalysisExecutor({ request, providerCall: async input => {
    providerInput = input;
    return { summary: "The stricter threshold increases review workload.", points: [{ text: "Three cohort records newly require review.", references: [request.evidenceRefs[1]] }] };
  } });
  assert.equal(result.points[0].references[0], request.evidenceRefs[1]);
  assert.match(providerInput.messages[0].content, /Do not declare or imply qualification, validation, approval, activation/);
  assert.doesNotMatch(providerInput.messages[1].content, /Impact NET30|customer_number|3001/);
});

test("unknown or duplicate references reject the complete explanation", async () => {
  for (const references of [["unknown:reference"], [request.evidenceRefs[0], request.evidenceRefs[0]]]) {
    await assert.rejects(explainPolicyAnalysisExecutor({ request, providerCall: async () => ({ summary: "Invalid.", points: [{ text: "Invalid.", references }] }) }), error => error.code === "MODEL_OUTPUT_INVALID");
  }
});

test("the same evidence may ground more than one explanation point", async () => {
  const reference = request.evidenceRefs[0];
  const result = await explainPolicyAnalysisExecutor({ request, providerCall: async () => ({
    summary: "Grounded summary.",
    points: [
      { text: "The candidate is stricter.", references: [reference] },
      { text: "The same comparison also explains the workload change.", references: [reference] }
    ]
  }) });
  assert.deepEqual(result.points.map(point => point.references), [[reference], [reference]]);
});

test("authority claims reject the complete explanation", async () => {
  for (const output of [
    { summary: "The candidate is approved.", points: [{ text: "Evidence is summarized.", references: [request.evidenceRefs[0]] }] },
    { summary: "Evidence is summarized.", points: [{ text: "Activate this policy.", references: [request.evidenceRefs[0]] }] }
  ]) await assert.rejects(explainPolicyAnalysisExecutor({ request, providerCall: async () => output }), error => error.code === "MODEL_OUTPUT_INVALID");
});

test("narrow negated authority disclaimers are allowed without masking affirmative claims", async () => {
  const allowed = await explainPolicyAnalysisExecutor({ request, providerCall: async () => ({
    summary: "This explanation does not approve or activate the candidate.",
    points: [{ text: "The candidate is not validated or published by this explanation.", references: [request.evidenceRefs[0]] }]
  }) });
  assert.match(allowed.summary, /does not approve/);
  await assert.rejects(explainPolicyAnalysisExecutor({ request, providerCall: async () => ({
    summary: "This explanation does not approve the candidate, but it activates the policy.",
    points: [{ text: "Evidence is summarized.", references: [request.evidenceRefs[0]] }]
  }) }), error => error.code === "MODEL_OUTPUT_INVALID");
  await assert.rejects(explainPolicyAnalysisExecutor({ request, providerCall: async () => ({
    summary: "This explanation does not approve and activates the candidate.",
    points: [{ text: "Evidence is summarized.", references: [request.evidenceRefs[0]] }]
  }) }), error => error.code === "MODEL_OUTPUT_INVALID");
});
