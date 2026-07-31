import Ajv from "ajv";
import { loadConfig } from "../server/config.js";
import { createCopilotProvider } from "../server/copilot-provider.js";
import { aiContracts } from "../server/ai-contracts.js";
import { draftRuleExecutor } from "../server/draft-rule.js";
import { explainReviewExecutor } from "../server/review-evidence.js";
import { explainPolicyAnalysisExecutor } from "../server/policy-explanation.js";
import { DEFAULT_AI_LIMITS } from "../server/ai-gateway.js";

if (process.env.LIVE_AI_SMOKE !== "true") {
  console.error("Live AI smoke is disabled. Set LIVE_AI_SMOKE=true explicitly to run it.");
  process.exit(2);
}

const config = loadConfig(process.env);
if (!config.aiEnabled) {
  console.error("Live AI smoke requires AI_ENABLED=true and server-side provider configuration.");
  process.exit(2);
}

const provider = createCopilotProvider(config);
const ajv = new Ajv({ strict: true });
const operations = [
  ["draft_rule", draftRuleExecutor, { schemaVersion: "1", policyText: "For NET 30 customers, set maximum past due to 5 percent of AR balance.", activeReleaseId: "credit-1.4.0" }],
  ["explain_review", explainReviewExecutor, {
    schemaVersion: "1",
    customer: { number: 2002, name: "Cascade Freight" },
    release: { id: "credit-1.4.0" },
    action: "NEED_MANUAL_REVIEW",
    traces: [{ evaluationRef: "credit-1.4.0/NET30_PAST_DUE_MAX@4", outcome: "FINDING", reasonCode: "NET30_PAST_DUE_LIMIT_EXCEEDED", policyStatement: "NET 30 customers may not exceed 8% past due.", factRefs: ["fact:2002/past_due_amount", "fact:2002/ar_balance"] }],
    facts: [{ ref: "fact:2002/past_due_amount", factId: "past_due_amount", value: "$18,000" }, { ref: "fact:2002/ar_balance", factId: "ar_balance", value: "$100,000" }]
  }],
  ["explain_policy_analysis", explainPolicyAnalysisExecutor, {
    schemaVersion: "1",
    activeReleaseId: "credit-1.4.0",
    candidateRevision: 5,
    analysisStatus: "COMPATIBLE_REFINEMENT",
    analysisSummary: "The candidate 5% maximum is stricter than the active NET 30 maximum.",
    impactHeadline: "3 records newly require review.",
    impactComplete: true,
    evidenceRefs: ["analysis:credit-1.4.0/NET30_PAST_DUE_MAX@5", "impact:illustrative-policy-impact-1/credit-1.4.0/NET30_PAST_DUE_MAX@5"]
  }]
];

for (const [name, executor, request] of operations) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  let calls = 0;
  try {
    const result = await executor({
      operation: name,
      request,
      signal: controller.signal,
      providerCall: input => {
        calls += 1;
        if (calls > 3) throw new Error("provider call limit");
        const attempt = new AbortController();
        const cancel = () => attempt.abort();
        controller.signal.addEventListener("abort", cancel, { once: true });
        const attemptTimer = setTimeout(cancel, DEFAULT_AI_LIMITS.providerTimeoutMs);
        return provider.complete({ operation: name, input, signal: attempt.signal }).finally(() => {
          clearTimeout(attemptTimer);
          controller.signal.removeEventListener("abort", cancel);
        });
      }
    });
    if (!ajv.compile(aiContracts[name].result)(result)) throw new Error("schema validation failed");
    console.log(`${name}: validated`);
  } catch {
    console.error(`${name}: live smoke failed (content and provider details suppressed)`);
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
  }
}

await provider.close();
