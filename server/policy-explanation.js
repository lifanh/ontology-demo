import { GatewayFailure } from "./ai-gateway.js";
import { aiContracts } from "./ai-contracts.js";

const authorityClaim = /\b(?:qualif(?:y|ied|ies)|validat(?:e|ed|es|ion)|approv(?:e|ed|es|al)|activat(?:e|ed|es|ion)|publish(?:ed|es)?)\b/i;

export async function explainPolicyAnalysisExecutor({ request, providerCall }) {
  const output = await providerCall({
    schemaName: "explain_policy_analysis_v1",
    responseSchema: aiContracts.explain_policy_analysis.result,
    messages: [
      { role: "system", content: "Explain only the supplied deterministic policy compatibility and Review impact summaries. Every point must cite supplied evidence references. Do not declare or imply qualification, validation, approval, activation, or a policy decision. Return only the required JSON." },
      { role: "user", content: JSON.stringify(request) }
    ]
  });
  if (authorityClaim.test(output?.summary || "") || (output?.points || []).some(point => authorityClaim.test(point.text || ""))) throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false);
  const known = new Set(request.evidenceRefs);
  const cited = new Set();
  for (const point of output?.points || []) {
    for (const reference of point.references || []) {
      if (!known.has(reference) || cited.has(reference)) throw new GatewayFailure("MODEL_OUTPUT_INVALID", 502, false);
      cited.add(reference);
    }
  }
  return output;
}
